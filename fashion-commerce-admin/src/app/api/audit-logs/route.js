import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { getAuditLogs } from "@/lib/system-service";

/**
 * GET /api/audit-logs
 * Strictly immutable audit ledger querying with multi-filter search and pagination.
 */
export async function GET(request) {
  try {
    await assertPermission(["audit.read", "system.manage"]);

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";
    const search = searchParams.get("search") || "";
    const actor = searchParams.get("actor") || "";
    const action = searchParams.get("action") || "ALL";
    const resource = searchParams.get("resource") || "ALL";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const data = await getAuditLogs({
      page,
      limit,
      search,
      actor,
      action,
      resource,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("❌ [API /api/audit-logs GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch audit logs" },
      { status: error.status || 500 }
    );
  }
}
