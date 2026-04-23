import { createClient, type Client } from "@libsql/client/web";
import { list } from "@vercel/blob";

export type SubmissionType =
  | "merchant"
  | "secondhand"
  | "purchase"
  | "survey"
  | "event";

export interface SubmissionRecord {
  id: string;
  type: SubmissionType;
  timestamp: string;
  status: "pending" | "approved" | "rejected";
  data: Record<string, string>;
  ownerToken?: string | null;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS user_submission (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL,
    owner_token TEXT,
    data_json TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_submission_owner
    ON user_submission(owner_token, timestamp DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_user_submission_status_time
    ON user_submission(status, timestamp DESC)`,
  `CREATE TABLE IF NOT EXISTS kv_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
];

const BLOB_KEY = "submissions/all.json";
const MIGRATE_KEY = "submissions_blob_migrated_at";

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

async function importFromBlob(): Promise<number> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return 0;
  const { blobs } = await list({ prefix: "submissions/" });
  const existing = blobs.find((b) => b.pathname === BLOB_KEY);
  if (!existing) return 0;
  const res = await fetch(`${existing.downloadUrl}?_=${Date.now()}`, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return 0;
  const store = (await res.json()) as {
    records?: Array<{ id: string; type: string; timestamp: string; status: string; data: Record<string, string> }>;
  };
  const records = store?.records ?? [];
  let imported = 0;
  for (const r of records) {
    if (!r?.id || !r?.type) continue;
    try {
      await db().execute({
        sql: `INSERT OR IGNORE INTO user_submission
              (id, type, timestamp, status, owner_token, data_json)
              VALUES (?, ?, ?, ?, NULL, ?)`,
        args: [
          String(r.id),
          String(r.type),
          String(r.timestamp ?? new Date().toISOString()),
          String(r.status ?? "pending"),
          JSON.stringify(r.data ?? {}),
        ],
      });
      imported++;
    } catch {
      /* skip broken row */
    }
  }
  return imported;
}

async function ensureSchema() {
  if (schemaReady) return;
  for (const sql of SCHEMA) {
    await db().execute(sql);
  }

  const { rows } = await db().execute({
    sql: "SELECT value FROM kv_meta WHERE key = ?",
    args: [MIGRATE_KEY],
  });
  if (rows.length === 0) {
    try {
      await importFromBlob();
      await db().execute({
        sql: "INSERT OR REPLACE INTO kv_meta (key, value) VALUES (?, ?)",
        args: [MIGRATE_KEY, new Date().toISOString()],
      });
    } catch (e) {
      console.error("[submissions] blob migration failed (will retry next request):", e);
      // 不写 MIGRATE_KEY，下次再试
    }
  }

  schemaReady = true;
}

function rowToRecord(r: Record<string, unknown>): SubmissionRecord {
  let data: Record<string, string> = {};
  try {
    const parsed = JSON.parse(String(r.data_json ?? "{}"));
    if (parsed && typeof parsed === "object") data = parsed as Record<string, string>;
  } catch {
    /* ignore */
  }
  return {
    id: String(r.id),
    type: String(r.type) as SubmissionType,
    timestamp: String(r.timestamp),
    status: String(r.status) as SubmissionRecord["status"],
    data,
    ownerToken: r.owner_token == null ? null : String(r.owner_token),
  };
}

export async function addSubmission(
  type: SubmissionType,
  data: Record<string, string>,
  ownerToken: string | null = null,
): Promise<SubmissionRecord> {
  await ensureSchema();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date().toISOString();
  await db().execute({
    sql: `INSERT INTO user_submission
          (id, type, timestamp, status, owner_token, data_json)
          VALUES (?, ?, ?, 'pending', ?, ?)`,
    args: [id, type, timestamp, ownerToken, JSON.stringify(data)],
  });
  return { id, type, timestamp, status: "pending", data, ownerToken };
}

export async function listSubmissions(): Promise<SubmissionRecord[]> {
  await ensureSchema();
  const { rows } = await db().execute({
    sql: `SELECT id, type, timestamp, status, owner_token, data_json
          FROM user_submission
          ORDER BY timestamp DESC`,
    args: [],
  });
  return rows.map((r) => rowToRecord(r as unknown as Record<string, unknown>));
}

export async function updateSubmissionStatus(
  id: string,
  status: SubmissionRecord["status"],
): Promise<SubmissionRecord | null> {
  await ensureSchema();
  await db().execute({
    sql: "UPDATE user_submission SET status = ? WHERE id = ?",
    args: [status, id],
  });
  const { rows } = await db().execute({
    sql: `SELECT id, type, timestamp, status, owner_token, data_json
          FROM user_submission WHERE id = ?`,
    args: [id],
  });
  if (rows.length === 0) return null;
  return rowToRecord(rows[0] as unknown as Record<string, unknown>);
}

export async function deleteSubmission(id: string): Promise<boolean> {
  await ensureSchema();
  const res = await db().execute({
    sql: "DELETE FROM user_submission WHERE id = ?",
    args: [id],
  });
  return (res.rowsAffected ?? 0) > 0;
}

export async function listByOwner(ownerToken: string): Promise<SubmissionRecord[]> {
  await ensureSchema();
  if (!ownerToken || ownerToken.length < 8 || ownerToken.length > 128) return [];
  const { rows } = await db().execute({
    sql: `SELECT id, type, timestamp, status, owner_token, data_json
          FROM user_submission
          WHERE owner_token = ?
          ORDER BY timestamp DESC`,
    args: [ownerToken],
  });
  return rows.map((r) => rowToRecord(r as unknown as Record<string, unknown>));
}

export async function deleteByOwner(id: string, ownerToken: string): Promise<boolean> {
  await ensureSchema();
  if (!ownerToken || !id) return false;
  const res = await db().execute({
    sql: "DELETE FROM user_submission WHERE id = ? AND owner_token = ?",
    args: [id, ownerToken],
  });
  return (res.rowsAffected ?? 0) > 0;
}

/**
 * 本人编辑已提交的内容。任何状态（pending / approved / rejected）都允许编辑，
 * 编辑后 status 一律重置为 pending 等管理员重新审核；timestamp 不动以保留创建顺序。
 * 商家动态 updates 字段保留不被覆盖。
 */
export async function updateByOwner(
  id: string,
  ownerToken: string,
  newData: Record<string, string>,
): Promise<SubmissionRecord | null> {
  await ensureSchema();
  if (!id || !ownerToken) return null;
  const { rows } = await db().execute({
    sql: `SELECT data_json FROM user_submission WHERE id = ? AND owner_token = ?`,
    args: [id, ownerToken],
  });
  if (rows.length === 0) return null;
  let existing: Record<string, string> = {};
  try {
    const parsed = JSON.parse(String((rows[0] as unknown as { data_json: string }).data_json ?? "{}"));
    if (parsed && typeof parsed === "object") existing = parsed as Record<string, string>;
  } catch {
    /* ignore */
  }
  const merged: Record<string, string> = { ...newData };
  // 保留 updates（商家动态）等内部字段，只以 newData 覆盖表单显式写入的字段
  if (existing.updates) merged.updates = existing.updates;
  const res = await db().execute({
    sql: `UPDATE user_submission
          SET data_json = ?, status = 'pending'
          WHERE id = ? AND owner_token = ?
          RETURNING id, type, timestamp, status, owner_token, data_json`,
    args: [JSON.stringify(merged), id, ownerToken],
  });
  if (res.rows.length === 0) return null;
  return rowToRecord(res.rows[0] as unknown as Record<string, unknown>);
}

export interface MerchantUpdate {
  id: string;
  at: string;
  text: string;
  images?: string[];
}

const MAX_UPDATES = 20;

export async function appendMerchantUpdate(
  submissionId: string,
  ownerToken: string,
  entry: { text: string; images?: string[] },
): Promise<MerchantUpdate | null> {
  await ensureSchema();
  if (!submissionId || !ownerToken) return null;
  const { rows } = await db().execute({
    sql: `SELECT id, type, status, data_json
          FROM user_submission
          WHERE id = ? AND owner_token = ?`,
    args: [submissionId, ownerToken],
  });
  if (rows.length === 0) return null;
  const row = rows[0] as unknown as {
    type: string;
    status: string;
    data_json: string;
  };
  if (row.type !== "merchant") return null;
  // 只允许审核通过的商家发布动态
  if (row.status !== "approved") return null;
  let data: Record<string, string> = {};
  try {
    const parsed = JSON.parse(String(row.data_json ?? "{}"));
    if (parsed && typeof parsed === "object") data = parsed as Record<string, string>;
  } catch {
    /* ignore */
  }
  let existing: MerchantUpdate[] = [];
  if (data.updates) {
    try {
      const parsed = JSON.parse(data.updates);
      if (Array.isArray(parsed)) existing = parsed.filter((u) => u && typeof u === "object");
    } catch {
      /* 破损就重置 */
    }
  }
  const trimmedText = entry.text.trim().slice(0, 500);
  if (!trimmedText) return null;
  const cleanImages = (entry.images ?? [])
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u) || u.startsWith("/api/media/"))
    .slice(0, 6);
  const newEntry: MerchantUpdate = {
    id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    text: trimmedText,
    ...(cleanImages.length ? { images: cleanImages } : {}),
  };
  const next = [newEntry, ...existing].slice(0, MAX_UPDATES);
  const nextData = { ...data, updates: JSON.stringify(next) };
  await db().execute({
    sql: "UPDATE user_submission SET data_json = ? WHERE id = ? AND owner_token = ?",
    args: [JSON.stringify(nextData), submissionId, ownerToken],
  });
  return newEntry;
}

