import Product from "@/models/Product";
import mongoose from "mongoose";

/**
 * Builds a valid MongoDB query filter from a list of structured collection rules.
 * @param {Array} rules Array of { field, operator, value }
 * @param {String} ruleMatchMode "ALL" or "ANY"
 * @returns {Object} MongoDB query filter object
 */
export function buildRuleQuery(rules = [], ruleMatchMode = "ALL") {
  if (!Array.isArray(rules) || rules.length === 0) {
    // If no rules defined, match nothing (or only un-deleted)
    return { _id: { $in: [] } };
  }

  const clauses = [];

  for (const rule of rules) {
    const { field, operator, value } = rule;
    if (!field || value === undefined || value === null || String(value).trim() === "") {
      continue;
    }

    const trimmedValue = String(value).trim();

    switch (field) {
      case "category": {
        try {
          const catId = new mongoose.Types.ObjectId(trimmedValue);
          if (operator === "NOT_EQUALS") {
            clauses.push({ categoryId: { $ne: catId } });
          } else {
            clauses.push({ categoryId: catId });
          }
        } catch {
          // If not a valid ObjectId, fallback to string match
          if (operator === "NOT_EQUALS") {
            clauses.push({ categoryId: { $ne: trimmedValue } });
          } else {
            clauses.push({ categoryId: trimmedValue });
          }
        }
        break;
      }

      case "brand": {
        try {
          const brandId = new mongoose.Types.ObjectId(trimmedValue);
          if (operator === "NOT_EQUALS") {
            clauses.push({ brandId: { $ne: brandId } });
          } else {
            clauses.push({ brandId: brandId });
          }
        } catch {
          if (operator === "NOT_EQUALS") {
            clauses.push({ brandId: { $ne: trimmedValue } });
          } else {
            clauses.push({ brandId: trimmedValue });
          }
        }
        break;
      }

      case "status": {
        if (operator === "NOT_EQUALS") {
          clauses.push({ status: { $ne: trimmedValue.toUpperCase() } });
        } else {
          clauses.push({ status: trimmedValue.toUpperCase() });
        }
        break;
      }

      case "price": {
        const numVal = parseFloat(trimmedValue) || 0;
        if (operator === "GREATER_THAN_OR_EQUAL") {
          clauses.push({ "variants.price": { $gte: numVal } });
        } else if (operator === "LESS_THAN_OR_EQUAL") {
          clauses.push({ "variants.price": { $lte: numVal } });
        } else {
          clauses.push({ "variants.price": numVal });
        }
        break;
      }

      case "tag": {
        clauses.push({ tags: { $regex: trimmedValue, $options: "i" } });
        break;
      }

      case "stock": {
        if (trimmedValue) {
          clauses.push({ "variants.availability": trimmedValue.toUpperCase() });
        }
        break;
      }

      default:
        break;
    }
  }

  if (clauses.length === 0) {
    return { _id: { $in: [] } };
  }

  if (ruleMatchMode === "ANY") {
    return {
      isDeleted: { $ne: true },
      $or: clauses,
    };
  } else {
    return {
      isDeleted: { $ne: true },
      $and: clauses,
    };
  }
}

/**
 * Computes dynamic product count for a collection document.
 * @param {Object} collection Collection document or lean object
 * @returns {Promise<Number>} Product count
 */
export async function countCollectionProducts(collection) {
  if (!collection) return 0;

  if (collection.type === "MANUAL") {
    if (!Array.isArray(collection.products) || collection.products.length === 0) {
      return 0;
    }
    const productIds = collection.products
      .map((p) => p.product?._id || p.product)
      .filter(Boolean);

    return await Product.countDocuments({
      _id: { $in: productIds },
      isDeleted: { $ne: true },
    });
  }

  if (collection.type === "RULE_BASED") {
    const query = buildRuleQuery(collection.rules, collection.ruleMatchMode);
    return await Product.countDocuments(query);
  }

  return 0;
}

/**
 * Resolves full product documents for a collection.
 * @param {Object} collection
 * @param {Object} options { limit: 50, page: 1 }
 * @returns {Promise<Array>} Resolved product array
 */
export async function resolveCollectionProducts(collection, options = { limit: 50, page: 1 }) {
  if (!collection) return [];
  const limit = options.limit || 50;
  const page = options.page || 1;
  const skip = (page - 1) * limit;

  if (collection.type === "MANUAL") {
    if (!Array.isArray(collection.products) || collection.products.length === 0) {
      return [];
    }

    const posMap = new Map();
    const productIds = [];

    collection.products.forEach((item, index) => {
      const pid = String(item.product?._id || item.product);
      if (pid) {
        productIds.push(pid);
        posMap.set(pid, item.position !== undefined ? item.position : index);
      }
    });

    const products = await Product.find({
      _id: { $in: productIds },
      isDeleted: { $ne: true },
    })
      .populate("categoryId", "name slug")
      .populate("brandId", "name slug")
      .lean();

    // Sort products by designated manual position
    const sorted = products.map((p) => ({
      ...p,
      position: posMap.get(String(p._id)) ?? 0,
    }));

    sorted.sort((a, b) => a.position - b.position);
    return sorted.slice(skip, skip + limit);
  }

  if (collection.type === "RULE_BASED") {
    const query = buildRuleQuery(collection.rules, collection.ruleMatchMode);
    return await Product.find(query)
      .populate("categoryId", "name slug")
      .populate("brandId", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  return [];
}
