import { NextRequest, NextResponse } from "next/server";
import { saveMedia } from "@/lib/media";

export const runtime = "nodejs";

// 客户端已压缩，这里兜底；再大的坚决拒收
const MAX_BYTES = 1_500_000;
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const scope = (form.get("scope") as string | null) || "merchant";
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "missing file" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: `unsupported type: ${file.type}` },
        { status: 415 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: `file too large (${Math.round(file.size / 1024)} KB, max ${Math.round(MAX_BYTES / 1024)} KB)`,
        },
        { status: 413 },
      );
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    const { id } = await saveMedia({ bytes: buf, mime: file.type, scope });
    const url = `/api/media/${id}`;
    return NextResponse.json({ ok: true, url, pathname: url });
  } catch (e: unknown) {
    console.error("upload error:", e);
    return NextResponse.json({ ok: false, error: "upload failed" }, { status: 500 });
  }
}
