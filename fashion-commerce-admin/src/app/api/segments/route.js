import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Segment from "@/models/Segment";
import AuditLog from "@/models/AuditLog";
import { getSegmentMembers } from "@/lib/segment-service";

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

/**
 * GET /api/segments
 * List customer segments with live member counts
 */
export async function GET(request) {
  try {
    await assertPermission("customers.read");
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ACTIVE";

    const filter = {};
    if (status !== "ALL") {
      filter.status = status;
    }

    const segments = await Segment.find(filter).sort({ createdAt: -1 }).lean();

    // Evaluate live member counts
    const segmentsWithCounts = await Promise.all(
      segments.map(async (seg) => {
        try {
          const result = await getSegmentMembers(seg._id, { limit: 1 });
          return {
            ...seg,
            memberCount: result.totalCount,
          };
        } catch (e) {
          return {
            ...seg,
            memberCount: seg.cachedMemberCount || 0,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      segments: segmentsWithCounts,
    });
  } catch (error) {
    console.error("❌ [API /api/segments GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch segments" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/segments
 * Create a new customer segment (Manual or Dynamic Rule-Based)
 */
export async function POST(request) {
  try {
    const user = await assertPermission("customers.update");
    await connectToDatabase();

    const body = await request.json();
    const {
      name,
      description = "",
      type = "RULE_BASED",
      matchType = "ALL",
      rules = [],
      customerIds = [],
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Segment name is required" },
        { status: 400 }
      );
    }

    const baseSlug = slugify(name);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await Segment.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }

    const newSegment = await Segment.create({
      name: name.trim(),
      slug: uniqueSlug,
      description: description.trim(),
      type,
      matchType,
      rules: type === "RULE_BASED" ? rules : [],
      customerIds: type === "MANUAL" ? customerIds : [],
      status: "ACTIVE",
    });

    // Evaluate initial members
    let memberCount = 0;
    try {
      const evalResult = await getSegmentMembers(newSegment._id, { limit: 1 });
      memberCount = evalResult.totalCount;
    } catch (e) {
      // Non-fatal
    }

    try {
      await AuditLog.create({
        actorEmail: user.email || "admin@voguethreads.in",
        action: "SEGMENT_CREATE",
        resource: "Segment",
        resourceId: String(newSegment._id),
        details: { name: newSegment.name, type, rulesCount: rules.length },
      });
    } catch (e) {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      segment: {
        ...newSegment.toObject(),
        memberCount,
      },
    });
  } catch (error) {
    console.error("❌ [API /api/segments POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create segment" },
      { status: error.status || 500 }
    );
  }
}
