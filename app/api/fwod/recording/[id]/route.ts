import { NextRequest, NextResponse } from "next/server";
import { deleteOwned } from "@/lib/fwod-recording";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ownerToken(req: NextRequest): string | null {
  const c = req.cookies.get("klg_owner")?.value;
  if (c && /^[a-f0-9]{16,64}$/i.test(c)) return c;
  const h = req.headers.get("x-owner-token");
  if (h && /^[a-f0-9]{16,64}$/i.test(h)) return h;
  return null;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = ownerToken(req);
  if (!owner) {
    return NextResponse.json({ ok: false, error: "no_owner" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const ok = await deleteOwned({ id, ownerToken: owner });
    if (!ok) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("delete recording error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
