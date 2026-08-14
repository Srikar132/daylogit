import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getRequestIdentity } from "@/lib/api-auth";
import { canWriteEntries } from "@/lib/permissions";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteEntries(identity.role)) {
    return NextResponse.json({ error: "View-only access" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Only images and videos are supported." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 25MB)." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resourceType = isVideo ? "video" : "image";
    const result = await cloudinary.uploader.upload(
      `data:${file.type};base64,${buffer.toString("base64")}`,
      { resource_type: resourceType, folder: "helm-canvas" },
    );

    return NextResponse.json({
      url: result.secure_url,
      resourceType,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  }
}
