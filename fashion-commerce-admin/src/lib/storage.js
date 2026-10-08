import path from "path";
import fs from "fs/promises";

export const MAX_MEDIA_SIZE = 2 * 1024 * 1024; // 2MB

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
];

/**
 * Validates media file size and MIME type
 */
export function validateMediaFile(file) {
  if (!file) {
    return { valid: false, error: "No media file provided" };
  }

  if (file.size > MAX_MEDIA_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 2MB limit. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
    };
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: "Invalid file format. Only JPG, PNG, WEBP, GIF, and SVG images are allowed.",
    };
  }

  return { valid: true };
}

/**
 * Uploads media file to configured cloud provider (Cloudinary / S3)
 * with robust local filesystem fallback and storefront sync.
 */
export async function uploadMedia({ buffer, filename, contentType }) {
  if (buffer.length > MAX_MEDIA_SIZE) {
    throw new Error(
      `File size exceeds 2MB limit. Uploaded size is ${(buffer.length / (1024 * 1024)).toFixed(2)}MB.`
    );
  }

  // 1. Cloudinary Integration (if configured)
  const cloudinaryCloud = process.env.CLOUDINARY_CLOUD_NAME;
  const cloudinaryKey = process.env.CLOUDINARY_API_KEY;
  const cloudinarySecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudinaryCloud && cloudinaryKey && cloudinarySecret) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const crypto = await import("crypto");
      const signatureStr = `timestamp=${timestamp}${cloudinarySecret}`;
      const signature = crypto.createHash("sha1").update(signatureStr).digest("hex");

      const formData = new FormData();
      formData.append("file", `data:${contentType};base64,${buffer.toString("base64")}`);
      formData.append("api_key", cloudinaryKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", "voguethreads");

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloud}/image/upload`,
        { method: "POST", body: formData }
      );

      if (res.ok) {
        const data = await res.json();
        return {
          url: data.secure_url,
          key: data.public_id,
          provider: "cloudinary",
        };
      }
    } catch (cldErr) {
      console.warn("Cloudinary upload failed, falling back to local storage:", cldErr.message);
    }
  }

  // 2. Local Filesystem Provider (Default & Development)
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const safeName = (filename || "image").replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueFileName = `${Date.now()}_${safeName}`;
  const filePath = path.join(uploadsDir, uniqueFileName);

  await fs.writeFile(filePath, buffer);

  // Synchronize to storefront public/uploads directory
  try {
    const storefrontUploadsDir = path.resolve(
      process.cwd(),
      "..",
      "voguethreads-storefronte",
      "public",
      "uploads"
    );
    await fs.mkdir(storefrontUploadsDir, { recursive: true });
    const storefrontFilePath = path.join(storefrontUploadsDir, uniqueFileName);
    await fs.writeFile(storefrontFilePath, buffer);
  } catch (syncErr) {
    console.warn("Could not sync upload to storefront uploads directory:", syncErr.message);
  }

  return {
    url: `/uploads/${uniqueFileName}`,
    key: uniqueFileName,
    provider: "local",
  };
}
