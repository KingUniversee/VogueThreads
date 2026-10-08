import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { setVariantThreshold } from "@/lib/inventory-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(req) {
  try {
    const user = await assertPermission("inventory.adjust");
    const body = await req.json();
    const { sku, skus, threshold } = body;

    if (threshold === undefined || threshold === null || isNaN(threshold) || Number(threshold) < 0) {
      return NextResponse.json(
        { success: false, error: "A valid non-negative threshold number is required" },
        { status: 400 }
      );
    }

    const targetSkus = Array.isArray(skus) && skus.length > 0 ? skus : sku ? [sku] : [];

    if (targetSkus.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please provide at least one SKU to update threshold" },
        { status: 400 }
      );
    }

    const updated = [];
    for (const targetSku of targetSkus) {
      const inv = await setVariantThreshold({
        sku: targetSku,
        threshold: Number(threshold),
        actorId: user.id,
        actorEmail: user.email,
      });
      updated.push({
        sku: targetSku,
        lowStockThreshold: inv.lowStockThreshold,
        threshold: inv.lowStockThreshold,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: updated,
        message: `Updated safety threshold to ${threshold} for ${updated.length} SKU(s)`,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    console.error("PATCH /api/inventory/threshold error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update safety threshold" },
      { status }
    );
  }
}
