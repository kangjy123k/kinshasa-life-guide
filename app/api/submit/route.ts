import { NextRequest, NextResponse } from "next/server";
import { addSubmission, SubmissionType } from "@/lib/submissions";

export const runtime = "nodejs";

const VALID_TYPES: SubmissionType[] = [
  "merchant",
  "secondhand",
  "purchase",
  "survey",
  "event",
];

const OWNER_COOKIE = "klg_owner";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

function resolveOwnerToken(req: NextRequest): string {
  const existing = req.cookies.get(OWNER_COOKIE)?.value;
  if (existing && /^[a-f0-9]{16,64}$/i.test(existing)) return existing;
  const header = req.headers.get("x-owner-token");
  if (header && /^[a-f0-9]{16,64}$/i.test(header)) return header;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { type?: string; data?: Record<string, unknown> };
    const type = body.type as SubmissionType;
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ ok: false, error: "invalid type" }, { status: 400 });
    }
    const raw = body.data ?? {};
    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string") data[k] = v.slice(0, 2000);
    }
    const token = resolveOwnerToken(req);
    const record = await addSubmission(type, data, token);
    const res = NextResponse.json({
      ok: true,
      id: record.id,
      status: record.status,
      ownerToken: token,
    });
    // httpOnly: false 让客户端可以镜像到 localStorage（微信 webview cookie 偶尔会丢）
    res.cookies.set(OWNER_COOKIE, token, {
      path: "/",
      maxAge: TEN_YEARS,
      sameSite: "lax",
      httpOnly: false,
    });
    return res;
  } catch (e: unknown) {
    console.error("submit error:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
