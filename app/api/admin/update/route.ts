import { NextRequest, NextResponse } from "next/server";
import { updateSubmissionStatus, deleteSubmission, SubmissionRecord } from "@/lib/submissions";

export const runtime = "nodejs";

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  const provided = req.headers.get("x-admin-password");
  return provided === expected;
}

const VALID_STATUS: SubmissionRecord["status"][] = ["pending", "approved", "rejected"];

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as { id?: string; action?: string; status?: string };
    if (!body.id) {
      return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
    }
    if (body.action === "delete") {
      const ok = await deleteSubmission(body.id);
      return NextResponse.json({ ok });
    }
    const status = body.status as SubmissionRecord["status"];
    if (!status || !VALID_STATUS.includes(status)) {
      return NextResponse.json({ ok: false, error: "invalid status" }, { status: 400 });
    }
    const updated = await updateSubmissionStatus(body.id, status);
    return NextResponse.json({ ok: !!updated, record: updated });
  } catch (e: unknown) {
    console.error("admin update error:", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
