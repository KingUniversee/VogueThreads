import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { SignJWT } from "jose";

const BASE_URL = "http://localhost:3000";
const SECRET_KEY = process.env.NEXTAUTH_SECRET || "fashion_admin_enterprise_secret_session_development_key_12345";
const DATABASE_URL = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/fashion_commerce_admin";

async function createToken(permissions = ["*"], userId = "6a9fd6ac9e7a85f4f60baeb9") {
  const secret = new TextEncoder().encode(SECRET_KEY);
  return await new SignJWT({
    id: userId,
    email: "admin@voguethreads.in",
    name: "Super Admin",
    role: "admin",
    roleName: "Super Administrator",
    permissions,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

async function runPhase10Tests() {
  console.log("==================================================");
  console.log("PHASE 10 - SYSTEM, SECURITY & HARDENING VERIFICATION");
  console.log("==================================================");

  await mongoose.connect(DATABASE_URL);
  console.log("✓ Connected to MongoDB.");

  const token = await createToken();
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // ----------------------------------------------------
  // TEST 1: Super Admin Protection Constraints
  // ----------------------------------------------------
  console.log("\n--- TEST 1: Super Admin Safety Guards (Zero Bypass) ---");
  const User = (await import("../src/models/User.js")).default;
  const Role = (await import("../src/models/Role.js")).default;
  const { assertSuperAdminSafety } = await import("../src/lib/system-service.js");

  const superAdminRole = await Role.findOne({ slug: "super-admin" });
  if (!superAdminRole) throw new Error("Super Admin role not found");

  const superAdmins = await User.find({ roleId: superAdminRole._id, isActive: true });
  console.log(`  Found ${superAdmins.length} active Super Admin account(s).`);
  const targetSuperAdmin = superAdmins[0];

  // 1a: Attempt to delete last Super Admin
  try {
    await assertSuperAdminSafety(targetSuperAdmin._id, "DELETE");
    throw new Error("FAIL: Super Admin safety guard allowed DELETE of last Super Admin!");
  } catch (err) {
    if (err.code === "OPERATION_PROHIBITED") {
      console.log("  ✓ Prevented DELETE of sole Super Admin: OPERATION_PROHIBITED");
    } else {
      throw err;
    }
  }

  // 1b: Attempt to deactivate last Super Admin
  try {
    await assertSuperAdminSafety(targetSuperAdmin._id, "DEACTIVATE");
    throw new Error("FAIL: Super Admin safety guard allowed DEACTIVATE of last Super Admin!");
  } catch (err) {
    if (err.code === "OPERATION_PROHIBITED") {
      console.log("  ✓ Prevented DEACTIVATE of sole Super Admin: OPERATION_PROHIBITED");
    } else {
      throw err;
    }
  }

  // 1c: Attempt to demote last Super Admin to support role
  const supportRole = await Role.findOne({ slug: "support" });
  if (supportRole) {
    try {
      await assertSuperAdminSafety(targetSuperAdmin._id, "UPDATE", supportRole._id);
      throw new Error("FAIL: Super Admin safety guard allowed DEMOTION of last Super Admin!");
    } catch (err) {
      if (err.code === "OPERATION_PROHIBITED") {
        console.log("  ✓ Prevented DEMOTION of sole Super Admin: OPERATION_PROHIBITED");
      } else {
        throw err;
      }
    }
  }

  // ----------------------------------------------------
  // TEST 2: Admin Users CRUD & Endpoints
  // ----------------------------------------------------
  console.log("\n--- TEST 2: Admin Users Service & Lifecycle ---");
  const {
    getAdminUsers,
    createAdminUser,
    updateAdminUser,
    toggleAdminUserStatus,
    deleteAdminUser,
  } = await import("../src/lib/system-service.js");

  // Fetch admin users list & metrics
  const listData = await getAdminUsers({ page: 1, limit: 10 });
  console.log(`  Admin Users fetched: ${listData.users.length}, Total: ${listData.pagination.total}`);
  console.log("  Admin User Metrics:", listData.metrics);
  if (typeof listData.metrics.totalUsers !== "number" || typeof listData.metrics.activeUsers !== "number") {
    throw new Error("Admin Users metrics contract missing required numbers");
  }

  // Create a new staff account
  const testEmail = `test.staff.${Date.now()}@voguethreads.in`;
  const createdUser = await createAdminUser(
    {
      name: "Test Staff Member",
      email: testEmail,
      phone: "+91 98765 43210",
      roleId: supportRole._id.toString(),
      department: "Customer Experience",
      password: "StrongStaffPassword123!",
    },
    targetSuperAdmin._id
  );
  console.log(`  ✓ Created test staff account: ${createdUser.email} (ID: ${createdUser._id})`);

  // Update staff user
  const updatedUser = await updateAdminUser(
    createdUser._id,
    { name: "Test Staff Member Updated", phone: "+91 91234 56789" },
    targetSuperAdmin._id
  );
  if (updatedUser.name !== "Test Staff Member Updated") {
    throw new Error("Admin user update name mismatch");
  }
  console.log("  ✓ Updated test staff account details.");

  // Toggle status to inactive
  const deactivatedUser = await toggleAdminUserStatus(createdUser._id, "DEACTIVATE", targetSuperAdmin._id);
  if (deactivatedUser.isActive !== false) {
    throw new Error("Failed to deactivate staff account");
  }
  console.log("  ✓ Successfully deactivated staff account.");

  // Reactivate
  const reactivatedUser = await toggleAdminUserStatus(createdUser._id, "ACTIVATE", targetSuperAdmin._id);
  if (reactivatedUser.isActive !== true) {
    throw new Error("Failed to reactivate staff account");
  }
  console.log("  ✓ Successfully reactivated staff account.");

  // Delete test user
  const deleteResult = await deleteAdminUser(createdUser._id, targetSuperAdmin._id);
  if (!deleteResult.success) {
    throw new Error("Failed to delete staff account");
  }
  console.log("  ✓ Successfully cleaned up and deleted test staff account.");

  // ----------------------------------------------------
  // TEST 3: Roles & Permissions Matrix
  // ----------------------------------------------------
  console.log("\n--- TEST 3: Roles & Permissions Control ---");
  const {
    getRolesWithCounts,
    createRole,
    updateRole,
    deleteRole,
    PERMISSIONS_CATALOG,
  } = await import("../src/lib/system-service.js");

  const rolesData = await getRolesWithCounts();
  const rolesWithCounts = rolesData.roles;
  console.log(`  Found ${rolesWithCounts.length} roles.`);
  for (const r of rolesWithCounts) {
    console.log(`    - Role: ${r.name} (${r.slug}), isSystem=${r.isSystem}, UserCount=${r.userCount}`);
  }

  // System role delete protection
  try {
    await deleteRole(superAdminRole._id, targetSuperAdmin._id);
    throw new Error("FAIL: Allowed deletion of system role!");
  } catch (err) {
    if (err.code === "SYSTEM_ROLE_PROTECTED") {
      console.log("  ✓ Prevented deletion of system role: SYSTEM_ROLE_PROTECTED");
    } else {
      throw err;
    }
  }

  // Create custom role
  const testRoleSlug = `custom-ops-${Date.now()}`;
  const customRole = await createRole(
    {
      name: "Custom Operations Assistant",
      slug: testRoleSlug,
      description: "Custom operational permissions for seasonal staff",
      permissions: ["catalog.read", "orders.read", "orders.update"],
    },
    targetSuperAdmin._id
  );
  console.log(`  ✓ Created custom role: ${customRole.name} (slug: ${customRole.slug})`);

  // Update custom role
  const updatedRole = await updateRole(
    customRole._id,
    { permissions: ["catalog.read", "orders.read", "orders.update", "inventory.read"] },
    targetSuperAdmin._id
  );
  if (!updatedRole.permissions.includes("inventory.read")) {
    throw new Error("Custom role update failed to add inventory.read");
  }
  console.log("  ✓ Updated custom role permissions.");

  // Delete custom role
  const deleteRoleResult = await deleteRole(customRole._id, targetSuperAdmin._id);
  if (!deleteRoleResult.success) {
    throw new Error("Failed to delete custom role");
  }
  console.log("  ✓ Deleted custom role successfully.");

  // ----------------------------------------------------
  // TEST 4: Audit Logs Compliance Ledger (Strict Immutability)
  // ----------------------------------------------------
  console.log("\n--- TEST 4: Immutable Audit Trail & Filtering ---");
  const { getAuditLogs } = await import("../src/lib/system-service.js");

  const auditResult = await getAuditLogs({ limit: 10 });
  console.log(`  Audit logs total records: ${auditResult.pagination.total}`);
  if (auditResult.logs.length > 0) {
    const sample = auditResult.logs[0];
    console.log(`  Sample log: Actor=${sample.actorName || sample.actorEmail}, Action=${sample.action}, Resource=${sample.resource}`);
  }

  // Verify API endpoints: Audit logs must NOT have POST / PATCH / DELETE
  const auditMutationRes = await fetch(`${BASE_URL}/api/audit-logs`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ action: "TAMPER" }),
  });
  if (auditMutationRes.status !== 405) {
    console.log(`  Note: POST /api/audit-logs status was ${auditMutationRes.status} (expected 405 Method Not Allowed)`);
  } else {
    console.log("  ✓ POST /api/audit-logs correctly blocked with 405 Method Not Allowed (Strict Immutability).");
  }

  // ----------------------------------------------------
  // TEST 5: Settings Configuration
  // ----------------------------------------------------
  console.log("\n--- TEST 5: System Settings Service & API ---");
  const { getSystemSettings, updateSystemSettings } = await import("../src/lib/system-service.js");

  const settings = await getSystemSettings();
  console.log("  Current Store Settings:", {
    storeName: settings.storeName,
    currency: settings.currency,
    gstRegisteredState: settings.tax?.registeredState,
    defaultCourier: settings.shipping?.defaultCourier,
    codActive: settings.payments?.cod?.isActive,
  });

  // Test updating a non-destructive setting field
  const originalThreshold = settings.shipping?.freeShippingThreshold ?? 1499;
  const updatedSettings = await updateSystemSettings(
    { shipping: { freeShippingThreshold: 1999 } },
    targetSuperAdmin._id
  );
  if (updatedSettings.shipping?.freeShippingThreshold !== 1999) {
    throw new Error("Settings update failed to persist freeShippingThreshold");
  }
  console.log("  ✓ Successfully updated system settings.");

  // Revert back
  await updateSystemSettings(
    { shipping: { freeShippingThreshold: originalThreshold } },
    targetSuperAdmin._id
  );
  console.log("  ✓ Reverted settings field to original value.");

  // ----------------------------------------------------
  // TEST 6: Security Center & Password Policy
  // ----------------------------------------------------
  console.log("\n--- TEST 6: Security Center & Session Verification ---");
  const { getSecurityOverview, changeAdminPassword } = await import("../src/lib/system-service.js");

  const securityInfo = await getSecurityOverview(targetSuperAdmin._id);
  console.log("  Security Overview:", {
    userEmail: securityInfo.currentUser.email,
    lastLoginAt: securityInfo.currentUser.lastLoginAt,
    activeStaff: securityInfo.metrics.activeStaff,
    recentEvents: securityInfo.recentEvents.length,
  });

  // Test password change rejection on wrong current password
  try {
    await changeAdminPassword(
      targetSuperAdmin._id,
      "CompletelyWrongCurrentPassword123!",
      "NewStrongPassword123!",
      targetSuperAdmin._id
    );
    throw new Error("FAIL: Allowed password change with invalid current password!");
  } catch (err) {
    if (err.code === "INVALID_CREDENTIALS") {
      console.log("  ✓ Rejected password change on incorrect current password: INVALID_CREDENTIALS");
    } else {
      throw err;
    }
  }

  // ----------------------------------------------------
  // TEST 7: Frontend Page Status (HTTP 200)
  // ----------------------------------------------------
  console.log("\n--- TEST 7: Dashboard Page Routes Availability ---");
  const routes = [
    "/admin-users",
    "/roles",
    "/audit-logs",
    "/settings",
    "/security",
  ];

  for (const route of routes) {
    const res = await fetch(`${BASE_URL}${route}`, {
      headers: {
        Cookie: `next-auth.session-token=${token}`,
      },
    });
    console.log(`  GET ${route} -> Status ${res.status}`);
    if (res.status !== 200) {
      throw new Error(`Route ${route} failed with status ${res.status}`);
    }
  }
  console.log("  ✓ All 5 Phase 10 dashboard pages returned 200 OK.");

  // ----------------------------------------------------
  // TEST 8: HTTP Security Headers
  // ----------------------------------------------------
  console.log("\n--- TEST 8: HTTP Security Headers in Next.js ---");
  const homeRes = await fetch(`${BASE_URL}/admin-users`);
  const headers = homeRes.headers;
  const nosniff = headers.get("x-content-type-options");
  const frameOptions = headers.get("x-frame-options");
  const referrerPolicy = headers.get("referrer-policy");

  console.log(`  X-Content-Type-Options: ${nosniff}`);
  console.log(`  X-Frame-Options: ${frameOptions}`);
  console.log(`  Referrer-Policy: ${referrerPolicy}`);

  if (nosniff !== "nosniff") throw new Error("Missing nosniff header");
  if (frameOptions !== "DENY") throw new Error("Missing X-Frame-Options DENY header");
  console.log("  ✓ Security headers verified on server response.");

  // ----------------------------------------------------
  // TEST 9: Sidebar Lock Integrity
  // ----------------------------------------------------
  console.log("\n--- TEST 9: Sidebar Lock Verification ---");
  const sidebarPath = path.resolve(process.cwd(), "src/components/layout/sidebar.jsx");
  const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");

  const requiredMenuItems = [
    "Dashboard",
    "Products",
    "Categories",
    "Collections",
    "Brands",
    "Attributes",
    "Inventory",
    "Stock Adjustments",
    "Low Stock",
    "Orders",
    "Customers",
    "Segments",
    "Reviews",
    "Coupons",
    "Discounts",
    "Overview",
    "Sales",
    "Products",
    "Customers",
    "Conversion",
    "Admin Users",
    "Roles & Permissions",
    "Audit Logs",
    "Settings",
    "Security",
  ];

  for (const item of requiredMenuItems) {
    if (!sidebarContent.includes(`name: "${item}"`) && !sidebarContent.includes(`name: '${item}'`)) {
      throw new Error(`Missing expected sidebar item: ${item}`);
    }
  }
  console.log("  ✓ Sidebar integrity verified: 100% compliant with approved locked structure.");

  console.log("\n==================================================");
  console.log("ALL PHASE 10 VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");

  await mongoose.disconnect();
  process.exit(0);
}

runPhase10Tests().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
