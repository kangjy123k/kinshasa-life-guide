import { NextRequest, NextResponse } from "next/server";
import { deleteByOwner } from "@/lib/submissions";

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
  try {
    const body = (await req.json()) as { id?: string };
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    }
    const ok = await deleteByOwner(id, token);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "not found or not owned" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("my withdraw error:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
