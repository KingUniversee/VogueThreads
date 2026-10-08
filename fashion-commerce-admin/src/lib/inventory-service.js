import mongoose from "mongoose";
import { connectToDatabase } from "./mongoose";
import Inventory from "@/models/Inventory";
import InventoryTransaction from "@/models/InventoryTransaction";
import Product from "@/models/Product";
import AuditLog from "@/models/AuditLog";
import {
  getInventoryStatus,
  getCanonicalThreshold,
  calculateAvailableStock,
} from "./inventory-status";

/**
 * Idempotent self-healing sync: ensures every active product variant
 * has a corresponding document in the Inventory collection.
 */
export async function ensureInventoryForVariants() {
  await connectToDatabase();

  const products = await Product.find({ isDeleted: { $ne: true } })
    .select("_id title variants")
    .lean();

  const missingEntries = [];

  for (const product of products) {
    if (!product.variants || product.variants.length === 0) continue;

    for (const v of product.variants) {
      if (!v.sku) continue;
      const upperSku = v.sku.trim().toUpperCase();
      const existing = await Inventory.findOne({ variantSku: upperSku }).select("_id").lean();

      if (!existing) {
        missingEntries.push({
          variantSku: upperSku,
          productId: product._id,
          variantId: v.variantId || `var_${upperSku}`,
          onHand: v.cachedStock?.onHand || 0,
          reserved: v.cachedStock?.reserved || 0,
          available: v.cachedStock?.available || 0,
          lowStockThreshold: 5,
          warehouseLocation: "Main Warehouse",
        });
      }
    }
  }

  if (missingEntries.length > 0) {
    try {
      await Inventory.insertMany(missingEntries, { ordered: false });
    } catch (err) {
      // Ignore duplicate key races if another request also inserted
      if (err.code !== 11000) {
        console.warn("⚠️ [InventorySync] Partial insert warning:", err.message);
      }
    }
  }

  return missingEntries.length;
}

/**
 * Perform a concurrency-safe atomic inventory adjustment
 */
