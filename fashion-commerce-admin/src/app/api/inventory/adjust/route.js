import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { adjustStock } from "@/lib/inventory-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req) {
  try {
    const user = await assertPermission("inventory.adjust");
    const body = await req.json();

    const {
      sku,
      type,
      delta,
      quantity,
      mode = "INCREMENT",
      newQuantity,
      reason,
      referenceId,
      notes,
    } = body;

    const result = await adjustStock({
      sku,
      type,
      delta,
      quantity,
      mode,
      newQuantity,
      reason,
      referenceId,
      notes,
      actorId: user.id,
      actorEmail: user.email,
    });

    return NextResponse.json(
      {
        success: true,
        data: result.inventory,
        transaction: result.transaction,
        message: `Successfully adjusted stock for SKU ${sku}`,
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
    console.error("POST /api/inventory/adjust error:", err);
    const status = err.status || 400;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to adjust stock" },
      { status }
    );
  }
}
