import { NextRequest, NextResponse } from "next/server";
import { castVote, type VoteValue } from "@/lib/fwod-recording";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OWNER_COOKIE = "klg_owner";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

function resolveVoter(req: NextRequest): string {
  const c = req.cookies.get(OWNER_COOKIE)?.value;
  if (c && /^[a-f0-9]{16,64}$/i.test(c)) return c;
  const h = req.headers.get("x-owner-token");
  if (h && /^[a-f0-9]{16,64}$/i.test(h)) return h;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { vote?: VoteValue | null };
    const vote =
      body.vote === "like" || body.vote === "dislike" ? body.vote : null;
    const voter = resolveVoter(req);
    const out = await castVote({ id, voterToken: voter, vote });
    if (!out) {
      return NextResponse.json({ ok: false, error: "not_found_or_not_approved" }, { status: 404 });
    }
    const res = NextResponse.json({ ok: true, ...out });
    res.cookies.set(OWNER_COOKIE, voter, {
      path: "/",
      maxAge: TEN_YEARS,
      sameSite: "lax",
      httpOnly: false,
    });
    return res;
  } catch (e) {
    console.error("vote error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
