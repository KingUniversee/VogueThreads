import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Category from "@/models/Category";
import Product from "@/models/Product";
import AuditLog from "@/models/AuditLog";
import { assertPermission } from "@/lib/auth";

/**
 * Helper to recursively cascade level updates to all descendants
 */
async function cascadeDescendantLevels(parentId, currentLevel) {
  const children = await Category.find({ parentId });
  for (const child of children) {
    child.level = currentLevel + 1;
    await child.save();
    await cascadeDescendantLevels(child._id, child.level);
  }
}

export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const category = await Category.findById(id)
      .populate("parentId", "name slug")
      .lean();

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    const [productCount, subcategoryCount] = await Promise.all([
      Product.countDocuments({ categoryId: id, isDeleted: { $ne: true } }),
      Category.countDocuments({ parentId: id }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...category,
        productCount,
        subcategoryCount,
      },
    });
  } catch (err) {
    console.error(`GET /api/categories/[id] error:`, err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch category" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const user = await assertPermission("categories.manage");
    await connectToDatabase();
    const { id } = await params;

    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      slug,
      description,
      parentId,
      imageUrl,
      isActive,
      displayOrder,
      seo,
    } = body;

    const beforeState = category.toObject();

    // 1. Name & Slug validation
    let cleanSlug = null;
    if (slug || name) {
      cleanSlug = (slug || name || category.slug)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (!cleanSlug) {
        return NextResponse.json(
          { success: false, error: "Valid URL slug could not be generated" },
          { status: 400 }
        );
      }

      const existing = await Category.findOne({
        slug: cleanSlug,
        _id: { $ne: category._id },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Category with slug '${cleanSlug}' already exists` },
          { status: 400 }
        );
      }
    }

    // 2. Parent & Circular Hierarchy validation
    let newLevel = category.level || 0;
    let newParentId = category.parentId;
    let parentChanged = false;

    if (parentId !== undefined) {
      if (parentId && parentId !== "null" && parentId !== "") {
        // Cannot be own parent
        if (String(parentId) === String(category._id)) {
          return NextResponse.json(
            { success: false, error: "A category cannot be its own parent" },
            { status: 400 }
          );
        }

        // Circular reference prevention: traverse ancestor chain
        let ancestor = await Category.findById(parentId).lean();
        if (!ancestor) {
          return NextResponse.json(
            { success: false, error: "Selected parent category does not exist" },
            { status: 400 }
          );
        }

        while (ancestor) {
          if (String(ancestor._id) === String(category._id)) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "Circular hierarchy detected: cannot set a descendant category as parent",
              },
              { status: 400 }
            );
          }
          if (!ancestor.parentId) break;
          ancestor = await Category.findById(ancestor.parentId).lean();
        }

        const parentDoc = await Category.findById(parentId);
        newParentId = parentDoc._id;
        newLevel = (parentDoc.level || 0) + 1;
      } else {
        newParentId = null;
        newLevel = 0;
      }

      if (String(category.parentId || "") !== String(newParentId || "")) {
        parentChanged = true;
      }
    }

    // 3. Apply updates
    if (name && name.trim()) category.name = name.trim();
    if (cleanSlug) category.slug = cleanSlug;
    if (description !== undefined) category.description = description ? description.trim() : "";
    if (parentId !== undefined) {
      category.parentId = newParentId;
      category.level = newLevel;
    }
    if (imageUrl !== undefined) category.imageUrl = imageUrl ? imageUrl.trim() : "";
    if (isActive !== undefined) category.isActive = Boolean(isActive);
    if (displayOrder !== undefined) category.displayOrder = Number(displayOrder) || 0;
    if (seo) {
      category.seo = {
        metaTitle: seo.metaTitle !== undefined ? seo.metaTitle.trim() : (category.seo?.metaTitle || ""),
        metaDescription:
          seo.metaDescription !== undefined
            ? seo.metaDescription.trim()
            : (category.seo?.metaDescription || ""),
      };
    }

    await category.save();

    // 4. Cascade level updates to descendants if parent changed
    if (parentChanged) {
      try {
        await cascadeDescendantLevels(category._id, category.level);
      } catch (cascadeErr) {
        console.warn("Failed to cascade category descendant levels:", cascadeErr);
      }
    }

    // 5. Audit Log
    try {
      await AuditLog.create({
        actorId: user.id || user._id,
        actorEmail: user.email,
        action: "CATEGORY_UPDATE",
        resource: "Category",
        resourceId: String(category._id),
        details: {
          before: {
            name: beforeState.name,
            slug: beforeState.slug,
            parentId: beforeState.parentId,
            level: beforeState.level,
            isActive: beforeState.isActive,
            displayOrder: beforeState.displayOrder,
          },
          after: {
            name: category.name,
            slug: category.slug,
            parentId: category.parentId,
            level: category.level,
            isActive: category.isActive,
            displayOrder: category.displayOrder,
          },
        },
      });
    } catch (auditErr) {
      console.warn("Failed to record category update audit log:", auditErr);
    }

    return NextResponse.json({ success: true, data: category });
  } catch (err) {
    console.error(`PATCH /api/categories/[id] error:`, err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update category" },
      { status }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await assertPermission("categories.manage");
    await connectToDatabase();
    const { id } = await params;

    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Safe Deletion Guard 1: Subcategories check
    const childCount = await Category.countDocuments({ parentId: id });
    if (childCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete category: it has ${childCount} subcategory(s). Please reassign or delete its subcategories first.`,
        },
        { status: 400 }
      );
    }

    // Safe Deletion Guard 2: Active products check
    const productCount = await Product.countDocuments({
      categoryId: id,
      isDeleted: { $ne: true },
    });
    if (productCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete category: it is assigned to ${productCount} active product(s). Please reassign or remove these products first.`,
        },
        { status: 400 }
      );
    }

    // Constraints satisfied: delete category
    const deletedDoc = await Category.findByIdAndDelete(id);

    // Audit Log
    try {
      await AuditLog.create({
        actorId: user.id || user._id,
        actorEmail: user.email,
        action: "CATEGORY_DELETE",
        resource: "Category",
        resourceId: String(id),
        details: {
          before: {
            name: deletedDoc.name,
            slug: deletedDoc.slug,
            parentId: deletedDoc.parentId,
            level: deletedDoc.level,
            isActive: deletedDoc.isActive,
          },
        },
      });
    } catch (auditErr) {
      console.warn("Failed to record category delete audit log:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Category successfully deleted",
    });
  } catch (err) {
    console.error(`DELETE /api/categories/[id] error:`, err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete category" },
      { status }
    );
  }
}
