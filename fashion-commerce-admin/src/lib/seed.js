import fs from "fs";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Role from "../models/Role.js";
import Permission from "../models/Permission.js";
import User from "../models/User.js";
import Setting from "../models/Setting.js";

// Automatically load .env.local for standalone seed execution in Node 20+
try {
  if (typeof process.loadEnvFile === "function") {
    if (fs.existsSync(".env.local")) {
      process.loadEnvFile(".env.local");
    } else if (fs.existsSync(".env")) {
      process.loadEnvFile(".env");
    }
  }
} catch (envErr) {
  // Environment variables might already be injected by runtime
}

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/fashion_commerce_admin";
const SEED_EMAIL = process.env.ADMIN_SEED_EMAIL || "admin@voguethreads.in";
const SEED_PASSWORD = process.env.ADMIN_SEED_PASSWORD;

export const DEFAULT_PERMISSIONS = [
  // Catalog
  { code: "products.read", name: "Read Products", category: "CATALOG", description: "View products and variants" },
  { code: "products.create", name: "Create Products", category: "CATALOG", description: "Create products and variants" },
  { code: "products.update", name: "Update Products", category: "CATALOG", description: "Edit products, prices, and variants" },
  { code: "products.delete", name: "Delete Products", category: "CATALOG", description: "Archive or delete products" },
  { code: "categories.manage", name: "Manage Categories", category: "CATALOG", description: "Create and edit category tree" },
  { code: "collections.manage", name: "Manage Collections", category: "CATALOG", description: "Create and edit collections" },
  { code: "brands.manage", name: "Manage Brands", category: "CATALOG", description: "Manage brand registry" },
  { code: "attributes.manage", name: "Manage Attributes", category: "CATALOG", description: "Manage fashion attributes" },

  // Inventory
  { code: "inventory.read", name: "Read Inventory", category: "INVENTORY", description: "View variant stock levels" },
  { code: "inventory.adjust", name: "Adjust Stock", category: "INVENTORY", description: "Perform manual stock adjustments" },

  // Orders
  { code: "orders.read", name: "Read Orders", category: "ORDERS", description: "View customer orders and history" },
  { code: "orders.update", name: "Update Orders", category: "ORDERS", description: "Change order status and tracking" },
  { code: "orders.refund", name: "Process Refunds", category: "ORDERS", description: "Approve and issue refunds" },
  { code: "returns.manage", name: "Manage Returns", category: "ORDERS", description: "Approve and inspect returns" },

  // Customers
  { code: "customers.read", name: "Read Customers", category: "CUSTOMERS", description: "View customer directory and LTV" },
  { code: "customers.update", name: "Update Customers", category: "CUSTOMERS", description: "Edit customer accounts & segments" },
  { code: "reviews.moderate", name: "Moderate Reviews", category: "CUSTOMERS", description: "Approve or reject customer reviews" },

  // Marketing
  { code: "marketing.manage", name: "Manage Marketing", category: "MARKETING", description: "Full marketing administration" },
  { code: "coupons.read", name: "Read Coupons", category: "MARKETING", description: "View coupon codes and redemptions" },
  { code: "coupons.create", name: "Create Coupons", category: "MARKETING", description: "Create new coupon promo codes" },
  { code: "coupons.update", name: "Update Coupons", category: "MARKETING", description: "Edit coupon rules and limits" },
  { code: "coupons.archive", name: "Archive Coupons", category: "MARKETING", description: "Archive or delete coupons" },
  { code: "discounts.read", name: "Read Discounts", category: "MARKETING", description: "View automatic store promotions" },
  { code: "discounts.create", name: "Create Discounts", category: "MARKETING", description: "Create automatic store discounts" },
  { code: "discounts.update", name: "Update Discounts", category: "MARKETING", description: "Edit automatic discount rules" },
  { code: "discounts.archive", name: "Archive Discounts", category: "MARKETING", description: "Archive or delete discounts" },

  // Content
  { code: "content.manage", name: "Manage CMS", category: "CONTENT", description: "Edit homepage layout, pages, and menus" },

  // Analytics
  { code: "analytics.read", name: "Read Analytics", category: "ANALYTICS", description: "View sales, financial, and product reports" },
  { code: "analytics.overview", name: "Executive Overview", category: "ANALYTICS", description: "View executive dashboard KPIs and trends" },
  { code: "analytics.sales", name: "Sales Reports", category: "ANALYTICS", description: "Inspect revenue, refunds, and payment channels" },
  { code: "analytics.products", name: "Product Analytics", category: "ANALYTICS", description: "Analyze product velocity and inventory risk" },
  { code: "analytics.customers", name: "Customer Analytics", category: "ANALYTICS", description: "Inspect customer cohorts and LTV" },
  { code: "analytics.conversion", name: "Conversion Funnel", category: "ANALYTICS", description: "View commerce conversion metrics" },

  // System
  { code: "users.manage", name: "Manage Admin Users", category: "SYSTEM", description: "Create and manage staff accounts" },
  { code: "roles.manage", name: "Manage Roles & RBAC", category: "SYSTEM", description: "Configure roles and permissions" },
  { code: "audit.read", name: "Read Audit Logs", category: "SYSTEM", description: "Inspect administrative action trail" },
  { code: "settings.manage", name: "Manage Settings", category: "SYSTEM", description: "Update store, tax, payment, and courier settings" },
  { code: "security.manage", name: "Manage Security", category: "SYSTEM", description: "Configure sessions, MFA, and access control" },
];

