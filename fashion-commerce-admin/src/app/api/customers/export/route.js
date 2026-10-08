import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Customer from "@/models/Customer";
import Order from "@/models/Order";

function escapeCsvField(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request) {
  try {
    await assertPermission(["customers.read", "customers.manage"]);
    await connectToDatabase();

    const customers = await Customer.find({ isDeleted: { $ne: true } })
      .select("name email phone status emailVerified authProvider createdAt")
      .sort({ createdAt: -1 })
      .lean();

    // Aggregate orders summary per customer email
    const orderStats = await Order.aggregate([
      {
        $match: {
          status: { $ne: "CANCELLED" },
        },
      },
      {
        $group: {
          $id: { $toLower: "$customerDetails.email" },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$pricing.grandTotal" },
        },
      },
    ]);

    const statsMap = new Map();
    for (const stat of orderStats) {
      if (stat._id) {
        statsMap.set(stat._id, {
          totalOrders: stat.totalOrders,
          totalSpent: stat.totalSpent,
        });
      }
    }

    const headers = [
      "Customer ID",
      "Name",
      "Email",
      "Phone",
      "Status",
      "Email Verified",
      "Auth Provider",
      "Total Orders",
      "Total Spent (INR)",
      "Created At",
    ];

    const rows = customers.map((c) => {
      const emailKey = (c.email || "").toLowerCase().trim();
      const stats = statsMap.get(emailKey) || { totalOrders: 0, totalSpent: 0 };

      return [
        escapeCsvField(c._id),
        escapeCsvField(c.name || "N/A"),
        escapeCsvField(c.email || "N/A"),
        escapeCsvField(c.phone || "N/A"),
        escapeCsvField(c.status || "ACTIVE"),
        escapeCsvField(c.emailVerified ? "Yes" : "No"),
        escapeCsvField(c.authProvider || "credentials"),
        escapeCsvField(stats.totalOrders),
        escapeCsvField(Number(stats.totalSpent || 0).toFixed(2)),
        escapeCsvField(c.createdAt ? new Date(c.createdAt).toISOString() : ""),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="voguethreads-customers-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error("❌ [API /api/customers/export GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to export customers" },
      { status: error.status || 500 }
    );
  }
}
