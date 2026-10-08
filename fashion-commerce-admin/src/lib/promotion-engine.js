import mongoose from "mongoose";
import { connectToDatabase } from "./mongoose.js";
import Coupon from "../models/Coupon.js";
import Discount from "../models/Discount.js";
import Order from "../models/Order.js";
import Customer from "../models/Customer.js";
import Segment from "../models/Segment.js";
import Product from "../models/Product.js";
import { doesCustomerMatchSegment } from "./segment-service.js";
import { getCustomerPurchasingMetrics } from "./customer-service.js";

/**
 * Validate and calculate discount for a coupon promo code against cart items and customer profile.
 */
export async function validateAndCalculateCoupon({
  code,
  cartItems = [],
  customer = null,
  customerId = null,
  customerEmail = null,
  orderSubtotal = null,
}) {
  if (!code || typeof code !== "string" || !code.trim()) {
    return { valid: false, reason: "Coupon code is required." };
  }

  await connectToDatabase();

  const normalizedCode = code.trim().toUpperCase();
  const coupon = await Coupon.findOne({ normalizedCode }).lean();

  if (!coupon) {
    return { valid: false, reason: `Coupon code '${code}' is invalid.` };
  }

  // 1. Status Check
  if (coupon.status !== "ACTIVE") {
    return {
      valid: false,
      reason: `Coupon '${coupon.code}' is currently ${coupon.status.toLowerCase()}.`,
    };
  }

  const now = new Date();

  // 2. Scheduling Windows
  if (coupon.startAt && new Date(coupon.startAt) > now) {
    return {
      valid: false,
      reason: `Coupon '${coupon.code}' promotion will begin on ${new Date(coupon.startAt).toLocaleDateString("en-IN")}.`,
    };
  }

  if (coupon.endAt && new Date(coupon.endAt) < now) {
    return {
      valid: false,
      reason: `Coupon '${coupon.code}' has expired.`,
    };
  }

  // 3. Global Usage Limit Check
  if (coupon.usageLimit != null && Number(coupon.usageCount) >= Number(coupon.usageLimit)) {
    return {
      valid: false,
      reason: `Coupon '${coupon.code}' has reached its maximum total redemptions.`,
    };
  }

  // 4. Resolve Customer Profile & Email
  const resolvedEmail = customerEmail || customer?.email || customer?.customerDetails?.email || null;
  const resolvedCustomerId = customerId || customer?._id || customer?.id || null;

  // 5. Customer Restrictions: First Order Only
  if (coupon.firstOrderOnly) {
    if (!resolvedEmail && !resolvedCustomerId) {
      return {
        valid: false,
        reason: "Customer sign-in or email is required to verify first-order eligibility.",
      };
    }

    const orderQuery = {
      status: { $nin: ["CANCELLED", "FAILED"] },
    };

    if (resolvedCustomerId && resolvedEmail) {
      orderQuery.$or = [{ customerId: resolvedCustomerId }, { "customerDetails.email": resolvedEmail.toLowerCase().trim() }];
    } else if (resolvedCustomerId) {
      orderQuery.customerId = resolvedCustomerId;
    } else {
      orderQuery["customerDetails.email"] = resolvedEmail.toLowerCase().trim();
    }

    const pastOrdersCount = await Order.countDocuments(orderQuery);
    if (pastOrdersCount > 0) {
      return {
        valid: false,
        reason: `Coupon '${coupon.code}' is valid for first-time buyers only.`,
      };
    }
  }

  // 6. Per-Customer Usage Limit Check
  if (coupon.perCustomerUsageLimit != null && (resolvedEmail || resolvedCustomerId)) {
    const customerUsageQuery = {
      "pricing.couponCode": coupon.normalizedCode,
      status: { $nin: ["CANCELLED", "FAILED"] },
    };

    if (resolvedCustomerId && resolvedEmail) {
      customerUsageQuery.$or = [
        { customerId: resolvedCustomerId },
        { "customerDetails.email": resolvedEmail.toLowerCase().trim() },
      ];
    } else if (resolvedCustomerId) {
      customerUsageQuery.customerId = resolvedCustomerId;
    } else {
      customerUsageQuery["customerDetails.email"] = resolvedEmail.toLowerCase().trim();
    }

    const customerUsageCount = await Order.countDocuments(customerUsageQuery);
    if (customerUsageCount >= coupon.perCustomerUsageLimit) {
      return {
        valid: false,
        reason: `You have reached the limit of ${coupon.perCustomerUsageLimit} redemption(s) for coupon '${coupon.code}'.`,
      };
    }
  }

  // 7. Customer Segment Restrictions
  if (coupon.applicableCustomerSegments && coupon.applicableCustomerSegments.length > 0) {
    let customerDoc = null;
    if (resolvedCustomerId) {
      customerDoc = await Customer.findById(resolvedCustomerId);
    } else if (resolvedEmail) {
      customerDoc = await Customer.findOne({ email: resolvedEmail.toLowerCase().trim() });
    }

    if (!customerDoc) {
      return {
        valid: false,
        reason: "This coupon is restricted to specific customer segments.",
      };
    }

    const metrics = await getCustomerPurchasingMetrics(customerDoc._id);
    let matchedAnySegment = false;

    for (const segmentId of coupon.applicableCustomerSegments) {
      const seg = await Segment.findById(segmentId).lean();
      if (seg && doesCustomerMatchSegment(customerDoc, seg, metrics)) {
        matchedAnySegment = true;
        break;
      }
    }

    if (!matchedAnySegment) {
      return {
        valid: false,
        reason: "You are not eligible for this targeted segment coupon.",
      };
    }
  }

  // 8. Target Inclusions (Products, Categories, Collections) & Subtotal
  let cartSubtotal = 0;
  let eligibleSubtotal = 0;
  let hasItemRestrictions =
    (coupon.applicableProducts && coupon.applicableProducts.length > 0) ||
    (coupon.applicableCategories && coupon.applicableCategories.length > 0) ||
    (coupon.applicableCollections && coupon.applicableCollections.length > 0);

  if (cartItems.length > 0) {
    const applicableProductIds = (coupon.applicableProducts || []).map((id) => String(id));
    const applicableCategoryIds = (coupon.applicableCategories || []).map((id) => String(id));
    const applicableCollectionIds = (coupon.applicableCollections || []).map((id) => String(id));

    for (const item of cartItems) {
      const itemSubtotal = Number(item.subtotal || (Number(item.unitPrice || 0) * Number(item.quantity || 1))) || 0;
      cartSubtotal += itemSubtotal;

      if (!hasItemRestrictions) {
        eligibleSubtotal += itemSubtotal;
      } else {
        let isEligible = false;

        // Check Product ID
        if (item.productId && applicableProductIds.includes(String(item.productId))) {
          isEligible = true;
        }

        // Check Category ID
        if (!isEligible && item.categoryId && applicableCategoryIds.includes(String(item.categoryId))) {
          isEligible = true;
        }

        // Check Collection ID
        if (!isEligible && item.collectionIds && Array.isArray(item.collectionIds)) {
          if (item.collectionIds.some((cid) => applicableCollectionIds.includes(String(cid)))) {
            isEligible = true;
          }
        }

        if (isEligible) {
          eligibleSubtotal += itemSubtotal;
        }
      }
    }
  } else {
    // If only orderSubtotal was passed
    cartSubtotal = Number(orderSubtotal) || 0;
    eligibleSubtotal = hasItemRestrictions ? 0 : cartSubtotal;
  }

  if (hasItemRestrictions && eligibleSubtotal <= 0) {
    return {
      valid: false,
      reason: `Coupon '${coupon.code}' is not applicable to any items in your cart.`,
    };
  }

  // 9. Minimum Order Value Check
  const effectiveSubtotalForMinOrder = hasItemRestrictions ? eligibleSubtotal : cartSubtotal;
  if (coupon.minimumOrderValue > 0 && effectiveSubtotalForMinOrder < coupon.minimumOrderValue) {
    return {
      valid: false,
      reason: `Minimum cart value of ₹${coupon.minimumOrderValue.toLocaleString("en-IN")} required to use '${coupon.code}'.`,
    };
  }

  // 10. Compute Authoritative Discount Amount
  let rawDiscount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    rawDiscount = (eligibleSubtotal * Number(coupon.discountValue)) / 100;
    if (coupon.maximumDiscountAmount != null && Number(coupon.maximumDiscountAmount) > 0) {
      rawDiscount = Math.min(rawDiscount, Number(coupon.maximumDiscountAmount));
    }
  } else {
    // FIXED amount
    rawDiscount = Math.min(Number(coupon.discountValue), eligibleSubtotal);
  }

  const discountAmount = Math.max(0, Number(rawDiscount.toFixed(2)));

  const promotionSnapshot = {
    couponId: coupon._id,
    couponCode: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
    name: coupon.description || `Coupon ${coupon.code}`,
    ruleSummary:
      coupon.discountType === "PERCENTAGE"
        ? `${coupon.discountValue}% OFF` + (coupon.maximumDiscountAmount ? ` (Max ₹${coupon.maximumDiscountAmount})` : "")
        : `₹${coupon.discountValue} FLAT OFF`,
    appliedAt: new Date(),
  };

  return {
    valid: true,
    coupon,
    discountAmount,
    eligibleSubtotal,
    cartSubtotal,
    promotionSnapshot,
  };
}

