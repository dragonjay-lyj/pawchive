import { NextRequest, NextResponse } from "next/server";

/** POST /api/upload — upload image to Cloudinary, return URL */
export async function POST(req: NextRequest) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    return NextResponse.json({ error: "Cloudinary not configured" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }

  // Validate image
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "only images allowed" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "max 10MB" }, { status: 400 });
  }

  const cloudForm = new FormData();
  cloudForm.append("file", file);
  cloudForm.append("upload_preset", uploadPreset);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: cloudForm }
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return NextResponse.json({ error: `upload failed: ${res.status}`, detail: err.slice(0, 200) }, { status: 502 });
    }
    const json = await res.json();
    return NextResponse.json({ url: json.secure_url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "network" }, { status: 502 });
  }
}
