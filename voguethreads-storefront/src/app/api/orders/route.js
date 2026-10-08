import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import Inventory from "@/models/Inventory";
import InventoryTransaction from "@/models/InventoryTransaction";
import Coupon from "@/models/Coupon";
import { sendOrderConfirmationEmail } from "@/lib/mailer";
import { getSession } from "@/lib/auth";

/**
 * Generate sequential order number compatible with fashion-commerce-admin
 * Format: VT-ORD-YYYY-XXXX (e.g. VT-ORD-2026-1001)
 */
async function generateNextOrderNumber() {
  const year = new Date().getFullYear();
  const prefix = `VT-ORD-${year}-`;

  try {
    const lastOrder = await Order.findOne({
      orderNumber: new RegExp(`^${prefix}`),
    })
      .sort({ orderNumber: -1 })
      .select("orderNumber")
      .lean();

    let nextSequence = 1001;
    if (lastOrder && lastOrder.orderNumber) {
      const parts = lastOrder.orderNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSequence = lastSeq + 1;
      }
    }
    return `${prefix}${nextSequence}`;
  } catch (err) {
    console.warn("Error calculating sequential order number, using fallback:", err);
    return `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

// GET: Fetch orders securely scoped to the authenticated customer
export async function GET(req) {
  try {
    const session = await getSession(req);
    // Primary authorization identity: session.userId
    if (!session?.userId && !session?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to view your orders." },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Query primarily by session.userId (persistent user identifier)
    // Fallback to customerDetails.email for unlinked legacy orders
    const orConditions = [];
    if (session.userId) {
      orConditions.push({ customerId: session.userId });
    }
    if (session.email) {
      orConditions.push({ "customerDetails.email": session.email.toLowerCase().trim() });
    }

    const query = orConditions.length > 1 ? { $or: orConditions } : (orConditions[0] || {});

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST: Place a new order into MongoDB
export async function POST(req) {
  try {
    const session = await getSession(req);
    // Enforce authentication: server-side vt_session is the sole source of truth
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required. Please sign in to place an order." },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Derive customer identity strictly from session.userId & Customer document
    const customerDoc = await Customer.findById(session.userId).lean();
    if (!customerDoc) {
      return NextResponse.json(
        { success: false, error: "Customer account not found. Please sign in again." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      customerDetails,
      shippingAddress,
      billingAddress,
      items,
      pricing,
      payment,
      fulfillment,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order must contain at least one item" },
        { status: 400 }
      );
    }

    // Authoritative customer identity from server session
    const assignedCustomerId = customerDoc._id;
    const cleanEmail = (session.email || customerDoc.email).toLowerCase().trim();
    const cleanName = customerDoc.name || customerDetails?.name?.trim() || "Customer";
    const cleanPhone = customerDetails?.phone?.trim() || customerDoc.phone || "";

    const orderNumber = await generateNextOrderNumber();

    // 1. Authoritative price and product resolution from MongoDB
    const productIds = items.map((i) => i.productId).filter(Boolean);
    const productDocs = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(productDocs.map((p) => [String(p._id), p]));

    const formattedItems = [];
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const product = item.productId ? productMap.get(String(item.productId)) : null;
      let unitPrice = Number(item.price || item.unitPrice || 0);

      // Verify authentic price from MongoDB Product variant
      if (product && Array.isArray(product.variants)) {
        const variant = product.variants.find(
          (v) => v.sku === item.sku || v.variantId === item.variantId
        );
        if (variant && typeof variant.price === "number") {
          unitPrice = variant.price;
        }
      }

      const quantity = Math.max(1, Number(item.quantity || 1));
      const subtotal = unitPrice * quantity;
      const gstRate = Number(item.gstRate || 5);
      const taxTotal = Number(((subtotal * gstRate) / 100).toFixed(2));
      const total = Number((subtotal + taxTotal).toFixed(2));

      formattedItems.push({
        productId: item.productId || null,
        variantId: item.variantId || `${item.id || idx}`,
        sku: (item.sku || `VT-${item.id || idx}`).toString().toUpperCase().trim(),
        title: item.title || product?.title || item.name || "Apparel Item",
        color: item.color || "Standard",
        colorHex: item.colorHex || "",
        size: item.size || "M",
        image: item.image || (Array.isArray(item.images) ? item.images[0]?.url || item.images[0] : "") || "",
        unitPrice,
        quantity,
        subtotal,
        hsnCode: item.hsnCode || "6109",
        gstRate,
        taxAmount: {
          cgst: Number((taxTotal / 2).toFixed(2)),
          sgst: Number((taxTotal / 2).toFixed(2)),
          igst: 0,
          total: taxTotal,
        },
        total,
      });
    }

    const calculatedSubtotal = formattedItems.reduce((sum, it) => sum + it.subtotal, 0);

    // 2. Authoritative server-side Coupon validation & recalculation
    let discountAmount = 0;
    let appliedCouponDoc = null;
    const requestedCoupon = pricing?.couponCode ? pricing.couponCode.trim().toUpperCase() : "";

    if (requestedCoupon) {
      const coupon = await Coupon.findOne({
        $or: [{ normalizedCode: requestedCoupon }, { code: requestedCoupon }],
        status: "ACTIVE",
      });

      if (coupon) {
        const now = new Date();
        const isStarted = !coupon.startAt || now >= new Date(coupon.startAt);
        const isNotExpired = !coupon.endAt || now <= new Date(coupon.endAt);
        const meetsMinOrder = !coupon.minimumOrderValue || calculatedSubtotal >= coupon.minimumOrderValue;
        const withinUsageLimit = coupon.usageLimit === null || coupon.usageLimit === undefined || coupon.usageCount < coupon.usageLimit;

        if (isStarted && isNotExpired && meetsMinOrder && withinUsageLimit) {
          if (coupon.discountType === "PERCENTAGE") {
            discountAmount = (calculatedSubtotal * coupon.discountValue) / 100;
            if (coupon.maximumDiscountAmount) {
              discountAmount = Math.min(discountAmount, coupon.maximumDiscountAmount);
            }
          } else {
            discountAmount = Math.min(coupon.discountValue, calculatedSubtotal);
          }
          discountAmount = Math.max(0, Number(discountAmount.toFixed(2)));
          appliedCouponDoc = coupon;
        }
      }
    }

    const shippingFee = calculatedSubtotal >= 999 || calculatedSubtotal === 0 ? 0 : 49;
    const codFee = payment?.method === "COD" ? 49 : 0;
    const totalTax = formattedItems.reduce((sum, it) => sum + (it.taxAmount?.total || 0), 0);
    const grandTotal = Math.max(0, Number((calculatedSubtotal - discountAmount + shippingFee + codFee).toFixed(2)));

    // 3. PHASE 5: Atomic inventory reservation with full rollback protection
    const reservedItems = [];
    for (const it of formattedItems) {
      // Atomic find and update requiring available >= requested quantity
      const inv = await Inventory.findOneAndUpdate(
        {
          variantSku: it.sku,
          available: { $gte: it.quantity },
        },
        {
          $inc: {
            reserved: it.quantity,
            available: -it.quantity,
          },
        },
        { new: true }
      );

      if (!inv) {
        // Rollback all previously reserved items in this order
        for (const r of reservedItems) {
          await Inventory.updateOne(
            { variantSku: r.sku },
            { $inc: { reserved: -r.quantity, available: r.quantity } }
          );
          await Product.updateOne(
            { _id: r.productId, "variants.sku": r.sku },
            {
              $inc: {
                "variants.$.cachedStock.reserved": -r.quantity,
                "variants.$.cachedStock.available": r.quantity,
              },
            }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: `Insufficient available stock for ${it.title} (${it.sku}). Please adjust your cart quantity.`,
          },
          { status: 400 }
        );
      }

      reservedItems.push(it);

      // Keep Product variant cachedStock synchronized
      await Product.updateOne(
        { _id: it.productId, "variants.sku": it.sku },
        {
          $inc: {
            "variants.$.cachedStock.reserved": it.quantity,
            "variants.$.cachedStock.available": -it.quantity,
          },
        }
      );

      // Record immutable InventoryTransaction ledger entry
      try {
        await InventoryTransaction.create({
          variantSku: it.sku,
          productId: it.productId || inv.productId,
          variantId: it.variantId || "default",
          type: "ORDER_RESERVED",
          delta: it.quantity,
          quantityChange: it.quantity,
          previousOnHand: inv.onHand,
          newOnHand: inv.onHand,
          previousAvailable: inv.available + it.quantity,
          newAvailable: inv.available,
          reason: "Order Checkout Reservation",
          referenceId: orderNumber,
          actorEmail: cleanEmail,
        });
      } catch (txErr) {
        console.warn("Failed to record inventory transaction:", txErr);
      }
    }

    // Increment coupon usage count atomically
    if (appliedCouponDoc) {
      await Coupon.findByIdAndUpdate(appliedCouponDoc._id, {
        $inc: { usageCount: 1 },
      }).catch((e) => console.warn("Coupon usage increment error:", e));
    }

    // 4. Build clean order document
    const orderData = {
      orderNumber,
      customerId: assignedCustomerId,
      customerDetails: {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
      },
      status: "CONFIRMED",
      payment: {
        method: payment?.method || "COD",
        status: payment?.method === "COD" ? "PENDING" : (payment?.status || "PAID"),
        transactionId: payment?.transactionId || `TXN_${Date.now()}`,
        gatewayOrderId: payment?.gatewayOrderId || `GW_${Date.now()}`,
        codConfirmed: payment?.method === "COD",
        paidAt: payment?.method === "COD" ? null : new Date(),
      },
      fulfillment: {
        status: "UNFULFILLED",
        carrier: null,
        awbNumber: null,
        trackingUrl: null,
        estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // +4 days
      },
      shippingAddress: {
        fullName: shippingAddress?.fullName || cleanName,
        phone: shippingAddress?.phone || cleanPhone || "",
        addressLine1: shippingAddress?.addressLine1 || shippingAddress?.address || "Delivery Address",
        addressLine2: shippingAddress?.addressLine2 || "",
        landmark: shippingAddress?.landmark || "",
        city: shippingAddress?.city || "Mumbai",
        state: shippingAddress?.state || "Maharashtra",
        pinCode: shippingAddress?.pinCode || "400001",
        country: shippingAddress?.country || "IN",
      },
      billingAddress: billingAddress || {
        fullName: shippingAddress?.fullName || cleanName,
        phone: shippingAddress?.phone || cleanPhone || "",
        addressLine1: shippingAddress?.addressLine1 || shippingAddress?.address || "Delivery Address",
        addressLine2: shippingAddress?.addressLine2 || "",
        city: shippingAddress?.city || "Mumbai",
        state: shippingAddress?.state || "Maharashtra",
        pinCode: shippingAddress?.pinCode || "400001",
        country: "IN",
      },
      items: formattedItems,
      pricing: {
        subtotal: calculatedSubtotal,
        discountAmount,
        couponCode: appliedCouponDoc ? appliedCouponDoc.code : "",
        shippingFee,
        codFee,
        taxBreakdown: {
          cgstTotal: Number((totalTax / 2).toFixed(2)),
          sgstTotal: Number((totalTax / 2).toFixed(2)),
          igstTotal: 0,
          totalTax,
        },
        grandTotal,
        currency: "INR",
      },
      timeline: [
        {
          event: "ORDER_CREATED",
          title: "Order Placed",
          description: `Order successfully placed via VogueThreads Storefront.`,
          actorEmail: cleanEmail,
          timestamp: new Date(),
        },
      ],
      statusHistory: [
        {
          status: "CONFIRMED",
          timestamp: new Date(),
          note: "Order confirmed and queued for fulfillment.",
          actor: "STOREFRONT",
        },
      ],
    };

    const newOrder = await Order.create(orderData);

    // Increment Customer order stats
    if (customerDoc?._id) {
      await Customer.findByIdAndUpdate(customerDoc._id, {
        $inc: { totalOrders: 1, totalSpent: grandTotal },
        $set: { lastOrderDate: new Date() },
      }).catch((e) => console.warn("Failed to update customer stats:", e));
    }

    // 5. PHASE 4: Asynchronously dispatch order confirmation email
    try {
      await sendOrderConfirmationEmail({ order: newOrder });
    } catch (emailErr) {
      console.error("Non-blocking order confirmation email error:", emailErr);
    }

    return NextResponse.json(
      {
        success: true,
        order: newOrder,
        orderNumber: newOrder.orderNumber,
        message: "Order placed and synced to MongoDB successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create order in MongoDB",
      },
      { status: 500 }
    );
  }
}
