import mongoose from "mongoose";
import { connectToDatabase } from "./mongoose.js";
import Order from "../models/Order.js";
import Inventory from "../models/Inventory.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Product from "../models/Product.js";
import AuditLog from "../models/AuditLog.js";
import { getCanonicalThreshold, getInventoryStatus } from "./inventory-status.js";

/**
 * Generate next sequential human-readable order number
 * Format: VT-ORD-YYYY-XXXX (e.g. VT-ORD-2026-1001)
 */
export async function generateOrderNumber() {
  await connectToDatabase();
  const year = new Date().getFullYear();
  const prefix = `VT-ORD-${year}-`;

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
}

/**
 * Validate that every item requested has sufficient available inventory
 */
export async function validateOrderItemsStock(items = []) {
  if (!items || items.length === 0) {
    throw new Error("Order must contain at least one item");
  }

  await connectToDatabase();
  const insufficientItems = [];

  const skus = items
    .map((item) => (item.sku ? item.sku.trim().toUpperCase() : ""))
    .filter(Boolean);

  const invDocs = await Inventory.find({ variantSku: { $in: skus } }).lean();
  const invMap = new Map(invDocs.map((inv) => [inv.variantSku, inv]));

  for (const item of items) {
    const upperSku = item.sku.trim().toUpperCase();
    const inv = invMap.get(upperSku);

    if (!inv) {
      insufficientItems.push({
        sku: upperSku,
        title: item.title || upperSku,
        requested: item.quantity,
        available: 0,
        reason: "Item not found in inventory registry",
      });
      continue;
    }

    const available = Number(inv.available) || 0;
    if (!inv.allowBackorder && available < item.quantity) {
      insufficientItems.push({
        sku: upperSku,
        title: item.title || upperSku,
        requested: item.quantity,
        available,
        reason: `Insufficient sellable stock (Only ${available} available)`,
      });
    }
  }

  if (insufficientItems.length > 0) {
    const error = new Error("One or more items do not have sufficient stock");
    error.status = 400;
    error.details = insufficientItems;
    throw error;
  }

  return true;
}

/**
 * Calculate pricing and Indian GST tax breakdown
 */
export function calculateOrderPricing({
  items = [],
  discountAmount = 0,
  shippingFee = 0,
  codFee = 0,
  couponCode = "",
  isInterState = false,
  promotionSnapshot = null,
  appliedDiscounts = [],
}) {
  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTax = 0;

  const calculatedItems = items.map((item) => {
    const quantity = Number(item.quantity) || 1;
    const unitPrice = Number(item.unitPrice) || 0;
    const itemSubtotal = unitPrice * quantity;
    const gstRate = Number(item.gstRate) || 5;

    // GST calculation
    const taxValue = Number(((itemSubtotal * gstRate) / 100).toFixed(2));
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igst = taxValue;
    } else {
      cgst = Number((taxValue / 2).toFixed(2));
      sgst = Number((taxValue - cgst).toFixed(2));
    }

    const itemTotal = Number((itemSubtotal + taxValue).toFixed(2));

    subtotal += itemSubtotal;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;
    totalTax += taxValue;

    return {
      ...item,
      sku: item.sku.trim().toUpperCase(),
      unitPrice,
      quantity,
      subtotal: itemSubtotal,
      gstRate,
      hsnCode: item.hsnCode || "6109",
      taxAmount: {
        cgst,
        sgst,
        igst,
        total: taxValue,
      },
      total: itemTotal,
    };
  });

  const parsedDiscount = Math.max(0, Number(discountAmount) || 0);
  const parsedShipping = Math.max(0, Number(shippingFee) || 0);
  const parsedCod = Math.max(0, Number(codFee) || 0);

  const grandTotal = Number(
    Math.max(0, subtotal + totalTax + parsedShipping + parsedCod - parsedDiscount).toFixed(2)
  );

  return {
    items: calculatedItems,
    pricing: {
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: parsedDiscount,
      couponCode: couponCode ? couponCode.trim().toUpperCase() : undefined,
      shippingFee: parsedShipping,
      codFee: parsedCod,
      taxBreakdown: {
        cgstTotal: Number(totalCgst.toFixed(2)),
        sgstTotal: Number(totalSgst.toFixed(2)),
        igstTotal: Number(totalIgst.toFixed(2)),
        totalTax: Number(totalTax.toFixed(2)),
      },
      grandTotal,
      currency: "INR",
      promotionSnapshot: promotionSnapshot || undefined,
      appliedDiscounts: appliedDiscounts || [],
    },
  };
}

