import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectToDatabase } from "./mongoose.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Permission from "../models/Permission.js";
import AuditLog from "../models/AuditLog.js";
import Setting from "../models/Setting.js";

function resolveActor(actor = {}) {
  if (!actor) {
    return { id: undefined, email: "system@voguethreads.in" };
  }
  if (typeof actor === "string" || actor instanceof mongoose.Types.ObjectId) {
    const validId = mongoose.isValidObjectId(actor) ? new mongoose.Types.ObjectId(actor.toString()) : undefined;
    return {
      id: validId,
      email: "admin@voguethreads.in",
    };
  }
  const idVal = actor.id || actor._id;
  const validId = idVal && mongoose.isValidObjectId(idVal) ? new mongoose.Types.ObjectId(idVal.toString()) : undefined;
  return {
    id: validId,
    email: actor.email || "admin@voguethreads.in",
  };
}

/**
 * ============================================================================
 * 1. ADMIN USERS MANAGEMENT
 * ============================================================================
 */

/**
 * Super Admin Safety Guard:
 * Prevents deleting, deactivating, or demoting the last active Super Admin.
 */
export async function assertSuperAdminSafety(targetUserId, intendedAction, newRoleId = null) {
  await connectToDatabase();

  const superAdminRole = await Role.findOne({ slug: "super-admin" }).lean();
  if (!superAdminRole) return;

  const targetUser = await User.findById(targetUserId).lean();
  if (!targetUser) return;

  const isTargetSuperAdmin = String(targetUser.roleId) === String(superAdminRole._id);
  if (!isTargetSuperAdmin) return;

  // Target is a Super Admin. Check how many active Super Admins exist.
  const activeSuperAdminsCount = await User.countDocuments({
    roleId: superAdminRole._id,
    isActive: true,
  });

  const isDemoting =
    newRoleId && String(newRoleId) !== String(superAdminRole._id);

  if (
    activeSuperAdminsCount <= 1 &&
    (intendedAction === "DELETE" ||
      intendedAction === "DEACTIVATE" ||
      (intendedAction === "UPDATE" && (!targetUser.isActive || isDemoting)))
  ) {
    const error = new Error(
      "Operation blocked: Cannot delete, deactivate, or demote the last active Super Administrator."
    );
    error.status = 400;
    error.code = "OPERATION_PROHIBITED";
    throw error;
  }
}

export async function getAdminUsers(queryParams = {}) {
  await connectToDatabase();

  const {
    page = 1,
    limit = 10,
    search = "",
    roleId,
    status = "ALL",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = queryParams;

  const filter = {};

  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { name: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
      { phone: { $regex: s, $options: "i" } },
    ];
  }

  if (roleId && mongoose.isValidObjectId(roleId)) {
    filter.roleId = roleId;
  }

  if (status === "ACTIVE") {
    filter.isActive = true;
  } else if (status === "INACTIVE") {
    filter.isActive = false;
  } else if (status === "LOCKED") {
    filter.lockUntil = { $gt: new Date() };
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const sort = {};
  sort[sortBy] = sortOrder === "asc" ? 1 : -1;

  const [users, total, totalUsers, activeUsers, inactiveUsers, lockedUsers] =
    await Promise.all([
      User.find(filter)
        .select("-passwordHash")
        .populate("roleId", "name slug isSystem")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ lockUntil: { $gt: new Date() } }),
    ]);

  return {
    users: users.map((u) => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone || "—",
      avatarUrl: u.avatarUrl || null,
      isActive: u.isActive,
      isLocked: Boolean(u.lockUntil && new Date(u.lockUntil) > new Date()),
      lockUntil: u.lockUntil,
      failedLoginAttempts: u.failedLoginAttempts || 0,
      lastLoginAt: u.lastLoginAt || null,
      lastLoginIp: u.lastLoginIp || null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      role: u.roleId
        ? {
            _id: u.roleId._id?.toString(),
            name: u.roleId.name,
            slug: u.roleId.slug,
            isSystem: u.roleId.isSystem,
          }
        : { name: "Unassigned", slug: "unassigned", isSystem: false },
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1,
    },
    metrics: {
      totalUsers,
      activeUsers,
      inactiveUsers,
      lockedUsers,
    },
  };
}

