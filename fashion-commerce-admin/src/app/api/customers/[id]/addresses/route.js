import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Customer from "@/models/Customer";

/**
 * POST /api/customers/[id]/addresses
 * Add or update customer saved address
 */
export async function POST(request, { params }) {
  try {
    await assertPermission("customers.update");
    await connectToDatabase();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid customer ID" }, { status: 400 });
    }

    const customer = await Customer.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!customer) {
      return NextResponse.json({ success: false, error: `Customer '${id}' not found` }, { status: 404 });
    }

    const body = await request.json();
    const {
      fullName,
      name,
      phone,
      addressLine1,
      addressLine2 = "",
      landmark = "",
      city,
      state,
      pinCode,
      postalCode,
      country = "India",
      type = "SHIPPING",
      isDefault = false,
    } = body;

    const resolvedFullName = (fullName || name || "").trim();
    const resolvedPinCode = (pinCode || postalCode || "").trim();

    if (!resolvedFullName || !phone || !addressLine1 || !city || !state || !resolvedPinCode) {
      return NextResponse.json(
        { success: false, error: "All required address fields must be filled" },
        { status: 400 }
      );
    }

    if (isDefault) {
      // Clear existing default
      (customer.addresses || []).forEach((addr) => {
        if (addr.type === type) addr.isDefault = false;
      });
    }

    if (!customer.addresses) customer.addresses = [];

    customer.addresses.push({
      fullName: resolvedFullName,
      phone: phone.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      landmark: landmark.trim(),
      city: city.trim(),
      state: state.trim(),
      pinCode: resolvedPinCode,
      country: country.trim(),
      type,
      isDefault: Boolean(isDefault) || customer.addresses.length === 0,
    });

    await customer.save();

    return NextResponse.json({
      success: true,
      addresses: customer.addresses,
    });
  } catch (error) {
    console.error("❌ [API /api/customers/[id]/addresses POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save address" },
      { status: error.status || 500 }
    );
  }
}
