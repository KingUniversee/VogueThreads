import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Customer from "@/models/Customer";
import { getSession } from "@/lib/auth";

export async function GET(req) {
  try {
    const session = await getSession(req);
    // Primary authorization identity: session.userId
    const userId = session?.userId;
    if (!userId && !session?.email) {
      return NextResponse.json(
        { success: false, authenticated: false, customer: null },
        { status: 200 }
      );
    }

    await connectToDatabase();

    // Look up customer primarily by session.userId (since email can change)
    let customer = null;
    if (userId) {
      customer = await Customer.findById(userId).lean();
    }
    if (!customer && session?.email) {
      customer = await Customer.findOne({ email: session.email.toLowerCase().trim() }).lean();
    }

    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer._id.toString(),
        name: customer.name,
        email: customer.email,
        phone: customer.phone || "",
        avatar: customer.avatar || "",
        authProvider: customer.authProvider || "credentials",
        addresses: customer.addresses || [],
        createdAt: customer.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ [API] Fetch customer error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await getSession(req);
    // Primary authorization identity: session.userId
    const userId = session?.userId;
    if (!userId && !session?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, phone, addresses } = body;

    await connectToDatabase();

    // Primary authorization lookup by session.userId
    let customer = null;
    if (userId) {
      customer = await Customer.findById(userId);
    }
    if (!customer && session?.email) {
      customer = await Customer.findOne({ email: session.email.toLowerCase().trim() });
    }

    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    if (name?.trim()) customer.name = name.trim();
    if (phone !== undefined) customer.phone = phone.trim();
    if (addresses && Array.isArray(addresses)) customer.addresses = addresses;

    await customer.save();

    return NextResponse.json({
      success: true,
      customer: {
        id: customer._id.toString(),
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        avatar: customer.avatar,
        addresses: customer.addresses,
      },
    });
  } catch (error) {
    console.error("❌ [API] Update customer error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

