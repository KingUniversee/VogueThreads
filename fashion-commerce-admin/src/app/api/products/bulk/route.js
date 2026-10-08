import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Product from "@/models/Product";
import AuditLog from "@/models/AuditLog";
import { assertPermission } from "@/lib/auth";

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one product ID must be selected" },
        { status: 400 }
      );
    }

    let user;
    if (action === "DELETE") {
      user = await assertPermission("products.delete");
    } else {
      user = await assertPermission("products.update");
    }

    await connectToDatabase();

    let resultMessage = "";
    let updateData = {};

    switch (action) {
      case "PUBLISH":
        updateData = { status: "PUBLISHED" };
        resultMessage = `Successfully published ${ids.length} products`;
        break;
      case "UNPUBLISH":
        updateData = { status: "DRAFT" };
        resultMessage = `Successfully unpublished ${ids.length} products (set to Draft)`;
        break;
      case "ARCHIVE":
        updateData = { status: "ARCHIVED" };
        resultMessage = `Successfully archived ${ids.length} products`;
        break;
      case "DELETE":
        updateData = { isDeleted: true, status: "ARCHIVED", deletedAt: new Date() };
        resultMessage = `Successfully deleted/archived ${ids.length} products`;
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Invalid bulk action: '${action}'` },
          { status: 400 }
        );
    }

    const updateRes = await Product.updateMany(
      { _id: { $in: ids }, isDeleted: false },
      { $set: updateData }
    );

    // Audit Log
    try {
      await AuditLog.create({
        actorId: user.id,
        actorEmail: user.email,
        action: `PRODUCT_BULK_${action}`,
        resource: "Product",
        resourceId: `bulk_${ids.length}_items`,
        details: { action, count: updateRes.modifiedCount, productIds: ids },
      });
    } catch (auditErr) {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      message: resultMessage,
      modifiedCount: updateRes.modifiedCount,
    });
  } catch (err) {
    console.error("POST /api/products/bulk error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Bulk operation failed" },
      { status }
    );
  }
}
