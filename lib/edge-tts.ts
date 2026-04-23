import WebSocket, { type RawData } from "ws";
import { createHash } from "node:crypto";

/**
 * 微软 Edge 朗读 API（非官方，免费 Azure Neural TTS）
 * 协议：wss 发 speech.config + ssml，二进制消息头含 "Path:audio"，
 *      末尾文本消息 "Path:turn.end" 收尾。
 * 自 2024 起需要 Sec-MS-GEC 签名（基于 trusted token + 5 分钟窗口的 SHA256）。
 */
const ENDPOINT =
  "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const TRUSTED_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
// 这两个要跟上 Edge 版本；微软会校验 UA / Sec-MS-GEC-Version。
// 跟 python edge-tts 对齐（2026-04 实测版本）。
const CHROMIUM_FULL = "143.0.3650.75";
const CHROMIUM_MAJOR = "143";
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL}`;
const USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR}.0.0.0`;

function generateSecMsGec(): string {
  // Windows file time = 100ns intervals since 1601-01-01 UTC
  // 1601→1970 之间秒数 = 11644473600
  const TICKS_PER_SEC = BigInt(10000000);
  const FIVE_MIN_TICKS = BigInt(3000000000); // 300 秒 × 1e7
  let ticks = BigInt(Math.floor(Date.now() / 1000 + 11644473600)) * TICKS_PER_SEC;
  ticks -= ticks % FIVE_MIN_TICKS;
  return createHash("sha256")
    .update(`${ticks}${TRUSTED_TOKEN}`, "ascii")
    .digest("hex")
    .toUpperCase();
}

const CONFIG = {
  context: {
    synthesis: {
      audio: {
        metadataoptions: {
          sentenceBoundaryEnabled: "false",
          wordBoundaryEnabled: "false",
        },
        outputFormat: "audio-24khz-48kbitrate-mono-mp3",
      },
    },
  },
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSsml(text: string, voice: string, rate = "+0%", pitch = "+0Hz"): string {
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="fr-FR">` +
    `<voice name="${voice}">` +
    `<prosody rate="${rate}" pitch="${pitch}">${escapeXml(text)}</prosody>` +
    `</voice>` +
    `</speak>`
  );
}

function hex32(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function generateMuid(): string {
  return hex32().toUpperCase();
}

export async function synthesizeEdgeTTS(
  text: string,
  voice = "fr-FR-HenriNeural",
  timeoutMs = 15000,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const connectionId = hex32();
    const requestId = hex32();
    const sec = generateSecMsGec();
    // Sec-MS-GEC 走 query string，muid 走 Cookie header（和 python edge-tts 对齐）
    const url =
      `${ENDPOINT}?TrustedClientToken=${TRUSTED_TOKEN}` +
      `&ConnectionId=${connectionId}` +
      `&Sec-MS-GEC=${sec}` +
      `&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;

    const ws = new WebSocket(url, {
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        "User-Agent": USER_AGENT,
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        Cookie: `muid=${generateMuid()};`,
      },
    });

    const chunks: Buffer[] = [];
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        ws.terminate();
      } catch {
        /* noop */
      }
      reject(new Error("edge-tts timeout"));
    }, timeoutMs);

    const finish = (ok: boolean, err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* noop */
      }
      if (ok) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(err ?? new Error("edge-tts failed"));
      }
    };

    ws.on("open", () => {
      const ts = new Date().toISOString();
      const cfg =
        `X-Timestamp:${ts}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        JSON.stringify(CONFIG);
      ws.send(cfg);

      const ssml =
        `X-RequestId:${requestId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${ts}\r\n` +
        `Path:ssml\r\n\r\n` +
        buildSsml(text, voice);
      ws.send(ssml);
    });

    ws.on("message", (data: RawData, isBinary: boolean) => {
      if (isBinary) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        if (buf.length < 2) return;
        const headerLen = buf.readUInt16BE(0);
        const body = buf.slice(2 + headerLen);
        if (body.length) chunks.push(body);
      } else {
        const txt = data.toString();
        if (txt.includes("Path:turn.end")) {
          if (chunks.length === 0) {
            finish(false, new Error("edge-tts returned no audio"));
          } else {
            finish(true);
          }
        }
      }
    });

    ws.on("error", (err: Error) => finish(false, err));
    ws.on("close", () => {
      if (!settled) {
        if (chunks.length > 0) finish(true);
        else finish(false, new Error("edge-tts closed with no audio"));
      }
    });
  });
}
