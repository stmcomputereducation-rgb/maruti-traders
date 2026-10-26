import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate mime type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WEBP, and SVG allowed." }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 10MB limit." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let publicUrl = "";
    const ext = path.extname(file.name) || ".jpg";
    const sanitizedBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueFilename = `${sanitizedBase}-${Date.now()}${ext}`;

    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "marbles");
      await mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, uniqueFilename);
      await writeFile(filePath, buffer);
      publicUrl = `/uploads/marbles/${uniqueFilename}`;
    } catch (fsError: any) {
      console.warn("Read-only filesystem detected, falling back to Base64 Data URI:", fsError?.message);
      const mime = file.type || "image/jpeg";
      const base64 = buffer.toString("base64");
      publicUrl = `data:${mime};base64,${base64}`;
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: uniqueFilename,
      size: file.size,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
