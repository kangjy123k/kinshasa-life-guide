import { NextRequest, NextResponse } from "next/server";
import { updateByOwner } from "@/lib/submissions";

export const runtime = "nodejs";

function readToken(req: NextRequest): string | null {
  const cookie = req.cookies.get("klg_owner")?.value;
  if (cookie && /^[a-f0-9]{16,64}$/i.test(cookie)) return cookie;
  const header = req.headers.get("x-owner-token");
  if (header && /^[a-f0-9]{16,64}$/i.test(header)) return header;
  return null;
}

export async function POST(req: NextRequest) {
  const token = readToken(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  let body: { id?: string; data?: Record<string, string> } = {};
  try {
    body = (await req.json()) as { id?: string; data?: Record<string, string> };
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const data = body.data && typeof body.data === "object" ? body.data : null;
  if (!id || !data) {
    return NextResponse.json({ ok: false, error: "missing id or data" }, { status: 400 });
  }
  // 只保留 string 键值，避免被塞入嵌套对象
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "string") cleaned[k] = v;
  }
  try {
    const rec = await updateByOwner(id, token, cleaned);
    if (!rec) {
      return NextResponse.json(
        { ok: false, error: "not found or not owned" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, record: rec });
  } catch (e) {
    console.error("my update error:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
