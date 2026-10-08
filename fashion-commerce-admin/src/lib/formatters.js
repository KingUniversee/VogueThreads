/**
 * Format numeric value to Indian Rupee currency format (e.g. ₹1,49,999.00)
 */
export function formatINR(amount, includeDecimals = true) {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0.00";
  const num = Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(num);
}

/**
 * Format standard number with Indian numbering commas (e.g. 1,49,999)
 */
export function formatNumberIN(num) {
  if (num === undefined || num === null || isNaN(num)) return "0";
  return new Intl.NumberFormat("en-IN").format(Number(num));
}

/**
 * Format percentage change (e.g. +12.4%)
 */
export function formatPercent(value) {
  if (value === undefined || value === null || isNaN(value)) return "0%";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${Number(value).toFixed(1)}%`;
}

/**
 * Format standard readable dates
 */
export function formatDate(dateString, options = {}) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: options.shortMonth ? "short" : "long",
    year: "numeric",
    hour: options.includeTime ? "2-digit" : undefined,
    minute: options.includeTime ? "2-digit" : undefined,
    hour12: true,
  }).format(date);
}

/**
 * Validates 6-digit Indian PIN code
 */
export function isValidPinCode(pin) {
  return /^[1-9][0-9]{5}$/.test(String(pin).trim());
}

/**
 * Validates 10-digit Indian Mobile Number
 */
export function isValidIndianMobile(phone) {
  return /^(?:(?:\+|0{0,2})91(\s*[-]\s*)?|[0]?)?[6789]\d{9}$/.test(String(phone).trim());
}
