import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Attribute from "@/models/Attribute";
import Product from "@/models/Product";
import AuditLog from "@/models/AuditLog";
import { assertPermission } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const attribute = await Attribute.findById(id).lean();

    if (!attribute) {
      return NextResponse.json(
        { success: false, error: "Attribute not found" },
        { status: 404 }
      );
    }

    // Live Product references count and sample products
    const [productCount, sampleProducts] = await Promise.all([
      Product.countDocuments({
        isDeleted: { $ne: true },
        $or: [
          { "attributes.name": attribute.name },
          { "attributes.name": new RegExp(`^${attribute.name}$`, "i") },
        ],
      }),
      Product.find({
        isDeleted: { $ne: true },
        $or: [
          { "attributes.name": attribute.name },
          { "attributes.name": new RegExp(`^${attribute.name}$`, "i") },
        ],
      })
        .select("title slug primaryImages variants status categoryId attributes")
        .populate("categoryId", "name slug")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    const formattedSample = sampleProducts.map((p) => {
      const prices = (p.variants || []).map((v) => v.price).filter((pr) => typeof pr === "number");
      const matchedAttr = (p.attributes || []).find(
        (a) =>
          a.name === attribute.name ||
          (a.name && a.name.toLowerCase() === attribute.name.toLowerCase())
      );
      return {
        _id: p._id,
        title: p.title,
        slug: p.slug,
        image: p.primaryImages?.[0]?.url || p.variants?.[0]?.images?.[0]?.url || "",
        categoryName: p.categoryId?.name || "Uncategorized",
        price: prices.length > 0 ? Math.min(...prices) : 0,
        status: p.status,
        matchedValue: matchedAttr?.value || "Assigned",
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...attribute,
        productCount,
        sampleProducts: formattedSample,
      },
    });
  } catch (err) {
    console.error("GET /api/attributes/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch attribute" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const user = await assertPermission("attributes.manage");
    await connectToDatabase();
    const { id } = await params;

    const attribute = await Attribute.findById(id);
    if (!attribute) {
      return NextResponse.json(
        { success: false, error: "Attribute not found" },
        { status: 404 }
      );
    }

    const beforeState = attribute.toObject();
    const body = await req.json();
    const {
      name,
      code,
      type,
      description,
      options,
      isRequired,
      isFilterable,
      isActive,
      sortOrder,
    } = body;

    // 1. Validate / update code
    if (code || name) {
      const cleanCode = (code || name || attribute.code)
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

      const existing = await Attribute.findOne({
        code: cleanCode,
        _id: { $ne: attribute._id },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Attribute with code '${cleanCode}' already exists` },
          { status: 400 }
        );
      }

      attribute.code = cleanCode;
    }

    // 2. Safe Type Modification Guard
    if (type && type.toUpperCase() !== attribute.type) {
      const normalizedType = type.toUpperCase();
      const allowedTypes = ["SELECT", "MULTISELECT", "TEXT", "NUMBER", "BOOLEAN", "COLOR"];
      if (!allowedTypes.includes(normalizedType)) {
        return NextResponse.json(
          { success: false, error: `Invalid attribute type '${type}'` },
          { status: 400 }
        );
      }

      // Check if products actively reference this attribute
      const inUseCount = await Product.countDocuments({
        isDeleted: { $ne: true },
        $or: [
          { "attributes.name": attribute.name },
          { "attributes.name": new RegExp(`^${attribute.name}$`, "i") },
        ],
      });

      if (inUseCount > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot change type from ${attribute.type} to ${normalizedType}: this attribute is actively used by ${inUseCount} product(s). To protect catalog data, please remove or reassign this attribute from products first.`,
          },
          { status: 400 }
        );
      }

      attribute.type = normalizedType;
    }

    if (name && name.trim()) attribute.name = name.trim();
    if (description !== undefined) attribute.description = description ? description.trim() : "";
    if (isRequired !== undefined) attribute.isRequired = Boolean(isRequired);
    if (isFilterable !== undefined) attribute.isFilterable = Boolean(isFilterable);
    if (isActive !== undefined) attribute.isActive = Boolean(isActive);
    if (sortOrder !== undefined) attribute.sortOrder = Number(sortOrder) || 0;

    // 3. Update Options with Duplicate Checks
    if (Array.isArray(options)) {
      const cleanedOptions = [];
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

      attribute.options = cleanedOptions;
    }

    attribute.updatedBy = user.email;
    await attribute.save();

    // 4. Record Audit Log
    try {
      await AuditLog.create({
        actorId: user.id || user._id,
        actorEmail: user.email,
        action: "ATTRIBUTE_UPDATE",
        resource: "Attribute",
        resourceId: String(attribute._id),
        details: {
          before: {
            name: beforeState.name,
            code: beforeState.code,
            type: beforeState.type,
            isActive: beforeState.isActive,
            optionsCount: beforeState.options?.length,
          },
          after: {
            name: attribute.name,
            code: attribute.code,
            type: attribute.type,
            isActive: attribute.isActive,
            optionsCount: attribute.options?.length,
          },
        },
      });
    } catch (auditErr) {
      console.warn("Failed to record attribute update audit log:", auditErr);
    }

    return NextResponse.json({ success: true, data: attribute });
  } catch (err) {
    console.error("PATCH /api/attributes/[id] error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update attribute" },
      { status }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await assertPermission("attributes.manage");
    await connectToDatabase();
    const { id } = await params;

    const attribute = await Attribute.findById(id);
    if (!attribute) {
      return NextResponse.json(
        { success: false, error: "Attribute not found" },
        { status: 404 }
      );
    }

    // Safe Deletion Guard: Check if products reference this attribute
    const inUseCount = await Product.countDocuments({
      isDeleted: { $ne: true },
      $or: [
        { "attributes.name": attribute.name },
        { "attributes.name": new RegExp(`^${attribute.name}$`, "i") },
      ],
    });

    if (inUseCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete attribute: it is currently assigned to ${inUseCount} active product(s). Please archive or remove this attribute from those products first.`,
        },
        { status: 400 }
      );
    }

    const deletedDoc = await Attribute.findByIdAndDelete(id);

    // Audit Log
    try {
      await AuditLog.create({
        actorId: user.id || user._id,
        actorEmail: user.email,
        action: "ATTRIBUTE_DELETE",
        resource: "Attribute",
        resourceId: String(id),
        details: {
          before: {
            name: deletedDoc.name,
            code: deletedDoc.code,
            type: deletedDoc.type,
            optionsCount: deletedDoc.options?.length,
          },
        },
      });
    } catch (auditErr) {
      console.warn("Failed to record attribute delete audit log:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Attribute deleted successfully",
    });
  } catch (err) {
    console.error("DELETE /api/attributes/[id] error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete attribute" },
      { status }
    );
  }
}
