import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { validateMediaFile, uploadMedia } from "@/lib/storage";

export async function POST(req) {
  try {
    await assertPermission([
      "products.create",
      "products.update",
      "categories.create",
      "categories.update",
      "catalog.manage",
    ]);

    const contentType = req.headers.get("content-type") || "";

    // 1. JSON Payload: direct URL registration
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { url, alt } = body;
      if (!url) {
        return NextResponse.json(
          { success: false, error: "Image URL is required" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        data: {
          url: url.trim(),
          key: `url_${Date.now()}`,
          alt: alt || "Uploaded image",
        },
      });
    }

    // 2. Multipart Form: Media File Upload
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate size and MIME type
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await uploadMedia({
      buffer,
      filename: file.name,
      contentType: file.type,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: uploadResult.url,
        key: uploadResult.key,
        alt: file.name,
        provider: uploadResult.provider,
      },
    });
  } catch (err) {
    console.error("POST /api/upload error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process upload" },
      { status }
    );
  }
}
