import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_MODEL = "gemini-2.5-flash-preview-tts";
const VOICE = "Kore";

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

async function fetchCachedWav(cacheKey: string): Promise<Buffer | null> {
  const url = privateBlobUrl(`audio/${cacheKey}.wav`);
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

async function storeWav(cacheKey: string, wav: Buffer): Promise<void> {
  const pathname = `audio/${cacheKey}.wav`;
  await put(pathname, wav, {
    access: "private" as "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "audio/wav",
  });
}

function wavResponse(wav: Buffer): NextResponse {
  return new NextResponse(new Uint8Array(wav), {
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
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
      const buf = await fetchCachedWav(cacheKey);
      if (buf) {
        return wavResponse(buf);
      }
    }

    // 2) 调 Gemini 生成
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "missing_api_key", hint: "Set GEMINI_API_KEY in .env.local" },
        { status: 503 }
      );
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
    const prompt = `Lis à voix haute en français, sur un ton poli et naturel: ${text}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: VOICE },
          },
        },
      },
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("gemini tts failed:", res.status, detail.slice(0, 400));
      return NextResponse.json(
        { error: "gemini_failed", status: res.status },
        { status: 502 }
      );
    }
    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!part?.data) {
      return NextResponse.json({ error: "no_audio" }, { status: 502 });
    }
    const mime: string = part.mimeType ?? "audio/L16;rate=24000";
    const rateMatch = /rate=(\d+)/.exec(mime);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    const pcm = Buffer.from(part.data, "base64");
    const wav = pcmToWav(pcm, sampleRate);

    // 3) 有 cacheKey 就 await 写入 blob（保证下次命中），写失败只记录
    if (cacheKey) {
      try {
        await storeWav(cacheKey, wav);
      } catch (e) {
        console.error("blob store failed:", e);
      }
    }
    return wavResponse(wav);
  } catch (e) {
    console.error("speak error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcm.copy(buffer, 44);
  return buffer;
}
