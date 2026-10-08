import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Order from "@/models/Order";

/**
 * GET /api/orders/export
 * Export filtered orders as CSV
 */
export async function GET(request) {
  try {
    await assertPermission("orders.read");
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";
    const paymentStatus = searchParams.get("paymentStatus") || "ALL";

    const filter = {};
    if (status && status !== "ALL") {
      filter.status = status;
    }
    if (paymentStatus && paymentStatus !== "ALL") {
      filter["payment.status"] = paymentStatus;
    }
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { orderNumber: searchRegex },
        { "customerDetails.name": searchRegex },
        { "customerDetails.email": searchRegex },
        { "customerDetails.phone": searchRegex },
      ];
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(1000).lean();

    // Generate CSV lines
    const headers = [
      "Order Number",
      "Date",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "City",
      "State",
      "Pin Code",
      "Items Count",
      "Items Summary",
      "Subtotal (INR)",
      "Tax (INR)",
      "Shipping (INR)",
      "Grand Total (INR)",
      "Payment Method",
      "Payment Status",
      "Order Status",
      "Carrier",
      "AWB Number",
    ];

    const rows = orders.map((o) => {
      const itemsSummary = (o.items || [])
        .map((i) => `${i.title} (${i.sku} x ${i.quantity})`)
        .join("; ");

      return [
        `"${o.orderNumber || ""}"`,
        `"${o.createdAt ? new Date(o.createdAt).toISOString() : ""}"`,
        `"${(o.customerDetails?.name || "").replace(/"/g, '""')}"`,
        `"${o.customerDetails?.email || ""}"`,
        `"${o.customerDetails?.phone || ""}"`,
        `"${(o.shippingAddress?.city || "").replace(/"/g, '""')}"`,
        `"${(o.shippingAddress?.state || "").replace(/"/g, '""')}"`,
        `"${o.shippingAddress?.pinCode || ""}"`,
        o.items?.length || 0,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        o.pricing?.subtotal || 0,
        o.pricing?.taxBreakdown?.totalTax || 0,
        o.pricing?.shippingFee || 0,
        o.pricing?.grandTotal || 0,
        `"${o.payment?.method || ""}"`,
        `"${o.payment?.status || ""}"`,
        `"${o.status || ""}"`,
        `"${o.fulfillment?.carrier || ""}"`,
        `"${o.fulfillment?.awbNumber || ""}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("❌ [API /api/orders/export GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to export orders" },
      { status: error.status || 500 }
    );
  }
}