export async function deleteMerchantUpdate(
  submissionId: string,
  ownerToken: string,
  updateId: string,
): Promise<boolean> {
  await ensureSchema();
  if (!submissionId || !ownerToken || !updateId) return false;
  const { rows } = await db().execute({
    sql: `SELECT data_json FROM user_submission
          WHERE id = ? AND owner_token = ?`,
    args: [submissionId, ownerToken],
  });
  if (rows.length === 0) return false;
  const row = rows[0] as unknown as { data_json: string };
  let data: Record<string, string> = {};
  try {
    const parsed = JSON.parse(String(row.data_json ?? "{}"));
    if (parsed && typeof parsed === "object") data = parsed as Record<string, string>;
  } catch {
    return false;
  }
  if (!data.updates) return false;
  let arr: MerchantUpdate[] = [];
  try {
    const parsed = JSON.parse(data.updates);
    if (Array.isArray(parsed)) arr = parsed;
  } catch {
    return false;
  }
  const next = arr.filter((u) => u.id !== updateId);
  if (next.length === arr.length) return false;
  const nextData = { ...data, updates: JSON.stringify(next) };
  await db().execute({
    sql: "UPDATE user_submission SET data_json = ? WHERE id = ? AND owner_token = ?",
    args: [JSON.stringify(nextData), submissionId, ownerToken],
  });
  return true;
}
