import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Segment from "@/models/Segment";
import AuditLog from "@/models/AuditLog";
import { getSegmentMembers } from "@/lib/segment-service";

/**
 * GET /api/segments/[id]
 * Fetch single segment details and its member customers
 */
export async function GET(request, { params }) {
  try {
    await assertPermission("customers.read");
    await connectToDatabase();

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Segment ID is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search") || "";

    let segmentDoc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      segmentDoc = await Segment.findById(id);
    }
    if (!segmentDoc) {
      segmentDoc = await Segment.findOne({ slug: id.trim().toLowerCase() });
    }

    if (!segmentDoc) {
      return NextResponse.json({ success: false, error: `Segment '${id}' not found` }, { status: 404 });
    }

    const result = await getSegmentMembers(segmentDoc._id, { page, limit, search });

    return NextResponse.json({
      success: true,
      segment: result.segment,
      members: result.members,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.totalCount,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("❌ [API /api/segments/[id] GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch segment" },
      { status: error.status || 500 }
    );
  }
}

/**
 * PATCH /api/segments/[id]
 * Update segment configuration or rules
 */
export async function PATCH(request, { params }) {
  try {
    const user = await assertPermission("customers.update");
    await connectToDatabase();

    const { id } = await params;
    const segment = await Segment.findById(id);
    if (!segment) {
      return NextResponse.json({ success: false, error: `Segment '${id}' not found` }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, rules, matchType, status } = body;

    if (name && name.trim()) segment.name = name.trim();
    if (description !== undefined) segment.description = description.trim();
    if (Array.isArray(rules)) segment.rules = rules;
    if (matchType && ["ALL", "ANY"].includes(matchType)) segment.matchType = matchType;
    if (status && ["ACTIVE", "ARCHIVED"].includes(status)) segment.status = status;

    await segment.save();

    // Re-evaluate
    const evalResult = await getSegmentMembers(segment._id, { limit: 1 });

    try {
      await AuditLog.create({
        actorEmail: user.email || "admin@voguethreads.in",
        action: "SEGMENT_UPDATE",
        resource: "Segment",
        resourceId: String(segment._id),
        details: { name: segment.name, status: segment.status },
      });
    } catch (e) {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      segment: {
        ...segment.toObject(),
        memberCount: evalResult.totalCount,
      },
    });
  } catch (error) {
    console.error("❌ [API /api/segments/[id] PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update segment" },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/segments/[id]
 * Archive segment. IMPORTANT: Customers are NEVER deleted when deleting a segment.
 */
export async function DELETE(request, { params }) {
  try {
    const user = await assertPermission("customers.update");
    await connectToDatabase();

    const { id } = await params;
    const segment = await Segment.findById(id);
    if (!segment) {
      return NextResponse.json({ success: false, error: `Segment '${id}' not found` }, { status: 404 });
    }

    segment.status = "ARCHIVED";
    await segment.save();

    try {
      await AuditLog.create({
        actorEmail: user.email || "admin@voguethreads.in",
        action: "SEGMENT_ARCHIVE",
        resource: "Segment",
        resourceId: String(segment._id),
        details: { name: segment.name },
      });
    } catch (e) {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      message: `Segment ${segment.name} archived. Customer data remains untouched.`,
    });
  } catch (error) {
    console.error("❌ [API /api/segments/[id] DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to archive segment" },
      { status: error.status || 500 }
    );
  }
}
