import { NextResponse } from "next/server";
import { getSearchSuggestions } from "@/lib/catalog";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    const suggestions = await getSearchSuggestions(query);
    return NextResponse.json(suggestions);
  } catch (err) {
    console.error("Search suggestions API error:", err);
    return NextResponse.json(
      { products: [], categories: [], popular: [] },
      { status: 500 }
    );
  }
}
