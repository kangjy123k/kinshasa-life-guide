import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { synthesizeEdgeTTS } from "@/lib/edge-tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VOICE = "fr-FR-HenriNeural";

function safeKey(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 80);
}

function privateBlobUrl(pathname: string): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const storeId = token.split("_")[3]?.toLowerCase();
  if (!storeId) return null;
  return `https://${storeId}.private.blob.vercel-storage.com/${pathname}`;
}

async function fetchCachedMp3(cacheKey: string): Promise<Buffer | null> {
  const url = privateBlobUrl(`audio/${cacheKey}.mp3`);
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function storeMp3(cacheKey: string, mp3: Buffer): Promise<void> {
  const pathname = `audio/${cacheKey}.mp3`;
  await put(pathname, mp3, {
    access: "private" as "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "audio/mpeg",
  });
}

function mp3Response(mp3: Buffer): NextResponse {
  return new NextResponse(new Uint8Array(mp3), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { text, cacheKey: rawKey } = (await req.json()) as {
      text?: string;
      cacheKey?: string;
    };
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "missing text" }, { status: 400 });
    }
    const cacheKey = rawKey ? safeKey(rawKey) : null;

    // 1) 命中缓存：直接用固定 URL 拉 Blob（省掉 list 那一次 Advanced op）
    if (cacheKey) {
      const buf = await fetchCachedMp3(cacheKey);
      if (buf) return mp3Response(buf);
    }

    // 2) 调 Edge TTS（fr-FR-HenriNeural 男声，Azure Neural 同款引擎）
    let mp3: Buffer;
    try {
      mp3 = await synthesizeEdgeTTS(text.slice(0, 2000), VOICE);
    } catch (e) {
      console.error("edge tts failed:", e);
      return NextResponse.json({ error: "tts_failed" }, { status: 502 });
    }

    // 3) 有 cacheKey 就 await 写入 blob（保证下次命中），写失败只记录
    if (cacheKey) {
      try {
        await storeMp3(cacheKey, mp3);
      } catch (e) {
        console.error("blob store failed:", e);
      }
    }
    return mp3Response(mp3);
  } catch (e) {
    console.error("speak error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
