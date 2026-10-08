/**
 * Canonical Single Source of Truth for Inventory Stock Status and Threshold Logic.
 * Used across API routes, background services, and React UI components.
 */

/**
 * Standard Status Enums
 */
export const INVENTORY_STATUS = {
  IN_STOCK: "IN_STOCK",
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
};

export const URGENCY_LEVEL = {
  IN_STOCK: "IN_STOCK",
  LOW_STOCK: "LOW_STOCK",
  CRITICAL: "CRITICAL",
  OUT_OF_STOCK: "OUT_OF_STOCK",
};

/**
 * Calculate available stock from on-hand and reserved quantities.
 * Formula: availableQuantity = stockQuantity - reservedQuantity
 *
 * @param {number} onHand - Physical stock count
 * @param {number} reserved - Reserved units held for pending orders
 * @returns {number}
 */
export function calculateAvailableStock(onHand, reserved = 0) {
  const physical = Math.max(0, Number(onHand) || 0);
  const holds = Math.max(0, Number(reserved) || 0);
  return physical - holds;
}

/**
 * Extract canonical threshold safely from a number or inventory item object.
 * Priority: lowStockThreshold -> safetyThreshold -> threshold -> default (5)
 *
 * @param {number|object} itemOrThreshold
 * @returns {number}
 */
export function getCanonicalThreshold(itemOrThreshold) {
  if (typeof itemOrThreshold === "number" && !isNaN(itemOrThreshold)) {
    return Math.max(0, itemOrThreshold);
  }
  if (!itemOrThreshold || typeof itemOrThreshold !== "object") {
    return 5;
  }
  const val =
    itemOrThreshold.lowStockThreshold ??
    itemOrThreshold.safetyThreshold ??
    itemOrThreshold.threshold ??
    5;
  const num = Number(val);
  return isNaN(num) ? 5 : Math.max(0, num);
}

/**
 * Calculate high-level inventory status:
 * - OUT_OF_STOCK: availableQuantity <= 0
 * - LOW_STOCK: availableQuantity > 0 && availableQuantity <= lowStockThreshold
 * - IN_STOCK: availableQuantity > lowStockThreshold
 *
 * @param {number} available
 * @param {number|object} threshold
 * @returns {"IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"}
 */
export function getInventoryStatus(available, threshold = 5) {
  const avail = Number(available) || 0;
  const thresh = getCanonicalThreshold(threshold);

  if (avail <= 0) {
    return INVENTORY_STATUS.OUT_OF_STOCK;
  }
  if (avail <= thresh) {
    return INVENTORY_STATUS.LOW_STOCK;
  }
  return INVENTORY_STATUS.IN_STOCK;
}

/**
 * Check if a variant meets low-stock alert condition:
 * availableQuantity <= lowStockThreshold AND availableQuantity > 0
 *
 * @param {number} available
 * @param {number|object} threshold
 * @returns {boolean}
 */
export function isLowStock(available, threshold = 5) {
  const avail = Number(available) || 0;
  const thresh = getCanonicalThreshold(threshold);
  return avail > 0 && avail <= thresh;
}

/**
 * Check if a variant is Out of Stock:
 * availableQuantity <= 0
 *
 * @param {number} available
 * @returns {boolean}
 */
export function isOutOfStock(available) {
  const avail = Number(available) || 0;
  return avail <= 0;
}

/**
 * Check if a variant is In Stock:
 * availableQuantity > lowStockThreshold
 *
 * @param {number} available
 * @param {number|object} threshold
 * @returns {boolean}
 */
export function isInStock(available, threshold = 5) {
  const avail = Number(available) || 0;
  const thresh = getCanonicalThreshold(threshold);
  return avail > thresh;
}

/**
 * Determine urgency level for low-stock / triage alerts:
 * - OUT_OF_STOCK: available <= 0
 * - CRITICAL: available > 0 && available <= 2 && available <= threshold
 * - LOW_STOCK: available > 0 && available <= threshold
 * - IN_STOCK: available > threshold (not an alert)
 *
 * @param {number} available
 * @param {number|object} threshold
 * @returns {"OUT_OF_STOCK" | "CRITICAL" | "LOW_STOCK" | "IN_STOCK"}
 */
export function getUrgencyLevel(available, threshold = 5) {
  const avail = Number(available) || 0;
  const thresh = getCanonicalThreshold(threshold);

  if (avail <= 0) {
    return URGENCY_LEVEL.OUT_OF_STOCK;
  }
  if (avail <= 2 && avail <= thresh) {
    return URGENCY_LEVEL.CRITICAL;
  }
  if (avail <= thresh) {
    return URGENCY_LEVEL.LOW_STOCK;
  }
  return URGENCY_LEVEL.IN_STOCK;
}

/**
 * Check if a variant is a safety alert (Out of stock or Low stock):
 * availableQuantity <= lowStockThreshold
 *
 * @param {number} available
 * @param {number|object} threshold
 * @returns {boolean}
 */
export function isSafetyAlert(available, threshold = 5) {
  const avail = Number(available) || 0;
  const thresh = getCanonicalThreshold(threshold);
  return avail <= thresh;
}
