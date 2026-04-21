import { NextRequest, NextResponse } from "next/server";
import { listByOwner } from "@/lib/submissions";

export const runtime = "nodejs";

function readToken(req: NextRequest): string | null {
  const cookie = req.cookies.get("klg_owner")?.value;
  if (cookie && /^[a-f0-9]{16,64}$/i.test(cookie)) return cookie;
  const header = req.headers.get("x-owner-token");
  if (header && /^[a-f0-9]{16,64}$/i.test(header)) return header;
  return null;
}

export async function GET(req: NextRequest) {
  const token = readToken(req);
  if (!token) {
    return NextResponse.json(
      { ok: true, records: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
  try {
    const records = await listByOwner(token);
    return NextResponse.json(
      { ok: true, records },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("my submissions error:", e);
    return NextResponse.json({ ok: false, records: [] }, { status: 500 });
  }
}