export const DEFAULT_ROLES = [
  {
    name: "Super Admin",
    slug: "super-admin",
    description: "Full, unrestricted access to all commerce operations, finance, and system settings.",
    isSystem: true,
    permissions: DEFAULT_PERMISSIONS.map((p) => p.code),
  },
  {
    name: "Store Manager",
    slug: "store-manager",
    description: "Oversees catalog, inventory, orders, marketing, and customer support.",
    isSystem: false,
    permissions: DEFAULT_PERMISSIONS.filter(
      (p) => !p.code.startsWith("users.") && !p.code.startsWith("roles.") && !p.code.startsWith("security.")
    ).map((p) => p.code),
  },
  {
    name: "Order Manager",
    slug: "order-manager",
    description: "Handles order fulfillment, shipping dispatch, returns, and delivery tracking.",
    isSystem: false,
    permissions: [
      "orders.read",
      "orders.update",
      "returns.manage",
      "inventory.read",
      "customers.read",
    ],
  },
  {
    name: "Product Manager",
    slug: "product-manager",
    description: "Manages apparel catalog, Color × Size variant matrices, categories, and attributes.",
    isSystem: false,
    permissions: [
      "products.read",
      "products.create",
      "products.update",
      "categories.manage",
      "collections.manage",
      "brands.manage",
      "attributes.manage",
      "inventory.read",
    ],
  },
  {
    name: "Support Specialist",
    slug: "support",
    description: "Customer service executive handling customer inquiries, returns, and reviews.",
    isSystem: false,
    permissions: [
      "orders.read",
      "customers.read",
      "returns.manage",
      "reviews.moderate",
    ],
  },
];

export async function seedDatabase() {
  if (!SEED_PASSWORD) {
    throw new Error(
      "ADMIN_SEED_PASSWORD environment variable is required to seed the Super Admin account."
    );
  }

  const maskedUri = DATABASE_URL.replace(/:\/\/.*@/, "://***:***@");
  console.log(`🌱 [Seed] Connecting to database: ${maskedUri}`);

  await mongoose.connect(DATABASE_URL);

  console.log("🌱 [Seed] Synchronizing permissions catalog...");
  for (const perm of DEFAULT_PERMISSIONS) {
    await Permission.findOneAndUpdate({ code: perm.code }, perm, { upsert: true, new: true });
  }

  console.log("🌱 [Seed] Synchronizing enterprise roles...");
  const roleMap = {};
  for (const roleData of DEFAULT_ROLES) {
    const roleDoc = await Role.findOneAndUpdate(
      { slug: roleData.slug },
      roleData,
      { upsert: true, new: true }
    );
    roleMap[roleData.slug] = roleDoc._id;
  }

  console.log("🌱 [Seed] Initializing store settings...");
  await Setting.findOneAndUpdate(
    {},
    {
      "store.name": "VogueThreads Enterprise",
      "store.legalEntity": "VogueThreads Fashion Retail Pvt. Ltd.",
      "store.email": "support@voguethreads.in",
      "store.phone": "+91 98765 43210",
      "store.currency": "INR",
      "tax.gstin": "27AAAAA0000A1Z5",
      "tax.registeredState": "Maharashtra",
      "tax.registeredStateCode": "27",
      "tax.defaultHsnCode": "6109",
      "tax.defaultGstRate": 5,
      "shipping.defaultCourier": "DELHIVERY",
      "shipping.freeShippingThreshold": 999,
      "payments.codEnabled": true,
      "payments.razorpayEnabled": true,
    },
    { upsert: true, new: true }
  );

  console.log("🌱 [Seed] Provisioning Super Admin account securely...");
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, salt);

  const superAdminUser = await User.findOneAndUpdate(
    { email: SEED_EMAIL.toLowerCase().trim() },
    {
      name: "Super Administrator",
      email: SEED_EMAIL.toLowerCase().trim(),
      passwordHash: passwordHash,
      roleId: roleMap["super-admin"],
      isActive: true,
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    { upsert: true, new: true }
  );

  console.log(`✅ [Seed] Super Admin account verified and active for email: ${superAdminUser.email}`);
  console.log("✨ [Seed] Database foundation seeding complete!");

  await mongoose.disconnect();
}

// Allow direct execution: node src/lib/seed.js
if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  seedDatabase().catch((err) => {
    console.error("❌ [Seed] Error seeding database:", err.message);
    process.exit(1);
  });
}
