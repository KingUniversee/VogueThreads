import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import Order from "@/models/Order";
import { getSession } from "@/lib/auth";

/**
 * GET /api/orders/[id]
 * Securely retrieves order details.
 * - Authenticated Owner (session.userId === order.customerId): Full order details returned.
 * - Authenticated Non-Owner: 403 Forbidden.
 * - Unauthenticated: 401 Unauthorized (or sanitized tracking if verified email match provided).
 */
export async function GET(req, { params }) {
  try {
    const session = await getSession(req);
    await connectToDatabase();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Order identifier is required" },
        { status: 400 }
      );
    }

    const cleanId = decodeURIComponent(id).trim();
    const strippedId = cleanId.replace(/^#/, "");

    const query = {
      $or: [
        { orderNumber: new RegExp(`^${strippedId}$`, "i") },
        { orderNumber: new RegExp(`^${cleanId}$`, "i") },
      ],
    };

    if (mongoose.Types.ObjectId.isValid(strippedId)) {
      query.$or.push({ _id: strippedId });
    }

    const order = await Order.findOne(query).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order '${cleanId}' not found` },
        { status: 404 }
      );
    }

    // 1. Authenticated User Check
    if (session?.userId) {
      const isOwner = Boolean(order.customerId && session.userId === order.customerId.toString());
      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: "Forbidden. You do not have permission to access this order." },
          { status: 403 }
        );
      }

      // Authenticated owner gets full order details
      return NextResponse.json({
        success: true,
        order,
      });
    }

    // 2. Unauthenticated: Check if explicit verified email is provided for safe, PII-masked tracking
    const searchParams = req.nextUrl?.searchParams;
    const verifyEmail = searchParams?.get("email")?.trim()?.toLowerCase();
    const orderEmail = (order.customerDetails?.email || "").trim().toLowerCase();

    if (verifyEmail && orderEmail && verifyEmail === orderEmail) {
      // Return safe, sanitized tracking without exposing phone, full address, or financial PII
      const sanitizedTracking = {
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        fulfillment: order.fulfillment || {},
        pricing: {
          grandTotal: order.pricing?.grandTotal,
          currency: order.pricing?.currency || "INR",
        },
        items: (order.items || []).map((it) => ({
          title: it.title,
          quantity: it.quantity,
          image: it.image,
          color: it.color,
          size: it.size,
        })),
        maskedRecipient: order.customerDetails?.name
          ? `${order.customerDetails.name[0]}***`
          : "Customer",
        destinationCity: order.shippingAddress?.city || "India",
        timeline: order.timeline || [],
      };

      return NextResponse.json({
        success: true,
        isPublicTracking: true,
        order: sanitizedTracking,
      });
    }

    // Unauthenticated access without matching email is strictly rejected
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please sign in to view this order." },
      { status: 401 }
    );
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch order details" },
      { status: 500 }
    );
  }
}
