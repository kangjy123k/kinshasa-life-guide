import { NextRequest, NextResponse } from "next/server";
import { setQrcode, getQrcodeConfig, setSourceUrl, refreshFromSource } from "@/lib/qrcode";

export const runtime = "nodejs";

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  const provided = req.headers.get("x-admin-password");
  return provided === expected;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const config = await getQrcodeConfig();
  return NextResponse.json({ ok: true, config });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // 三种动作：配置 source_url / 立即从 source 拉取 / 直接上传文件
  const ctype = req.headers.get("content-type") || "";

  if (ctype.includes("application/json")) {
    try {
      const body = (await req.json()) as { action?: string; sourceUrl?: string | null };
      if (body.action === "set-source") {
        const url = typeof body.sourceUrl === "string" ? body.sourceUrl : null;
        if (url && !/^https?:\/\//i.test(url)) {
          return NextResponse.json({ ok: false, error: "invalid url" }, { status: 400 });
        }
        await setSourceUrl(url);
        if (url) {
          const result = await refreshFromSource({ force: true });
          return NextResponse.json({ ok: true, refresh: result });
        }
        return NextResponse.json({ ok: true });
      }
      if (body.action === "refresh") {
        const result = await refreshFromSource({ force: true });
        return NextResponse.json({ ok: true, refresh: result });
      }
      return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
    } catch (e) {
      console.error("admin qrcode json error:", e);
      return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
    }
  }

  // multipart → 直接上传文件
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: "missing file" }, { status: 400 });
    }
    if (file.size > 400_000) {
      return NextResponse.json(
        { ok: false, error: `file too large (${Math.round(file.size / 1024)} KB, max 400 KB)` },
        { status: 400 }
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/jpeg";
    const result = await setQrcode(buf.toString("base64"), mime);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("admin qrcode upload error:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