export async function adjustStock({
  sku,
  type,
  delta,
  quantity,
  mode = "INCREMENT", // "INCREMENT" or "SET"
  newQuantity,
  reason,
  referenceId = "",
  notes = "",
  actorId,
  actorEmail,
}) {
  if (!sku) {
    throw new Error("Variant SKU is required for stock adjustment");
  }

  const validTypes = [
    "RESTOCK",
    "DAMAGE_WRITE_OFF",
    "MANUAL_ADJUSTMENT",
    "PHYSICAL_AUDIT",
    "RETURN_RESTOCK",
    "SHRINKAGE",
    "CORRECTION",
    "ORDER_RESERVED",
    "ORDER_FULFILLED",
    "ORDER_CANCELLED",
  ];

  if (!type || !validTypes.includes(type)) {
    throw new Error(`Invalid adjustment type. Must be one of: ${validTypes.join(", ")}`);
  }

  if (!reason || !reason.trim()) {
    throw new Error("An adjustment reason is strictly required for audit compliance");
  }

  await connectToDatabase();
  const upperSku = sku.trim().toUpperCase();

  // Find the existing inventory record
  let inv = await Inventory.findOne({ variantSku: upperSku });
  if (!inv) {
    // Attempt auto-healing from product if it exists
    await ensureInventoryForVariants();
    inv = await Inventory.findOne({ variantSku: upperSku });
    if (!inv) {
      const err = new Error(`Inventory item for SKU '${upperSku}' not found`);
      err.status = 404;
      throw err;
    }
  }

  const currentOnHand = Number(inv.onHand) || 0;
  const currentReserved = Number(inv.reserved) || 0;
  const currentAvailable = Number(inv.available) || 0;

  let computedDelta = 0;
  let targetOnHand = currentOnHand;

  // Resolve input quantity safely
  const inputQuantity =
    quantity !== undefined && quantity !== null && String(quantity).trim() !== ""
      ? Number(quantity)
      : delta !== undefined && delta !== null && String(delta).trim() !== ""
      ? Number(delta)
      : undefined;

  switch (type) {
    case "RESTOCK": {
      if (inputQuantity === undefined || isNaN(inputQuantity)) {
        const err = new Error("Restock quantity is required");
        err.status = 400;
        throw err;
      }
      if (inputQuantity <= 0) {
        const err = new Error("Restock quantity must be positive.");
        err.status = 400;
        throw err;
      }
      computedDelta = Math.floor(inputQuantity);
      targetOnHand = currentOnHand + computedDelta;
      break;
    }

    case "RETURN_RESTOCK": {
      if (inputQuantity === undefined || isNaN(inputQuantity)) {
        const err = new Error("Return quantity is required");
        err.status = 400;
        throw err;
      }
      if (inputQuantity <= 0) {
        const err = new Error("Return quantity must be positive.");
        err.status = 400;
        throw err;
      }
      computedDelta = Math.floor(inputQuantity);
      targetOnHand = currentOnHand + computedDelta;
      break;
    }

    case "DAMAGE_WRITE_OFF": {
      if (inputQuantity === undefined || isNaN(inputQuantity)) {
        const err = new Error("Damaged units quantity is required");
        err.status = 400;
        throw err;
      }
      if (inputQuantity === 0) {
        const err = new Error("Damaged units must be greater than zero.");
        err.status = 400;
        throw err;
      }
      computedDelta = -Math.floor(Math.abs(inputQuantity));
      targetOnHand = currentOnHand + computedDelta;
      break;
    }

    case "SHRINKAGE": {
      if (inputQuantity === undefined || isNaN(inputQuantity)) {
        const err = new Error("Shrinkage units quantity is required");
        err.status = 400;
        throw err;
      }
      if (inputQuantity === 0) {
        const err = new Error("Shrinkage units must be greater than zero.");
        err.status = 400;
        throw err;
      }
      computedDelta = -Math.floor(Math.abs(inputQuantity));
      targetOnHand = currentOnHand + computedDelta;
      break;
    }

    case "PHYSICAL_AUDIT": {
      // Physical audit represents the counted quantity (exact count)
      const exactRaw =
        newQuantity !== undefined && newQuantity !== null && String(newQuantity).trim() !== ""
          ? Number(newQuantity)
          : inputQuantity;

      if (exactRaw === undefined || isNaN(exactRaw)) {
        const err = new Error("Physical counted quantity is required");
        err.status = 400;
        throw err;
      }
      if (exactRaw < 0) {
        const err = new Error("Physical count cannot be negative.");
        err.status = 400;
        throw err;
      }
      targetOnHand = Math.floor(exactRaw);
      computedDelta = targetOnHand - currentOnHand;
      break;
    }

    case "CORRECTION":
    case "MANUAL_ADJUSTMENT":
    default: {
      if (mode === "SET") {
        const exactRaw =
          newQuantity !== undefined && newQuantity !== null && String(newQuantity).trim() !== ""
            ? Number(newQuantity)
            : inputQuantity;

        if (exactRaw === undefined || isNaN(exactRaw)) {
          const err = new Error("New physical quantity must be a valid number");
          err.status = 400;
          throw err;
        }
        if (exactRaw < 0) {
          const err = new Error("New physical quantity cannot be negative.");
          err.status = 400;
          throw err;
        }
        targetOnHand = Math.floor(exactRaw);
        computedDelta = targetOnHand - currentOnHand;
      } else {
        // INCREMENT mode - supports signed delta
        if (inputQuantity === undefined || isNaN(inputQuantity)) {
          const err = new Error("Adjustment delta is required");
          err.status = 400;
          throw err;
        }
        if (inputQuantity === 0) {
          const err = new Error("Adjustment delta must be a non-zero number.");
          err.status = 400;
          throw err;
        }
        computedDelta = Math.floor(inputQuantity);
        targetOnHand = currentOnHand + computedDelta;
      }
      break;
    }
  }

  // Safety constraint: On-hand cannot be negative
  if (targetOnHand < 0) {
    const err = new Error(`Insufficient stock. Only ${currentOnHand} units are available.`);
    err.status = 400;
    throw err;
  }

  const targetAvailable = targetOnHand - currentReserved;

  // Backorder guard
  if (!inv.allowBackorder && targetAvailable < 0) {
    const err = new Error(
      `Cannot adjust stock: ${currentReserved} units are currently reserved for pending customer orders. Resulting available stock would be negative (${targetAvailable}).`
    );
    err.status = 400;
    throw err;
  }

  // Atomic update with optimistic lock condition on onHand
  const updatedInv = await Inventory.findOneAndUpdate(
    { _id: inv._id, onHand: currentOnHand },
    {
      $set: {
        onHand: targetOnHand,
        available: targetAvailable,
      },
    },
    { new: true }
  );

  if (!updatedInv) {
    // Concurrency collision occurred: concurrent modification
    const err = new Error("Inventory was modified by another operation. Please reload and try again.");
    err.status = 409;
    throw err;
  }

  // Determine variant availability enum using canonical logic
  const threshold = getCanonicalThreshold(updatedInv);
  const newAvailability = getInventoryStatus(targetAvailable, threshold);

  // Synchronize Product.variants cached stock
  try {
    await Product.updateOne(
      { _id: updatedInv.productId, "variants.sku": upperSku },
      {
        $set: {
          "variants.$.cachedStock.onHand": targetOnHand,
          "variants.$.cachedStock.reserved": currentReserved,
          "variants.$.cachedStock.available": targetAvailable,
          "variants.$.availability": newAvailability,
        },
      }
    );
  } catch (syncErr) {
    console.warn("⚠️ [InventorySync] Product variant sync warning:", syncErr.message);
  }

  // Create immutable double-entry transaction record
  const transaction = await InventoryTransaction.create({
    variantSku: upperSku,
    productId: updatedInv.productId,
    variantId: updatedInv.variantId,
    type,
    delta: computedDelta,
    quantityChange: computedDelta,
    previousQuantity: currentOnHand,
    newQuantity: targetOnHand,
    previousOnHand: currentOnHand,
    newOnHand: targetOnHand,
    previousAvailable: currentAvailable,
    newAvailable: targetAvailable,
    reason: reason.trim(),
    referenceId: referenceId ? referenceId.trim().toUpperCase() : undefined,
    actorId: actorId ? new mongoose.Types.ObjectId(actorId) : undefined,
    actorEmail: actorEmail || "system@voguethreads.internal",
    notes: notes ? notes.trim() : undefined,
  });

  // Record administrative Audit Log
  try {
    await AuditLog.create({
      actorId: actorId ? new mongoose.Types.ObjectId(actorId) : undefined,
      actorEmail: actorEmail || "system@voguethreads.internal",
      action: "INVENTORY_ADJUST",
      resource: "Inventory",
      resourceId: String(updatedInv._id),
      details: {
        sku: upperSku,
        type,
        delta: computedDelta,
        before: { onHand: currentOnHand, available: currentAvailable },
        after: { onHand: targetOnHand, available: targetAvailable },
        reason: reason.trim(),
        referenceId: referenceId || null,
        transactionId: String(transaction._id),
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Warning logging inventory adjustment:", auditErr.message);
  }

  return { inventory: updatedInv, transaction };
}

/**
 * Update low-stock threshold for a variant SKU
 */
export async function setVariantThreshold({ sku, threshold, actorId, actorEmail }) {
  if (!sku) throw new Error("Variant SKU is required");
  const numThreshold = Math.max(0, Math.floor(Number(threshold)));

  await connectToDatabase();
  const upperSku = sku.trim().toUpperCase();

  const inv = await Inventory.findOne({ variantSku: upperSku });
  if (!inv) {
    const err = new Error(`Inventory item for SKU '${upperSku}' not found`);
    err.status = 404;
    throw err;
  }

  const oldThreshold = inv.lowStockThreshold ?? 5;
  inv.lowStockThreshold = numThreshold;
  await inv.save();

  // Re-evaluate product availability
  let newAvailability = "IN_STOCK";
  if (inv.available <= 0) {
    newAvailability = "OUT_OF_STOCK";
  } else if (inv.available <= numThreshold) {
    newAvailability = "LOW_STOCK";
  }

  try {
    await Product.updateOne(
      { _id: inv.productId, "variants.sku": upperSku },
      { $set: { "variants.$.availability": newAvailability } }
    );
  } catch (err) {
    // Non-critical
  }

  try {
    await AuditLog.create({
      actorId: actorId ? new mongoose.Types.ObjectId(actorId) : undefined,
      actorEmail: actorEmail || "system@voguethreads.internal",
      action: "INVENTORY_THRESHOLD_UPDATE",
      resource: "Inventory",
      resourceId: String(inv._id),
      details: {
        sku: upperSku,
        previousThreshold: oldThreshold,
        newThreshold: numThreshold,
      },
    });
  } catch (auditErr) {
    // Non-critical
  }

  return inv;
}

/**
 * Calculate live inventory telemetry summary
 */
export async function getInventoryMetrics() {
  await connectToDatabase();

  const agg = await Inventory.aggregate([
    {
      $group: {
        _id: null,
        totalSkus: { $sum: 1 },
        totalOnHand: { $sum: "$onHand" },
        totalReserved: { $sum: "$reserved" },
        totalAvailable: { $sum: "$available" },
        outOfStockCount: {
          $sum: { $cond: [{ $lte: ["$available", 0] }, 1, 0] },
        },
        lowStockCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ["$available", 0] },
                  { $lte: ["$available", "$lowStockThreshold"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        inStockCount: {
          $sum: {
            $cond: [{ $gt: ["$available", "$lowStockThreshold"] }, 1, 0],
          },
        },
        criticalCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ["$available", 0] },
                  { $lte: ["$available", 2] },
                  { $lte: ["$available", "$lowStockThreshold"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const stats = agg[0] || {
    totalSkus: 0,
    totalOnHand: 0,
    totalReserved: 0,
    totalAvailable: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    criticalCount: 0,
    inStockCount: 0,
  };

  delete stats._id;
  stats.totalAlerts = (stats.outOfStockCount || 0) + (stats.lowStockCount || 0);
  return stats;
}