/**
 * Idempotently reserve warehouse stock for an order
 * Increases `reserved`, decreases `available`, leaves physical `onHand` untouched.
 */
export async function reserveOrderStock(order, actor) {
  if (!order || !order.items || order.items.length === 0) return false;
  if (order.inventoryState?.reserved) return true; // Already reserved

  await connectToDatabase();
  const actorEmail = actor?.email || "system@voguethreads.internal";
  const actorId = actor?.id ? new mongoose.Types.ObjectId(actor.id) : undefined;

  const skus = order.items
    .map((item) => (item.sku ? item.sku.trim().toUpperCase() : ""))
    .filter(Boolean);
  const invDocs = await Inventory.find({ variantSku: { $in: skus } });
  const invMap = new Map(invDocs.map((inv) => [inv.variantSku, inv]));

  for (const item of order.items) {
    const upperSku = item.sku.trim().toUpperCase();
    const qty = Number(item.quantity) || 1;

    const inv = invMap.get(upperSku);
    if (!inv) continue;

    const prevOnHand = Number(inv.onHand) || 0;
    const prevReserved = Number(inv.reserved) || 0;
    const prevAvailable = Number(inv.available) || 0;

    const newReserved = prevReserved + qty;
    const newAvailable = prevOnHand - newReserved;

    // Atomic update
    await Inventory.updateOne(
      { _id: inv._id },
      {
        $set: {
          reserved: newReserved,
          available: newAvailable,
        },
      }
    );

    // Sync Product variant cache
    try {
      const threshold = getCanonicalThreshold(inv);
      const newAvailability = getInventoryStatus(newAvailable, threshold);
      await Product.updateOne(
        { _id: inv.productId, "variants.sku": upperSku },
        {
          $set: {
            "variants.$.cachedStock.reserved": newReserved,
            "variants.$.cachedStock.available": newAvailable,
            "variants.$.availability": newAvailability,
          },
        }
      );
    } catch (e) {
      // Ignore cache sync non-fatal error
    }

    // Record immutable ledger entry
    await InventoryTransaction.create({
      variantSku: upperSku,
      productId: inv.productId,
      variantId: inv.variantId,
      type: "ORDER_RESERVED",
      delta: qty,
      quantityChange: qty,
      previousQuantity: prevOnHand,
      newQuantity: prevOnHand,
      previousOnHand: prevOnHand,
      newOnHand: prevOnHand,
      previousAvailable: prevAvailable,
      newAvailable: newAvailable,
      reason: `Order ${order.orderNumber} placed by ${order.customerDetails?.name || "Customer"}`,
      referenceId: order.orderNumber,
      actorId,
      actorEmail,
      notes: `Stock reserved on order placement/confirmation`,
    });
  }

  order.inventoryState.reserved = true;
  return true;
}

/**
 * Idempotently commit warehouse stock deduction when order is dispatched/shipped
 * Decreases physical `onHand` and decreases `reserved`. Sellable `available` remains constant.
 */
