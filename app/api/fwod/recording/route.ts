import { NextRequest, NextResponse } from "next/server";
import { saveMedia } from "@/lib/media";
import { addRecording, type RecordingTarget } from "@/lib/fwod-recording";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 1_500_000;
const ALLOWED_AUDIO_MIME = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);

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
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "missing audio" }, { status: 400 });
    }
    const mime = (file.type || "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_AUDIO_MIME.has(mime)) {
      return NextResponse.json(
        { ok: false, error: `unsupported audio: ${mime}` },
        { status: 415 },
      );
    }
    if (file.size > MAX_AUDIO_BYTES || file.size === 0) {
      return NextResponse.json(
        { ok: false, error: `audio size out of range (${file.size}B)` },
        { status: 413 },
      );
    }
    const date = String(form.get("date") ?? "");
    const word = String(form.get("word") ?? "").slice(0, 64);
    const target = String(form.get("target") ?? "word") as RecordingTarget;
    const visibility = String(form.get("visibility") ?? "private") as
      | "private"
      | "pending";
    const gender = String(form.get("gender") ?? "").slice(0, 8);
    const region = String(form.get("region") ?? "").slice(0, 16);

    const ownerToken = resolveOwnerToken(req);
    const buf = new Uint8Array(await file.arrayBuffer());
    const { id: audioId } = await saveMedia({ bytes: buf, mime, scope: "fwod-rec" });

    const record = await addRecording({
      date,
      word,
      target,
      audioId,
      ownerToken,
      visibility,
      gender,
      region,
    });

    const res = NextResponse.json({
      ok: true,
      recording: record,
      audioUrl: `/api/media/${audioId}`,
      ownerToken,
    });
    res.cookies.set(OWNER_COOKIE, ownerToken, {
      path: "/",
      maxAge: TEN_YEARS,
      sameSite: "lax",
      httpOnly: false,
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "server_error";
    console.error("fwod recording upload error:", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