export async function getAdminUserById(id) {
  await connectToDatabase();
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid User ID");
    error.status = 400;
    throw error;
  }

  const user = await User.findById(id)
    .select("-passwordHash")
    .populate("roleId", "name slug permissions isSystem")
    .lean();

  if (!user) {
    const error = new Error("Admin user not found");
    error.status = 404;
    throw error;
  }

  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    avatarUrl: user.avatarUrl || "",
    isActive: user.isActive,
    isLocked: Boolean(user.lockUntil && new Date(user.lockUntil) > new Date()),
    lockUntil: user.lockUntil,
    failedLoginAttempts: user.failedLoginAttempts || 0,
    lastLoginAt: user.lastLoginAt,
    lastLoginIp: user.lastLoginIp,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: user.roleId || null,
  };
}

export async function createAdminUser(userData, actor = {}) {
  await connectToDatabase();

  const { name, email, password, roleId, phone, avatarUrl } = userData;

  if (!name || !name.trim()) {
    const err = new Error("Full name is required");
    err.status = 400;
    throw err;
  }

  if (!email || !email.includes("@")) {
    const err = new Error("A valid email address is required");
    err.status = 400;
    throw err;
  }

  if (!password || password.length < 8) {
    const err = new Error("Password must be at least 8 characters");
    err.status = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const err = new Error("An account with this email address already exists");
    err.status = 409;
    throw err;
  }

  if (!roleId || !mongoose.isValidObjectId(roleId)) {
    const err = new Error("A valid role must be selected");
    err.status = 400;
    throw err;
  }

  const role = await Role.findById(roleId);
  if (!role) {
    const err = new Error("Selected role does not exist");
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const newUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    roleId,
    phone: phone ? phone.trim() : "",
    avatarUrl: avatarUrl || "",
    isActive: true,
  });

  // Record audit log
  try {
    const actorInfo = resolveActor(actor);
    await AuditLog.create({
      actorId: actorInfo.id,
      actorEmail: actorInfo.email,
      action: "ADMIN_USER_CREATE",
      resource: "User",
      resourceId: newUser._id.toString(),
      details: {
        after: {
          name: newUser.name,
          email: newUser.email,
          role: role.name,
        },
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Error recording admin user creation:", auditErr.message);
  }

  return {
    _id: newUser._id.toString(),
    name: newUser.name,
    email: newUser.email,
    role: { _id: role._id.toString(), name: role.name, slug: role.slug },
  };
}

export async function updateAdminUser(id, updateData, actor = {}) {
  await connectToDatabase();

  if (!mongoose.isValidObjectId(id)) {
    const err = new Error("Invalid User ID");
    err.status = 400;
    throw err;
  }

  const user = await User.findById(id);
  if (!user) {
    const err = new Error("Admin user not found");
    err.status = 404;
    throw err;
  }

  // Safety check if demoting or deactivating
  if (updateData.roleId || updateData.isActive !== undefined) {
    await assertSuperAdminSafety(
      id,
      "UPDATE",
      updateData.roleId
    );
  }

  const beforeState = {
    name: user.name,
    roleId: user.roleId?.toString(),
    phone: user.phone,
    isActive: user.isActive,
  };

  if (updateData.name && updateData.name.trim()) {
    user.name = updateData.name.trim();
  }

  if (updateData.phone !== undefined) {
    user.phone = updateData.phone ? updateData.phone.trim() : "";
  }

  if (updateData.avatarUrl !== undefined) {
    user.avatarUrl = updateData.avatarUrl;
  }

  if (updateData.roleId && mongoose.isValidObjectId(updateData.roleId)) {
    const roleExists = await Role.findById(updateData.roleId);
    if (!roleExists) {
      const err = new Error("Selected role does not exist");
      err.status = 400;
      throw err;
    }
    user.roleId = updateData.roleId;
  }

  if (typeof updateData.isActive === "boolean") {
    user.isActive = updateData.isActive;
  }

  if (updateData.password && updateData.password.trim()) {
    if (updateData.password.length < 8) {
      const err = new Error("New password must be at least 8 characters");
      err.status = 400;
      throw err;
    }
    user.passwordHash = await bcrypt.hash(updateData.password, 12);
  }

  await user.save();

  try {
    const actorInfo = resolveActor(actor);
    await AuditLog.create({
      actorId: actorInfo.id,
      actorEmail: actorInfo.email,
      action: "ADMIN_USER_UPDATE",
      resource: "User",
      resourceId: user._id.toString(),
      details: {
        before: beforeState,
        after: {
          name: user.name,
          roleId: user.roleId?.toString(),
          phone: user.phone,
          isActive: user.isActive,
        },
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Error recording admin user update:", auditErr.message);
  }

  return await getAdminUserById(id);
}

export async function toggleAdminUserStatus(id, isActive, reason = "", actor = {}) {
  await connectToDatabase();

  const targetActive =
    typeof isActive === "boolean"
      ? isActive
      : typeof isActive === "string"
      ? isActive.toLowerCase() !== "deactivate" &&
        isActive.toLowerCase() !== "false" &&
        isActive.toLowerCase() !== "inactive"
      : Boolean(isActive);

  if (!targetActive) {
    await assertSuperAdminSafety(id, "DEACTIVATE");
  }

  const user = await User.findById(id);
  if (!user) {
    const err = new Error("Admin user not found");
    err.status = 404;
    throw err;
  }

  const previousState = user.isActive;
  user.isActive = targetActive;

  // If reactivating or unlocking, clear lockout
  if (targetActive) {
    user.lockUntil = null;
    user.failedLoginAttempts = 0;
  }

  await user.save();

  try {
    const actorInfo = resolveActor(actor);
    await AuditLog.create({
      actorId: actorInfo.id,
      actorEmail: actorInfo.email,
      action: targetActive ? "ADMIN_USER_ACTIVATE" : "ADMIN_USER_DEACTIVATE",
      resource: "User",
      resourceId: user._id.toString(),
      details: {
        before: { isActive: previousState },
        after: { isActive: user.isActive },
        reason,
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Error recording user status toggle:", auditErr.message);
  }

  return { success: true, isActive: user.isActive };
}

export async function deleteAdminUser(id, actor = {}) {
  await connectToDatabase();

  const actorInfo = resolveActor(actor);
  if (actorInfo.id && String(actorInfo.id) === String(id)) {
    const err = new Error("Self-deletion blocked: You cannot delete your own active administrator account.");
    err.status = 400;
    throw err;
  }

  await assertSuperAdminSafety(id, "DELETE");

  const user = await User.findById(id);
  if (!user) {
    const err = new Error("Admin user not found");
    err.status = 404;
    throw err;
  }

  await User.findByIdAndDelete(id);

  try {
    await AuditLog.create({
      actorId: actorInfo.id,
      actorEmail: actorInfo.email,
      action: "ADMIN_USER_DELETE",
      resource: "User",
      resourceId: id,
      details: {
        before: { name: user.name, email: user.email },
        reason: "Admin staff account permanently deleted",
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Error recording user deletion:", auditErr.message);
  }

  return { success: true };
}

/**
 * ============================================================================
 * 2. ROLES & PERMISSIONS MANAGEMENT
 * ============================================================================
 */

export async function getRolesWithCounts() {
  await connectToDatabase();

  const [roles, permissions] = await Promise.all([
    Role.find().sort({ isSystem: -1, createdAt: 1 }).lean(),
    Permission.find().sort({ category: 1, name: 1 }).lean(),
  ]);

  // Compute live user counts per role
  const rolesWithCounts = await Promise.all(
    roles.map(async (role) => {
      const userCount = await User.countDocuments({ roleId: role._id });
      return {
        _id: role._id.toString(),
        name: role.name,
        slug: role.slug,
        description: role.description || "",
        isSystem: Boolean(role.isSystem),
        permissions: role.permissions || [],
        permissionsCount: (role.permissions || []).length,
        userCount,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      };
    })
  );

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, p) => {
    const cat = p.category || "GENERAL";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({
      code: p.code,
      name: p.name,
      description: p.description,
      category: cat,
    });
    return acc;
  }, {});

  return {
    roles: rolesWithCounts,
    availablePermissions: permissions,
    permissionsByCategory,
  };
}

export async function createRole(roleData, actor = {}) {
  await connectToDatabase();

  const { name, slug, description, permissions } = roleData;

  if (!name || !name.trim()) {
    const err = new Error("Role name is required");
    err.status = 400;
    throw err;
  }

  const normalizedSlug = (slug || name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const existing = await Role.findOne({ slug: normalizedSlug });
  if (existing) {
    const err = new Error(`A role with slug '${normalizedSlug}' already exists.`);
    err.status = 409;
    throw err;
  }

  const cleanPermissions = Array.isArray(permissions) ? Array.from(new Set(permissions)) : [];

  const newRole = await Role.create({
    name: name.trim(),
    slug: normalizedSlug,
    description: description || "",
    permissions: cleanPermissions,
    isSystem: false,
  });

  try {
    const actorInfo = resolveActor(actor);
    await AuditLog.create({
      actorId: actorInfo.id,
      actorEmail: actorInfo.email,
      action: "ROLE_CREATE",
      resource: "Role",
      resourceId: newRole._id.toString(),
      details: {
        after: {
          name: newRole.name,
          slug: newRole.slug,
          permissionsCount: cleanPermissions.length,
        },
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Error recording role creation:", auditErr.message);
  }

  return newRole;
}

export async function updateRole(id, updateData, actor = {}) {
  await connectToDatabase();

  if (!mongoose.isValidObjectId(id)) {
    const err = new Error("Invalid Role ID");
    err.status = 400;
    throw err;
  }

  const role = await Role.findById(id);
  if (!role) {
    const err = new Error("Role not found");
    err.status = 404;
    throw err;
  }

  const beforeState = {
    name: role.name,
    description: role.description,
    permissionsCount: role.permissions.length,
  };

  // Protect Super Admin role from having permissions stripped
  if (role.isSystem && role.slug === "super-admin") {
    if (updateData.permissions && Array.isArray(updateData.permissions)) {
      const allPerms = await Permission.find().distinct("code");
      // Keep full permissions intact
      role.permissions = allPerms;
    }
    if (updateData.name) role.name = updateData.name.trim();
    if (updateData.description !== undefined) role.description = updateData.description;
  } else {
    if (updateData.name && updateData.name.trim()) role.name = updateData.name.trim();
    if (updateData.description !== undefined) role.description = updateData.description;
    if (Array.isArray(updateData.permissions)) {
      role.permissions = Array.from(new Set(updateData.permissions));
    }
  }

  await role.save();

  try {
    const actorInfo = resolveActor(actor);
    await AuditLog.create({
      actorId: actorInfo.id,
      actorEmail: actorInfo.email,
      action: "ROLE_UPDATE",
      resource: "Role",
      resourceId: role._id.toString(),
      details: {
        before: beforeState,
        after: {
          name: role.name,
          permissionsCount: role.permissions.length,
        },
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Error recording role update:", auditErr.message);
  }

  return role;
}

export async function deleteRole(id, actor = {}) {
  await connectToDatabase();

  const role = await Role.findById(id);
  if (!role) {
    const err = new Error("Role not found");
    err.status = 404;
    throw err;
  }

  if (role.isSystem) {
    const err = new Error(`System role '${role.name}' is protected and cannot be deleted.`);
    err.status = 400;
    err.code = "SYSTEM_ROLE_PROTECTED";
    throw err;
  }

  const usersWithRole = await User.countDocuments({ roleId: id });
  if (usersWithRole > 0) {
    const err = new Error(
      `Cannot delete role '${role.name}': currently assigned to ${usersWithRole} active staff member(s). Reassign them first.`
    );
    err.status = 400;
    throw err;
  }

  await Role.findByIdAndDelete(id);

  try {
    const actorInfo = resolveActor(actor);
    await AuditLog.create({
      actorId: actorInfo.id,
      actorEmail: actorInfo.email,
      action: "ROLE_DELETE",
      resource: "Role",
      resourceId: id,
      details: {
        before: { name: role.name, slug: role.slug },
        reason: "Role deleted",
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Error recording role deletion:", auditErr.message);
  }

  return { success: true };
}

/**
 * ============================================================================
 * 3. AUDIT LOGS QUERYING (IMMUTABLE LEDGER)
 * ============================================================================
 */

export async function getAuditLogs(queryParams = {}) {
  await connectToDatabase();

  const {
    page = 1,
    limit = 20,
    search = "",
    actor = "",
    action = "",
    resource = "",
    startDate,
    endDate,
  } = queryParams;

  const filter = {};

  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { actorEmail: { $regex: s, $options: "i" } },
      { action: { $regex: s, $options: "i" } },
      { resource: { $regex: s, $options: "i" } },
      { resourceId: { $regex: s, $options: "i" } },
    ];
  }

  if (actor && actor.trim()) {
    filter.actorEmail = { $regex: actor.trim(), $options: "i" };
  }

  if (action && action !== "ALL") {
    filter.action = action;
  }

  if (resource && resource !== "ALL") {
    filter.resource = resource;
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      filter.createdAt.$gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = e;
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total, totalLogsCount, distinctActors, distinctActions, distinctResources, latestLog] =
    await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      AuditLog.countDocuments(filter),
      AuditLog.countDocuments(),
      AuditLog.distinct("actorEmail"),
      AuditLog.distinct("action"),
      AuditLog.distinct("resource"),
      AuditLog.findOne().sort({ createdAt: -1 }).lean(),
    ]);

  return {
    logs: logs.map((l) => ({
      _id: l._id.toString(),
      actorId: l.actorId ? l.actorId.toString() : null,
      actorEmail: l.actorEmail,
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      details: l.details || {},
      ipAddress: l.ipAddress || "—",
      userAgent: l.userAgent || "—",
      createdAt: l.createdAt,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1,
    },
    metrics: {
      totalLogs: totalLogsCount,
      uniqueActorsCount: distinctActors.length,
      topAction: distinctActions[0] || "—",
      lastActivityDate: latestLog?.createdAt || null,
    },
    filterOptions: {
      actors: distinctActors,
      actions: distinctActions.sort(),
      resources: distinctResources.sort(),
    },
  };
}

/**
 * ============================================================================
 * 4. SETTINGS MANAGEMENT
 * ============================================================================
 */

export async function getSystemSettings() {
  await connectToDatabase();

  let setting = await Setting.findOne().lean();
  if (!setting) {
    setting = await Setting.create({});
  }

  return {
    _id: setting._id.toString(),
    store: setting.store || {
      name: "VogueThreads Enterprise",
      legalEntity: "VogueThreads Fashion Retail Pvt. Ltd.",
      email: "support@voguethreads.in",
      phone: "+91 98765 43210",
      currency: "INR",
      currencySymbol: "₹",
      country: "India",
      timezone: "Asia/Kolkata",
    },
    tax: setting.tax || {
      gstin: "27AAAAA0000A1Z5",
      registeredState: "Maharashtra",
      registeredStateCode: "27",
      defaultHsnCode: "6109",
      defaultGstRate: 5,
      pricesIncludeTax: true,
    },
    shipping: setting.shipping || {
      defaultCourier: "DELHIVERY",
      shiprocketEnabled: false,
      delhiveryEnabled: true,
      defaultWeightGrams: 350,
      freeShippingThreshold: 999,
      standardShippingFee: 49,
    },
    payments: setting.payments || {
      codEnabled: true,
      codFee: 30,
      codMaxOrderValue: 5000,
      razorpayEnabled: true,
      phonepeEnabled: false,
    },
    updatedAt: setting.updatedAt,
  };
}

export async function updateSystemSettings(updateData, actor = {}) {
  await connectToDatabase();

  let setting = await Setting.findOne();
  if (!setting) {
    setting = new Setting({});
  }

  const beforeState = setting.toObject();

  if (updateData.store) {
    setting.store = { ...setting.store.toObject(), ...updateData.store };
  }
  if (updateData.tax) {
    setting.tax = { ...setting.tax.toObject(), ...updateData.tax };
  }
  if (updateData.shipping) {
    setting.shipping = { ...setting.shipping.toObject(), ...updateData.shipping };
  }
  if (updateData.payments) {
    setting.payments = { ...setting.payments.toObject(), ...updateData.payments };
  }

  await setting.save();

  try {
    const actorInfo = resolveActor(actor);
    await AuditLog.create({
      actorId: actorInfo.id,
      actorEmail: actorInfo.email,
      action: "SETTINGS_UPDATE",
      resource: "Setting",
      resourceId: setting._id.toString(),
      details: {
        before: {
          store: beforeState.store,
          tax: beforeState.tax,
          shipping: beforeState.shipping,
          payments: beforeState.payments,
        },
        after: {
          store: setting.store,
          tax: setting.tax,
          shipping: setting.shipping,
          payments: setting.payments,
        },
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Error recording settings update:", auditErr.message);
  }

  return await getSystemSettings();
}

/**
 * ============================================================================
 * 5. SECURITY & SESSION CONTROL CENTER
 * ============================================================================
 */

export async function changeAdminPassword(userId, currentPassword, newPassword, actor = {}) {
  await connectToDatabase();

  if (!userId || !mongoose.isValidObjectId(userId)) {
    const err = new Error("Invalid User ID");
    err.status = 400;
    throw err;
  }

  if (!newPassword || newPassword.length < 8) {
    const err = new Error("New password must be at least 8 characters");
    err.status = 400;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    const err = new Error("Current password is incorrect");
    err.status = 400;
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  try {
    const actorInfo = resolveActor(actor);
    await AuditLog.create({
      actorId: actorInfo.id || user._id,
      actorEmail: actorInfo.email || user.email,
      action: "SECURITY_PASSWORD_CHANGE",
      resource: "User",
      resourceId: user._id.toString(),
      details: { reason: "Self-service password update" },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Error recording password change:", auditErr.message);
  }

  return { success: true };
}

export async function getSecurityOverview(currentUser = {}) {
  await connectToDatabase();

  let userDoc = null;
  if (typeof currentUser === "string" || currentUser instanceof mongoose.Types.ObjectId) {
    if (mongoose.isValidObjectId(currentUser)) {
      userDoc = await User.findById(currentUser).lean();
    }
  } else if (currentUser?.id && mongoose.isValidObjectId(currentUser.id)) {
    userDoc = await User.findById(currentUser.id).lean();
  }

  const resolvedUser = userDoc
    ? {
        id: userDoc._id.toString(),
        name: userDoc.name,
        email: userDoc.email,
        role: "admin",
        roleName: "Administrator",
        lastLoginAt: userDoc.lastLoginAt,
        permissionsCount: 0,
      }
    : {
        id: currentUser.id || "",
        name: currentUser.name || "Administrator",
        email: currentUser.email || "",
        role: currentUser.role || "admin",
        roleName: currentUser.roleName || "Administrator",
        lastLoginAt: null,
        permissionsCount: currentUser.permissions?.length || 0,
      };

  const [activeUsersCount, lockedUsersCount, totalStaffCount, recentEvents] =
    await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ lockUntil: { $gt: new Date() } }),
      User.countDocuments(),
      AuditLog.find({
        action: {
          $in: [
            "USER_LOGIN_SUCCESS",
            "SECURITY_PASSWORD_CHANGE",
            "ADMIN_USER_CREATE",
            "ADMIN_USER_STATUS_UPDATE",
            "ADMIN_USER_DELETE",
            "ROLE_UPDATE",
            "SETTINGS_UPDATE",
          ],
        },
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

  return {
    currentUser: resolvedUser,
    metrics: {
      activeStaff: activeUsersCount,
      lockedAccounts: lockedUsersCount,
      totalStaff: totalStaffCount,
      securityEventsCount: recentEvents.length,
    },
    recentEvents: recentEvents.map((e) => ({
      _id: e._id.toString(),
      action: e.action,
      actorEmail: e.actorEmail,
      resource: e.resource,
      resourceId: e.resourceId,
      createdAt: e.createdAt,
      ipAddress: e.ipAddress,
    })),
  };
}
