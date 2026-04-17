import { createClient, type Client } from "@libsql/client/web";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS qrcode (
  id INTEGER PRIMARY KEY,
  data TEXT,
  mime TEXT DEFAULT 'image/jpeg',
  uploaded_at TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  source_url TEXT,
  last_fetched_at TEXT,
  last_fetch_error TEXT
);
`;

// 一次性把旧库补齐新列（若已存在则忽略错误）
const MIGRATIONS = [
  "ALTER TABLE qrcode ADD COLUMN source_url TEXT",
  "ALTER TABLE qrcode ADD COLUMN last_fetched_at TEXT",
  "ALTER TABLE qrcode ADD COLUMN last_fetch_error TEXT",
];

export interface QrRecord {
  dataBase64: string;
  mime: string;
  uploadedAt: string;
  version: number;
}

export interface QrConfig {
  uploadedAt: string | null;
  version: number;
  sourceUrl: string | null;
  lastFetchedAt: string | null;
  lastFetchError: string | null;
}

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
  await db().execute(SCHEMA);
  for (const sql of MIGRATIONS) {
    try {
      await db().execute(sql);
    } catch {
      // 列已存在 → 忽略
    }
  }
  schemaReady = true;
}

export async function getQrcodeMeta(): Promise<{ uploadedAt: string; version: number } | null> {
  await ensureSchema();
  const { rows } = await db().execute({
    sql: "SELECT uploaded_at, version, data FROM qrcode WHERE id = 1",
    args: [],
  });
  if (!rows.length) return null;
  const r = rows[0] as unknown as { uploaded_at: string | null; version: number; data: string | null };
  if (!r.data || !r.uploaded_at) return null;
  return { uploadedAt: String(r.uploaded_at), version: Number(r.version) };
}

export async function getQrcode(): Promise<QrRecord | null> {
  await ensureSchema();
  const { rows } = await db().execute({
    sql: "SELECT data, mime, uploaded_at, version FROM qrcode WHERE id = 1",
    args: [],
  });
  if (!rows.length) return null;
  const r = rows[0] as unknown as { data: string | null; mime: string | null; uploaded_at: string | null; version: number };
  if (!r.data || !r.uploaded_at) return null;
  return {
    dataBase64: String(r.data),
    mime: String(r.mime ?? "image/jpeg"),
    uploadedAt: String(r.uploaded_at),
    version: Number(r.version),
  };
}

export async function getQrcodeConfig(): Promise<QrConfig> {
  await ensureSchema();
  const { rows } = await db().execute({
    sql: "SELECT uploaded_at, version, source_url, last_fetched_at, last_fetch_error FROM qrcode WHERE id = 1",
    args: [],
  });
  if (!rows.length) {
    return {
      uploadedAt: null,
      version: 0,
      sourceUrl: null,
      lastFetchedAt: null,
      lastFetchError: null,
    };
  }
  const r = rows[0] as unknown as {
    uploaded_at: string | null;
    version: number;
    source_url: string | null;
    last_fetched_at: string | null;
    last_fetch_error: string | null;
  };
  return {
    uploadedAt: r.uploaded_at ?? null,
    version: Number(r.version ?? 0),
    sourceUrl: r.source_url ?? null,
    lastFetchedAt: r.last_fetched_at ?? null,
    lastFetchError: r.last_fetch_error ?? null,
  };
}

async function nextVersion(): Promise<number> {
  const { rows } = await db().execute({
    sql: "SELECT version FROM qrcode WHERE id = 1",
    args: [],
  });
  const prev = rows.length ? Number((rows[0] as unknown as { version: number }).version ?? 0) : 0;
  return prev + 1;
}

export async function setQrcode(dataBase64: string, mime: string): Promise<{ version: number; uploadedAt: string }> {
  await ensureSchema();
  const now = new Date().toISOString();
  const version = await nextVersion();
  await db().execute({
    sql: `INSERT INTO qrcode (id, data, mime, uploaded_at, version, last_fetched_at, last_fetch_error)
          VALUES (1, ?, ?, ?, ?, ?, NULL)
          ON CONFLICT(id) DO UPDATE SET
            data=excluded.data,
            mime=excluded.mime,
            uploaded_at=excluded.uploaded_at,
            version=excluded.version,
            last_fetched_at=excluded.last_fetched_at,
            last_fetch_error=NULL`,
    args: [dataBase64, mime, now, version, now],
  });
  return { version, uploadedAt: now };
}

export async function setSourceUrl(url: string | null): Promise<void> {
  await ensureSchema();
  const trimmed = url?.trim() || null;
  await db().execute({
    sql: `INSERT INTO qrcode (id, source_url, version)
          VALUES (1, ?, 0)
          ON CONFLICT(id) DO UPDATE SET source_url=excluded.source_url`,
    args: [trimmed],
  });
}

async function markFetchError(msg: string): Promise<void> {
  const now = new Date().toISOString();
  await db().execute({
    sql: `INSERT INTO qrcode (id, last_fetched_at, last_fetch_error, version)
          VALUES (1, ?, ?, 0)
          ON CONFLICT(id) DO UPDATE SET last_fetched_at=excluded.last_fetched_at, last_fetch_error=excluded.last_fetch_error`,
    args: [now, msg],
  });
}

/**
 * 从 source_url 拉取最新二维码图片，解码成 base64 后写回。
 * 返回 { refreshed: true } 表示确实抓取并更新了；
 * 返回 { refreshed: false, reason } 表示跳过（无 source_url / 未到周期 / 抓取失败）。
 */
export async function refreshFromSource(opts: { force?: boolean; minIntervalMs?: number } = {}): Promise<
  { refreshed: true; version: number; uploadedAt: string }
  | { refreshed: false; reason: string }
> {
  await ensureSchema();
  const cfg = await getQrcodeConfig();
  if (!cfg.sourceUrl) return { refreshed: false, reason: "no source_url" };

  const minInterval = opts.minIntervalMs ?? 7 * 24 * 60 * 60 * 1000;
  if (!opts.force && cfg.lastFetchedAt) {
    const elapsed = Date.now() - Date.parse(cfg.lastFetchedAt);
    if (elapsed < minInterval) {
      return { refreshed: false, reason: `too soon (${Math.floor(elapsed / 3600_000)}h since last fetch)` };
    }
  }

  try {
    const res = await fetch(cfg.sourceUrl, {
      cache: "no-store",
      headers: { "User-Agent": "klg-qrcode-refresher/1.0" },
    });
    if (!res.ok) {
      await markFetchError(`HTTP ${res.status}`);
      return { refreshed: false, reason: `fetch HTTP ${res.status}` };
    }
    const ctype = res.headers.get("content-type") || "image/jpeg";
    if (!ctype.startsWith("image/")) {
      await markFetchError(`unexpected content-type: ${ctype}`);
      return { refreshed: false, reason: `unexpected content-type: ${ctype}` };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 600_000) {
      await markFetchError(`image too large: ${buf.length} bytes`);
      return { refreshed: false, reason: `image too large (${buf.length} bytes)` };
    }
    const dataBase64 = buf.toString("base64");
    const result = await setQrcode(dataBase64, ctype);
    return { refreshed: true, ...result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch error";
    await markFetchError(msg);
    return { refreshed: false, reason: msg };
  }
}
