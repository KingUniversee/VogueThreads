import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Attribute from "@/models/Attribute";
import Product from "@/models/Product";
import AuditLog from "@/models/AuditLog";
import { assertPermission } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const query = searchParams.get("q") || "";
    const statusParam = searchParams.get("status");
    const typeParam = searchParams.get("type");
    const sortParam = searchParams.get("sort") || "sort_order";
    const allParam = searchParams.get("all") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

    const filter = {};

    // Consumer backwards compatibility: if no query params and not requesting pagination, return active attributes
    if (!statusParam && !query && !typeParam && !allParam && !searchParams.has("page")) {
      filter.isActive = true;
      const attributes = await Attribute.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
      return NextResponse.json({
        success: true,
        data: attributes,
        count: attributes.length,
      });
    }

    // Status filter
    if (statusParam === "ACTIVE") {
      filter.isActive = true;
    } else if (statusParam === "INACTIVE") {
      filter.isActive = false;
    }

    // Type filter
    if (typeParam && typeParam !== "ALL") {
      filter.type = typeParam.toUpperCase();
    }

    // Search query (name or code)
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { code: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ];
    }

    // Sort mapping
    let sortObj = { sortOrder: 1, name: 1 };
    switch (sortParam) {
      case "name_asc":
        sortObj = { name: 1 };
        break;
      case "name_desc":
        sortObj = { name: -1 };
        break;
      case "newest":
        sortObj = { createdAt: -1 };
        break;
      case "oldest":
        sortObj = { createdAt: 1 };
        break;
      case "recently_updated":
        sortObj = { updatedAt: -1 };
        break;
      case "sort_order":
      default:
        sortObj = { sortOrder: 1, name: 1 };
        break;
    }

    // Compute real MongoDB telemetry stats
    const [totalAttributes, activeCount, inactiveCount, distinctTypes] = await Promise.all([
      Attribute.countDocuments(),
      Attribute.countDocuments({ isActive: true }),
      Attribute.countDocuments({ isActive: false }),
      Attribute.distinct("type"),
    ]);

    const totalFiltered = await Attribute.countDocuments(filter);
    const skip = (page - 1) * limit;

    const attributes = await Attribute.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    // Dynamically compute product usage counts from Product.attributes array
    const productUsage = await Product.aggregate([
      { $match: { isDeleted: { $ne: true }, "attributes.0": { $exists: true } } },
      { $unwind: "$attributes" },
      { $group: { _id: "$attributes.name", uniqueProductIds: { $addToSet: "$_id" } } },
      { $project: { _id: 1, count: { $size: "$uniqueProductIds" } } },
    ]);

    const usageMap = {};
    for (const item of productUsage) {
      if (item._id) {
        usageMap[String(item._id).toLowerCase()] = item.count;
      }
    }

    const dataWithCounts = attributes.map((attr) => {
      const nameKey = (attr.name || "").toLowerCase();
      const codeKey = (attr.code || "").toLowerCase();
      const productCount = usageMap[nameKey] || usageMap[codeKey] || 0;
      return {
        ...attr,
        productCount,
      };
    });

    return NextResponse.json({
      success: true,
      data: dataWithCounts,
      stats: {
        total: totalAttributes,
        active: activeCount,
        inactive: inactiveCount,
        typesCount: distinctTypes.length,
      },
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit) || 1,
      },
    });
  } catch (err) {
    console.error("GET /api/attributes error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch attributes" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = await assertPermission("attributes.manage");
    await connectToDatabase();

    const body = await req.json();
    const {
      name,
      code,
      type = "SELECT",
      description = "",
      options = [],
      isRequired = false,
      isFilterable = true,
      isActive = true,
      sortOrder = 0,
    } = body;

    // 1. Mandatory Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Attribute name is required" },
        { status: 400 }
      );
    }

    const cleanCode = (code || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanCode) {
      return NextResponse.json(
        { success: false, error: "A valid attribute key/code could not be generated" },
        { status: 400 }
      );
    }

    const existing = await Attribute.findOne({ code: cleanCode });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Attribute with code '${cleanCode}' already exists` },
        { status: 400 }
      );
    }

    const allowedTypes = ["SELECT", "MULTISELECT", "TEXT", "NUMBER", "BOOLEAN", "COLOR"];
    const normalizedType = (type || "SELECT").toUpperCase();
    if (!allowedTypes.includes(normalizedType)) {
      return NextResponse.json(
        { success: false, error: `Invalid attribute type '${type}'` },
        { status: 400 }
      );
    }

    // 2. Validate Options for option-based types
    const cleanedOptions = [];
    if (["SELECT", "MULTISELECT", "COLOR"].includes(normalizedType)) {
      const seenLabels = new Set();
      const seenValues = new Set();

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const label = (opt.label || "").trim();
        const value = (opt.value || opt.label || "")
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        if (!label || !value) continue;

        if (seenLabels.has(label.toLowerCase())) {
          return NextResponse.json(
            { success: false, error: `Duplicate option label "${label}" found in values list` },
            { status: 400 }
          );
        }
        if (seenValues.has(value)) {
          return NextResponse.json(
            { success: false, error: `Duplicate option key "${value}" found in values list` },
            { status: 400 }
          );
        }

        seenLabels.add(label.toLowerCase());
        seenValues.add(value);

        cleanedOptions.push({
          label,
          value,
          hex: opt.hex ? opt.hex.trim() : "",
          sortOrder: typeof opt.sortOrder === "number" ? opt.sortOrder : i,
          isActive: opt.isActive !== undefined ? Boolean(opt.isActive) : true,
        });
      }
    }

    // 3. Create Attribute Document
    const attribute = await Attribute.create({
      name: name.trim(),
      code: cleanCode,
      type: normalizedType,
      description: description ? description.trim() : "",
      options: cleanedOptions,
      isRequired: Boolean(isRequired),
      isFilterable: Boolean(isFilterable),
      isActive: Boolean(isActive),
      sortOrder: Number(sortOrder) || 0,
      createdBy: user.email,
      updatedBy: user.email,
    });

    // 4. Record Audit Log
    try {
      await AuditLog.create({
        actorId: user.id || user._id,
        actorEmail: user.email,
        action: "ATTRIBUTE_CREATE",
        resource: "Attribute",
        resourceId: String(attribute._id),
        details: {
          after: {
            name: attribute.name,
            code: attribute.code,
            type: attribute.type,
            optionsCount: attribute.options.length,
            isActive: attribute.isActive,
          },
        },
      });
    } catch (auditErr) {
      console.warn("Failed to record attribute create audit log:", auditErr);
    }

    return NextResponse.json({ success: true, data: attribute }, { status: 201 });
  } catch (err) {
    console.error("POST /api/attributes error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create attribute" },
      { status }
    );
  }
}
