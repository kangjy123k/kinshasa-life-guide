import { NextRequest, NextResponse } from "next/server";
import { addSubmission, SubmissionType } from "@/lib/submissions";

export const runtime = "nodejs";

const VALID_TYPES: SubmissionType[] = ["merchant", "hiring", "jobseeker", "secondhand", "luggage", "purchase"];

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
    const record = await addSubmission(type, data);
    return NextResponse.json({ ok: true, id: record.id, status: record.status });
  } catch (e: unknown) {
    console.error("submit error:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