export async function commitOrderStock(order, actor) {
  if (!order || !order.items || order.items.length === 0) return false;
  if (order.inventoryState?.committed) return true; // Already committed

  await connectToDatabase();
  const actorEmail = actor?.email || "system@voguethreads.internal";
  const actorId = actor?.id ? new mongoose.Types.ObjectId(actor.id) : undefined;

  for (const item of order.items) {
    const upperSku = item.sku.trim().toUpperCase();
    const qty = Number(item.quantity) || 1;

    const inv = await Inventory.findOne({ variantSku: upperSku });
    if (!inv) continue;

    const prevOnHand = Number(inv.onHand) || 0;
    const prevReserved = Number(inv.reserved) || 0;
    const prevAvailable = Number(inv.available) || 0;

    const newOnHand = Math.max(0, prevOnHand - qty);
    const newReserved = Math.max(0, prevReserved - qty);
    const newAvailable = newOnHand - newReserved;

    // Atomic update
    await Inventory.updateOne(
      { _id: inv._id },
      {
        $set: {
          onHand: newOnHand,
          reserved: newReserved,
          available: newAvailable,
        },
        $inc: { soldCount: qty },
      }
    );

    // Sync Product variant cache
    try {
      const threshold = getCanonicalThreshold(inv);
      const newAvailability = getInventoryStatus(newAvailable, threshold);
      await Product.updateOne(
        { _id: inv.productId, "variants.sku": upperSku },
        {
          $set: {
            "variants.$.cachedStock.onHand": newOnHand,
            "variants.$.cachedStock.reserved": newReserved,
            "variants.$.cachedStock.available": newAvailable,
            "variants.$.availability": newAvailability,
          },
        }
      );
    } catch (e) {
      // Ignore cache sync non-fatal error
    }

    // Record immutable ledger entry
    await InventoryTransaction.create({
      variantSku: upperSku,
      productId: inv.productId,
      variantId: inv.variantId,
      type: "ORDER_FULFILLED",
      delta: -qty,
      quantityChange: -qty,
      previousQuantity: prevOnHand,
      newQuantity: newOnHand,
      previousOnHand: prevOnHand,
      newOnHand: newOnHand,
      previousAvailable: prevAvailable,
      newAvailable: newAvailable,
      reason: `Order ${order.orderNumber} dispatched/shipped to customer`,
      referenceId: order.orderNumber,
      actorId,
      actorEmail,
      notes: `Warehouse stock physically fulfilled and deducted on dispatch`,
    });
  }

  order.inventoryState.committed = true;
  return true;
}

/**
 * Idempotently release warehouse stock reservation when order is cancelled before dispatch
 * Decreases `reserved`, increases `available`. Physical `onHand` remains untouched.
 */
export async function releaseOrderStock(order, actor) {
  if (!order || !order.items || order.items.length === 0) return false;
  if (!order.inventoryState?.reserved) return true; // Stock wasn't reserved
  if (order.inventoryState?.released) return true; // Already released
  if (order.inventoryState?.committed) return false; // Already shipped, cannot release reservation

  await connectToDatabase();
  const actorEmail = actor?.email || "system@voguethreads.internal";
  const actorId = actor?.id ? new mongoose.Types.ObjectId(actor.id) : undefined;

  for (const item of order.items) {
    const upperSku = item.sku.trim().toUpperCase();
    const qty = Number(item.quantity) || 1;

    const inv = await Inventory.findOne({ variantSku: upperSku });
    if (!inv) continue;

    const prevOnHand = Number(inv.onHand) || 0;
    const prevReserved = Number(inv.reserved) || 0;
    const prevAvailable = Number(inv.available) || 0;

    const newReserved = Math.max(0, prevReserved - qty);
    const newAvailable = prevOnHand - newReserved;

    // Atomic update
    await Inventory.updateOne(
      { _id: inv._id },
      {
        $set: {
          reserved: newReserved,
          available: newAvailable,
        },
      }
    );

    // Sync Product variant cache
    try {
      const threshold = getCanonicalThreshold(inv);
      const newAvailability = getInventoryStatus(newAvailable, threshold);
      await Product.updateOne(
        { _id: inv.productId, "variants.sku": upperSku },
        {
          $set: {
            "variants.$.cachedStock.reserved": newReserved,
            "variants.$.cachedStock.available": newAvailable,
            "variants.$.availability": newAvailability,
          },
        }
      );
    } catch (e) {
      // Ignore cache sync non-fatal error
    }

    // Record immutable ledger entry
    await InventoryTransaction.create({
      variantSku: upperSku,
      productId: inv.productId,
      variantId: inv.variantId,
      type: "ORDER_CANCELLED",
      delta: -qty,
      quantityChange: -qty,
      previousQuantity: prevOnHand,
      newQuantity: prevOnHand,
      previousOnHand: prevOnHand,
      newOnHand: prevOnHand,
      previousAvailable: prevAvailable,
      newAvailable: newAvailable,
      reason: `Order ${order.orderNumber} cancelled (${order.cancellation?.reason || "Admin/Customer cancellation"})`,
      referenceId: order.orderNumber,
      actorId,
      actorEmail,
      notes: `Reserved stock released back to sellable inventory`,
    });
  }

  order.inventoryState.released = true;
  return true;
}

