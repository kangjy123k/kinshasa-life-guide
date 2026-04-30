import { NextRequest, NextResponse } from "next/server";
import {
  listForCard,
  getMyVotes,
  type RecordingTarget,
} from "@/lib/fwod-recording";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ownerToken(req: NextRequest): string | null {
  const c = req.cookies.get("klg_owner")?.value;
  if (c && /^[a-f0-9]{16,64}$/i.test(c)) return c;
  const h = req.headers.get("x-owner-token");
  if (h && /^[a-f0-9]{16,64}$/i.test(h)) return h;
  return null;
}

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const date = u.searchParams.get("date") ?? "";
  const target = (u.searchParams.get("target") ?? "word") as RecordingTarget;
  const owner = ownerToken(req);
  try {
    const items = await listForCard({ date, target, ownerToken: owner });
    const myVotes = owner
      ? await getMyVotes({ recordingIds: items.map((i) => i.id), voterToken: owner })
      : {};
    return NextResponse.json(
      { ok: true, items, myVotes, ownerToken: owner },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("fwod recording list error:", e);
    return NextResponse.json(
      { ok: false, items: [], myVotes: {} },
      { status: 500 },
    );
  }
}