/**
 * Deterministically evaluate all active automatic store promotions for a cart.
 */
export async function evaluateAutomaticDiscounts({
  cartItems = [],
  customer = null,
  customerId = null,
  customerEmail = null,
  orderSubtotal = null,
}) {
  await connectToDatabase();

  const now = new Date();
  const discounts = await Discount.find({
    status: "ACTIVE",
    startAt: { $lte: now },
    $or: [{ endAt: null }, { endAt: { $gte: now } }],
  })
    .sort({ priority: 1, createdAt: 1 })
    .lean();

  if (!discounts || discounts.length === 0) {
    return { appliedDiscounts: [], totalDiscountAmount: 0 };
  }

  const resolvedEmail = customerEmail || customer?.email || null;
  const resolvedCustomerId = customerId || customer?._id || null;

  let totalCartSubtotal = 0;
  if (cartItems.length > 0) {
    totalCartSubtotal = cartItems.reduce((acc, it) => acc + (Number(it.subtotal || it.unitPrice * it.quantity) || 0), 0);
  } else {
    totalCartSubtotal = Number(orderSubtotal) || 0;
  }

  let customerDoc = null;
  let customerMetrics = null;

  const appliedDiscounts = [];
  let totalDiscountAmount = 0;
  let hasExclusive = false;

  for (const disc of discounts) {
    if (hasExclusive) break;

    // Segment restriction
    if (disc.applicableCustomerSegments && disc.applicableCustomerSegments.length > 0) {
      if (!customerDoc) {
        if (resolvedCustomerId) customerDoc = await Customer.findById(resolvedCustomerId);
        else if (resolvedEmail) customerDoc = await Customer.findOne({ email: resolvedEmail.toLowerCase().trim() });
      }

      if (!customerDoc) continue;

      if (!customerMetrics) {
        customerMetrics = await getCustomerPurchasingMetrics(customerDoc._id);
      }

      let matched = false;
      for (const segId of disc.applicableCustomerSegments) {
        const seg = await Segment.findById(segId).lean();
        if (seg && doesCustomerMatchSegment(customerDoc, seg, customerMetrics)) {
          matched = true;
          break;
        }
      }
      if (!matched) continue;
    }

    // Item targeting check
    let eligibleSubtotal = 0;
    const hasItemRestrictions =
      (disc.applicableProducts && disc.applicableProducts.length > 0) ||
      (disc.applicableCategories && disc.applicableCategories.length > 0) ||
      (disc.applicableCollections && disc.applicableCollections.length > 0);

    if (cartItems.length > 0) {
      const prodIds = (disc.applicableProducts || []).map(String);
      const catIds = (disc.applicableCategories || []).map(String);
      const colIds = (disc.applicableCollections || []).map(String);

      for (const it of cartItems) {
        const itemSubtotal = Number(it.subtotal || it.unitPrice * it.quantity) || 0;
        if (!hasItemRestrictions) {
          eligibleSubtotal += itemSubtotal;
        } else {
          let eligible = false;
          if (it.productId && prodIds.includes(String(it.productId))) eligible = true;
          if (!eligible && it.categoryId && catIds.includes(String(it.categoryId))) eligible = true;
          if (!eligible && it.collectionIds && it.collectionIds.some((c) => colIds.includes(String(c)))) eligible = true;

          if (eligible) eligibleSubtotal += itemSubtotal;
        }
      }
    } else {
      eligibleSubtotal = hasItemRestrictions ? 0 : totalCartSubtotal;
    }

    if (hasItemRestrictions && eligibleSubtotal <= 0) continue;

    // Minimum order value
    if (disc.minimumOrderValue > 0 && eligibleSubtotal < disc.minimumOrderValue) continue;

    // Calculate discount amount
    let rawAmount = 0;
    if (disc.discountType === "PERCENTAGE") {
      rawAmount = (eligibleSubtotal * Number(disc.discountValue)) / 100;
      if (disc.maximumDiscountAmount != null && Number(disc.maximumDiscountAmount) > 0) {
        rawAmount = Math.min(rawAmount, Number(disc.maximumDiscountAmount));
      }
    } else {
      rawAmount = Math.min(Number(disc.discountValue), eligibleSubtotal);
    }

    // Ensure we don't exceed remaining subtotal
    const remainingEligible = Math.max(0, totalCartSubtotal - totalDiscountAmount);
    const finalAmount = Number(Math.min(rawAmount, remainingEligible).toFixed(2));

    if (finalAmount > 0) {
      appliedDiscounts.push({
        discountId: disc._id,
        name: disc.name,
        discountType: disc.discountType,
        discountValue: disc.discountValue,
        discountAmount: finalAmount,
      });

      totalDiscountAmount += finalAmount;

      if (disc.stacking === "EXCLUSIVE") {
        hasExclusive = true;
      }
    }
  }

  return {
    appliedDiscounts,
    totalDiscountAmount: Number(totalDiscountAmount.toFixed(2)),
  };
}
