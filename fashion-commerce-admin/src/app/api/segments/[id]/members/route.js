import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Segment from "@/models/Segment";
import AuditLog from "@/models/AuditLog";

/**
 * POST /api/segments/[id]/members
 * Add or remove customer members in a static/manual segment
 */
export async function POST(request, { params }) {
  try {
    const user = await assertPermission("customers.update");
    await connectToDatabase();

    const { id } = await params;
    const segment = await Segment.findById(id);
    if (!segment) {
      return NextResponse.json({ success: false, error: `Segment '${id}' not found` }, { status: 404 });
    }

    if (segment.type !== "MANUAL") {
      return NextResponse.json(
        { success: false, error: "Cannot manually add/remove members on dynamic rule-based segments" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, customerId } = body;

    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      return NextResponse.json({ success: false, error: "Valid customer ID is required" }, { status: 400 });
    }

    const custObjId = new mongoose.Types.ObjectId(customerId);

    if (action === "ADD") {
      if (!segment.customerIds.some((id) => id.equals(custObjId))) {
        segment.customerIds.push(custObjId);
      }
    } else if (action === "REMOVE") {
      segment.customerIds = segment.customerIds.filter((id) => !id.equals(custObjId));
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be ADD or REMOVE" },
        { status: 400 }
      );
    }

    segment.cachedMemberCount = segment.customerIds.length;
    segment.lastEvaluatedAt = new Date();
    await segment.save();

    try {
      await AuditLog.create({
        actorEmail: user.email || "admin@voguethreads.in",
        action: `SEGMENT_MEMBER_${action}`,
        resource: "Segment",
        resourceId: String(segment._id),
        details: { customerId, action },
      });
    } catch (e) {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      memberCount: segment.customerIds.length,
      customerIds: segment.customerIds,
    });
  } catch (error) {
    console.error("❌ [API /api/segments/[id]/members POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update segment members" },
      { status: error.status || 500 }
    );
  }
}
