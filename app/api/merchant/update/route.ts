import { NextRequest, NextResponse } from "next/server";
import {
  appendMerchantUpdate,
  deleteMerchantUpdate,
  setMerchantAvailability,
} from "@/lib/submissions";

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
    const body = (await req.json()) as {
      submissionId?: string;
      kind?: string;
      title?: string;
      text?: string;
      images?: string[];
      dates?: string[];
    };
    const submissionId = typeof body?.submissionId === "string" ? body.submissionId.trim() : "";
    if (!submissionId) {
      return NextResponse.json({ ok: false, error: "missing submissionId" }, { status: 400 });
    }

    // 个人型档期独立保存（不重审）
    if (body.kind === "availability") {
      const dates = Array.isArray(body.dates) ? body.dates : [];
      const result = await setMerchantAvailability(submissionId, token, dates);
      if (!result) {
        return NextResponse.json(
          { ok: false, error: "not found / not owned / not individual / not approved" },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, ...result });
    }

    const title = typeof body?.title === "string" ? body.title : "";
    const text = typeof body?.text === "string" ? body.text : "";
    const images = Array.isArray(body?.images)
      ? body.images.filter((s): s is string => typeof s === "string").slice(0, 6)
      : [];
    if (!title.trim()) {
      return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
    }
    const entry = await appendMerchantUpdate(submissionId, token, { title, text, images });
    if (!entry) {
      return NextResponse.json(
        { ok: false, error: "not found / not owned / not approved" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, update: entry });
  } catch (e) {
    console.error("merchant update error:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = readToken(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as { submissionId?: string; updateId?: string };
    const submissionId = typeof body?.submissionId === "string" ? body.submissionId.trim() : "";
    const updateId = typeof body?.updateId === "string" ? body.updateId.trim() : "";
    if (!submissionId || !updateId) {
      return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
    }
    const ok = await deleteMerchantUpdate(submissionId, token, updateId);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("merchant update delete error:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
