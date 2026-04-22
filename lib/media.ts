// 用户上传图片：只落 Turso，不碰 Vercel Blob
// 思路：
//   - 上传 POST 写一行（user_media 表，bytes 为 BLOB）
//   - 读取 GET /api/media/<id> 直出字节，带 immutable 长缓存 — 之后走 Vercel CDN
//   - 永不调 list()；写一次、读一次（第一次 miss），之后全走 CDN
import { createClient, type Client } from "@libsql/client";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS user_media (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    bytes BLOB NOT NULL,
    uploaded_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_media_time ON user_media(uploaded_at)`,
];

let client: Client | null = null;
let schemaReady = false;

function db(): Client {
  if (!client) {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) throw new Error("DATABASE_URL / TURSO_AUTH_TOKEN not configured");
    client = createClient({ url, authToken });
  }
  return client;
}

async function ensureSchema() {
  if (schemaReady) return;
  for (const sql of SCHEMA) {
    await db().execute(sql);
  }
  schemaReady = true;
}

function randId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function saveMedia(params: {
  bytes: Uint8Array;
  mime: string;
  scope: string;
}): Promise<{ id: string }> {
  await ensureSchema();
  const id = randId();
  const scope = /^[a-z0-9\-]{1,32}$/i.test(params.scope) ? params.scope.toLowerCase() : "merchant";
  await db().execute({
    sql: `INSERT INTO user_media (id, scope, mime, size, bytes, uploaded_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, scope, params.mime, params.bytes.byteLength, params.bytes, new Date().toISOString()],
  });
  return { id };
}

export interface MediaRow {
  id: string;
  mime: string;
  size: number;
  bytes: Uint8Array;
  uploadedAt: string;
}

export async function getMedia(id: string): Promise<MediaRow | null> {
  if (!id || !/^[a-f0-9]{8,48}$/i.test(id)) return null;
  await ensureSchema();
  const { rows } = await db().execute({
    sql: `SELECT id, mime, size, bytes, uploaded_at FROM user_media WHERE id = ?`,
    args: [id],
  });
  if (rows.length === 0) return null;
  const r = rows[0] as unknown as Record<string, unknown>;
  const raw = r.bytes;
  let bytes: Uint8Array;
  if (raw instanceof Uint8Array) {
    bytes = raw;
  } else if (raw instanceof ArrayBuffer) {
    bytes = new Uint8Array(raw);
  } else if (typeof raw === "string") {
    // 兜底：base64
    const bin = atob(raw);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    return null;
  }
  return {
    id: String(r.id),
    mime: String(r.mime),
    size: Number(r.size ?? bytes.byteLength),
    bytes,
    uploadedAt: String(r.uploaded_at),
  };
}