/**
 * Restock returned items back into warehouse inventory
 * Increases physical `onHand` and sellable `available`.
 */
export async function restockReturnedItems(order, itemsToRestock = [], actor) {
  if (!itemsToRestock || itemsToRestock.length === 0) return false;

  await connectToDatabase();
  const actorEmail = actor?.email || "system@voguethreads.internal";
  const actorId = actor?.id ? new mongoose.Types.ObjectId(actor.id) : undefined;

  for (const item of itemsToRestock) {
    const upperSku = item.sku.trim().toUpperCase();
    const qty = Number(item.quantity) || 1;

    const inv = await Inventory.findOne({ variantSku: upperSku });
    if (!inv) continue;

    const prevOnHand = Number(inv.onHand) || 0;
    const prevReserved = Number(inv.reserved) || 0;
    const prevAvailable = Number(inv.available) || 0;

    const newOnHand = prevOnHand + qty;
    const newAvailable = newOnHand - prevReserved;

    // Atomic update
    await Inventory.updateOne(
      { _id: inv._id },
      {
        $set: {
          onHand: newOnHand,
          available: newAvailable,
        },
      }
    );

    // Sync Product variant cache
    try {
      const threshold = getCanonicalThreshold(inv);
      const newAvailability = getInventoryStatus(newAvailable, threshold);
      await Product.updateOne(
        { _id: inv.productId, "variants.sku": upperSku },
        {
          $set: {
            "variants.$.cachedStock.onHand": newOnHand,
            "variants.$.cachedStock.available": newAvailable,
            "variants.$.availability": newAvailability,
          },
        }
      );
    } catch (e) {
      // Ignore cache sync non-fatal error
    }

    // Record immutable ledger entry
    await InventoryTransaction.create({
      variantSku: upperSku,
      productId: inv.productId,
      variantId: inv.variantId,
      type: "RETURN_RESTOCK",
      delta: qty,
      quantityChange: qty,
      previousQuantity: prevOnHand,
      newQuantity: newOnHand,
      previousOnHand: prevOnHand,
      newOnHand: newOnHand,
      previousAvailable: prevAvailable,
      newAvailable: newAvailable,
      reason: `Return restocked for order ${order.orderNumber} (Condition: ${item.condition || "GOOD"})`,
      referenceId: order.orderNumber,
      actorId,
      actorEmail,
      notes: `Returned goods inspected and restored to warehouse inventory`,
    });
  }

  return true;
}

/**
 * Create a new customer order with stock reservation
 */
