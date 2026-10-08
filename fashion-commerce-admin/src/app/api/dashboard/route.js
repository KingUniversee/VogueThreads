import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-queries";

export async function GET(request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";

    const data = await getDashboardData(range);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ [API] Dashboard aggregation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to aggregate dashboard metrics from database.",
      },
      { status: 500 }
    );
  }
}
