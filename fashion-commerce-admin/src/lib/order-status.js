/**
 * Canonical Order Lifecycle Status Machine & Configurations
 * VogueThreads Fashion E-Commerce Admin
 */

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PAID",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "FAILED",
  "RETURNED",
  "REFUNDED",
];

export const ORDER_STATUS_CONFIG = {
  PENDING_PAYMENT: {
    label: "Pending Payment",
    description: "Order placed, awaiting payment confirmation or COD validation",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    badgeVariant: "outline",
    step: 1,
    isTerminal: false,
  },
  CONFIRMED: {
    label: "Confirmed",
    description: "Order verified, stock reserved, ready for warehouse picking",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    badgeVariant: "outline",
    step: 2,
    isTerminal: false,
  },
  PAID: {
    label: "Paid",
    description: "Payment captured successfully, ready for warehouse processing",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    badgeVariant: "outline",
    step: 2,
    isTerminal: false,
  },
  PROCESSING: {
    label: "Processing",
    description: "Goods being picked and inspected in warehouse",
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    badgeVariant: "outline",
    step: 3,
    isTerminal: false,
  },
  PACKED: {
    label: "Packed",
    description: "Packed with invoice and shipping label attached",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    badgeVariant: "outline",
    step: 4,
    isTerminal: false,
  },
  SHIPPED: {
    label: "Shipped",
    description: "Dispatched with logistics carrier, in-transit",
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    badgeVariant: "outline",
    step: 5,
    isTerminal: false,
  },
  DELIVERED: {
    label: "Delivered",
    description: "Successfully delivered to customer address",
    color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    badgeVariant: "outline",
    step: 6,
    isTerminal: false,
  },
  CANCELLED: {
    label: "Cancelled",
    description: "Order cancelled, reserved inventory released back to sellable stock",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    badgeVariant: "outline",
    step: -1,
    isTerminal: true,
  },
  FAILED: {
    label: "Failed",
    description: "Payment or checkout execution failed",
    color: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    badgeVariant: "outline",
    step: -1,
    isTerminal: true,
  },
  RETURNED: {
    label: "Returned",
    description: "Customer return accepted; items inspected and optionally restocked",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    badgeVariant: "outline",
    step: 7,
    isTerminal: false,
  },
  REFUNDED: {
    label: "Refunded",
    description: "Total or partial refund credited back to original payment source",
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    badgeVariant: "outline",
    step: 8,
    isTerminal: true,
  },
};

/**
 * Valid transitions allowed in fashion commerce operations
 */
export const ALLOWED_TRANSITIONS = {
  PENDING_PAYMENT: ["CONFIRMED", "PAID", "CANCELLED", "FAILED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  RETURNED: ["REFUNDED"],
  CANCELLED: [],
  FAILED: [],
  REFUNDED: [],
};

/**
 * Check if transition from fromStatus to toStatus is valid
 */
export function canTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return false;

  const validNext = ALLOWED_TRANSITIONS[fromStatus] || [];
  return validNext.includes(toStatus);
}

/**
 * Return list of allowed next status values
 */
export function getNextAvailableStatuses(currentStatus) {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if an order can be cancelled
 */
export function isOrderCancellable(status) {
  // Can be cancelled at any point before dispatch (SHIPPED / DELIVERED)
  const nonCancellable = ["SHIPPED", "DELIVERED", "CANCELLED", "FAILED", "RETURNED", "REFUNDED"];
  return !nonCancellable.includes(status);
}

/**
 * Check if an order is eligible for return
 */
export function isOrderReturnable(status) {
  // Returns are valid once delivered or dispatched
  return status === "DELIVERED" || status === "SHIPPED";
}

/**
 * Check if an order can have a refund processed
 */
export function isOrderRefundable(orderStatus, paymentStatus) {
  if (paymentStatus === "REFUNDED") return false;
  if (orderStatus === "RETURNED" || orderStatus === "CANCELLED" || paymentStatus === "PAID" || paymentStatus === "CAPTURED") {
    return true;
  }
  return false;
}

/**
 * Safe accessor for status metadata
 */
export function getStatusConfig(status) {
  return (
    ORDER_STATUS_CONFIG[status] || {
      label: status || "Unknown",
      description: "",
      color: "bg-muted text-muted-foreground border-border",
      badgeVariant: "outline",
      step: 0,
      isTerminal: false,
    }
  );
}