export async function createOrder(orderPayload, actor) {
  await connectToDatabase();

  // Validate stock
  await validateOrderItemsStock(orderPayload.items);

  // Generate order number
  const orderNumber = await generateOrderNumber();

  // Calculate pricing & taxes
  const rawCouponCode = orderPayload.pricing?.couponCode || orderPayload.couponCode;
  const rawDiscountAmount = orderPayload.pricing?.discountAmount || orderPayload.discountAmount;
  const rawPromotionSnapshot = orderPayload.pricing?.promotionSnapshot || orderPayload.promotionSnapshot;
  const rawAppliedDiscounts = orderPayload.pricing?.appliedDiscounts || orderPayload.appliedDiscounts || [];

  const { items: processedItems, pricing } = calculateOrderPricing({
    items: orderPayload.items,
    discountAmount: rawDiscountAmount,
    shippingFee: orderPayload.pricing?.shippingFee || orderPayload.shippingFee,
    codFee: orderPayload.pricing?.codFee || orderPayload.codFee,
    couponCode: rawCouponCode,
    isInterState: orderPayload.isInterState || false,
    promotionSnapshot: rawPromotionSnapshot,
    appliedDiscounts: rawAppliedDiscounts,
  });

  const actorEmail = actor?.email || "system@voguethreads.internal";

  const newOrder = new Order({
    orderNumber,
    customerId: orderPayload.customerId,
    customerDetails: orderPayload.customerDetails,
    status: orderPayload.status || "CONFIRMED",
    payment: {
      method: orderPayload.payment?.method || "UPI",
      status: orderPayload.payment?.status || (orderPayload.payment?.method === "COD" ? "PENDING" : "PAID"),
      transactionId: orderPayload.payment?.transactionId,
      gatewayOrderId: orderPayload.payment?.gatewayOrderId,
      codConfirmed: orderPayload.payment?.method === "COD",
      paidAt: orderPayload.payment?.status === "PAID" ? new Date() : undefined,
    },
    fulfillment: orderPayload.fulfillment || {},
    shippingAddress: orderPayload.shippingAddress,
    billingAddress: orderPayload.billingAddress || orderPayload.shippingAddress,
    items: processedItems,
    pricing,
    inventoryState: {
      reserved: false,
      committed: false,
      released: false,
      restocked: false,
    },
    timeline: [
      {
        event: "ORDER_CREATED",
        title: "Order Placed",
        description: `Order ${orderNumber} placed for ₹${pricing.grandTotal.toLocaleString("en-IN")}`,
        actorEmail,
        timestamp: new Date(),
      },
    ],
    statusHistory: [
      {
        status: orderPayload.status || "CONFIRMED",
        timestamp: new Date(),
        note: "Initial order creation",
        actor: actorEmail,
      },
    ],
  });

  // Reserve stock for the order
  await reserveOrderStock(newOrder, actor);

  newOrder.timeline.push({
    event: "STOCK_RESERVED",
    title: "Stock Reserved",
    description: `Reserved ${processedItems.reduce((acc, i) => acc + i.quantity, 0)} units in warehouse`,
    actorEmail,
    timestamp: new Date(),
  });

  await newOrder.save();

  // Atomically track coupon redemption
  if (pricing.couponCode) {
    try {
      const { recordCouponRedemptionAtomic } = await import("./coupon-service.js");
      await recordCouponRedemptionAtomic(pricing.couponCode);
    } catch (couponRedeemErr) {
      console.warn("⚠️ [Coupon] Non-critical warning recording atomic redemption:", couponRedeemErr.message);
    }
  }

  // Audit Log
  try {
    await AuditLog.create({
      actorId: actor?.id ? new mongoose.Types.ObjectId(actor.id) : undefined,
      actorEmail,
      action: "ORDER_CREATE",
      resource: "Order",
      resourceId: String(newOrder._id),
      details: {
        orderNumber,
        grandTotal: pricing.grandTotal,
        itemCount: processedItems.length,
      },
    });
  } catch (e) {
    // Non-fatal
  }

  return newOrder;
}

/**
 * Aggregate order metrics across database
 */
export async function getOrderMetrics() {
  await connectToDatabase();

  const [aggregates, statusCounts] = await Promise.all([
    Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [{ $in: ["$status", ["CANCELLED", "FAILED"]] }, 0, "$pricing.grandTotal"],
            },
          },
          avgOrderValue: {
            $avg: {
              $cond: [{ $in: ["$status", ["CANCELLED", "FAILED"]] }, null, "$pricing.grandTotal"],
            },
          },
        },
      },
    ]),
    Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const summary = aggregates[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 };
  const countsByStatus = {};
  statusCounts.forEach((item) => {
    countsByStatus[item._id] = item.count;
  });

  return {
    totalOrders: summary.totalOrders || 0,
    totalRevenue: Math.round(summary.totalRevenue || 0),
    avgOrderValue: Math.round(summary.avgOrderValue || 0),
    pendingPayment: countsByStatus.PENDING_PAYMENT || 0,
    confirmed: countsByStatus.CONFIRMED || 0,
    paid: countsByStatus.PAID || 0,
    processing: countsByStatus.PROCESSING || 0,
    packed: countsByStatus.PACKED || 0,
    shipped: countsByStatus.SHIPPED || 0,
    delivered: countsByStatus.DELIVERED || 0,
    cancelled: countsByStatus.CANCELLED || 0,
    returned: countsByStatus.RETURNED || 0,
    refunded: countsByStatus.REFUNDED || 0,
  };
}
