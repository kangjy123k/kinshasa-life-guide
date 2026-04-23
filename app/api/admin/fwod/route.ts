import { NextRequest, NextResponse } from "next/server";
import { deleteFwod, listFwod, upsertFwod } from "@/lib/fwod-store";

export const runtime = "edge";

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  const provided = req.headers.get("x-admin-password");
  return provided === expected;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const entries = await listFwod();
    return NextResponse.json({ ok: true, entries });
  } catch (e) {
    console.error("admin fwod list error:", e);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      date?: string;
      word?: string;
      pos?: string;
      zh?: string;
      pron?: string;
      image?: string;
      tip?: string;
      example?: string;
      exampleZh?: string;
    };
    const result = await upsertFwod({
      date: body.date ?? "",
      word: body.word ?? "",
      pos: body.pos,
      zh: body.zh ?? "",
      pron: body.pron ?? "",
      image: body.image ?? "",
      tip: body.tip,
      example: body.example,
      exampleZh: body.exampleZh,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
    }
    return NextResponse.json({ ok: true, entry: result.entry });
  } catch (e) {
    console.error("admin fwod upsert error:", e);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const date = new URL(req.url).searchParams.get("date") ?? "";
  const ok = await deleteFwod(date);
  return NextResponse.json({ ok });
}
