import { createClient, type Client } from "@libsql/client/web";

export type RecordingTarget = "word" | "example";
export type RecordingVisibility = "private" | "pending" | "approved" | "rejected";
export type VoteValue = "like" | "dislike";

export interface RecordingRow {
  id: string;
  date: string;
  word: string;
  target: RecordingTarget;
  audioId: string;
  ownerToken: string;
  visibility: RecordingVisibility;
  gender: string;
  region: string;
  likes: number;
  dislikes: number;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS fwod_recording (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    word TEXT NOT NULL,
    target TEXT NOT NULL,
    audio_id TEXT NOT NULL,
    owner_token TEXT NOT NULL,
    visibility TEXT NOT NULL,
    gender TEXT NOT NULL DEFAULT '',
    region TEXT NOT NULL DEFAULT '',
    likes INTEGER NOT NULL DEFAULT 0,
    dislikes INTEGER NOT NULL DEFAULT 0,
    reject_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fwod_rec_date_target_vis
    ON fwod_recording(date, target, visibility, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_fwod_rec_owner
    ON fwod_recording(owner_token, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS fwod_recording_vote (
    recording_id TEXT NOT NULL,
    voter_token TEXT NOT NULL,
    vote TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (recording_id, voter_token)
  )`,
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-f0-9]{8,48}$/i;
const TOKEN_RE = /^[a-f0-9]{16,64}$/i;

function randId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function rowToRecording(r: Record<string, unknown>): RecordingRow {
  return {
    id: String(r.id),
    date: String(r.date),
    word: String(r.word),
    target: (String(r.target) === "example" ? "example" : "word") as RecordingTarget,
    audioId: String(r.audio_id),
    ownerToken: String(r.owner_token),
    visibility: String(r.visibility) as RecordingVisibility,
    gender: String(r.gender ?? ""),
    region: String(r.region ?? ""),
    likes: Number(r.likes ?? 0),
    dislikes: Number(r.dislikes ?? 0),
    rejectReason: r.reject_reason == null ? null : String(r.reject_reason),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export interface AddRecordingInput {
  date: string;
  word: string;
  target: RecordingTarget;
  audioId: string;
  ownerToken: string;
  visibility: "private" | "pending";
  gender?: string;
  region?: string;
}

export async function addRecording(input: AddRecordingInput): Promise<RecordingRow> {
  await ensureSchema();
  if (!DATE_RE.test(input.date)) throw new Error("invalid date");
  if (!input.word) throw new Error("missing word");
  if (input.target !== "word" && input.target !== "example") throw new Error("invalid target");
  if (!ID_RE.test(input.audioId)) throw new Error("invalid audio_id");
  if (!TOKEN_RE.test(input.ownerToken)) throw new Error("invalid owner");
  if (input.visibility !== "private" && input.visibility !== "pending") {
    throw new Error("visibility must be private or pending");
  }
  const id = randId();
  const now = new Date().toISOString();
  const gender = (input.gender ?? "").slice(0, 8);
  const region = (input.region ?? "").slice(0, 16);
  await db().execute({
    sql: `INSERT INTO fwod_recording
          (id, date, word, target, audio_id, owner_token, visibility, gender, region, likes, dislikes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
    args: [
      id,
      input.date,
      input.word,
      input.target,
      input.audioId,
      input.ownerToken,
      input.visibility,
      gender,
      region,
      now,
      now,
    ],
  });
  return {
    id,
    date: input.date,
    word: input.word,
    target: input.target,
    audioId: input.audioId,
    ownerToken: input.ownerToken,
    visibility: input.visibility,
    gender,
    region,
    likes: 0,
    dislikes: 0,
    rejectReason: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 拉取页面气泡需要的列表：审核通过的所有人 + 自己未公开的（private/pending）。
 * 已 reject 的对所有人隐藏（包括自己）。
 */
export async function listForCard(params: {
  date: string;
  target: RecordingTarget;
  ownerToken?: string | null;
}): Promise<RecordingRow[]> {
  await ensureSchema();
  if (!DATE_RE.test(params.date)) return [];
  const target = params.target === "example" ? "example" : "word";
  const owner = params.ownerToken && TOKEN_RE.test(params.ownerToken) ? params.ownerToken : null;
  const sql = owner
    ? `SELECT * FROM fwod_recording
       WHERE date = ? AND target = ?
         AND (visibility = 'approved' OR (owner_token = ? AND visibility IN ('private', 'pending')))
       ORDER BY visibility = 'approved' DESC, created_at DESC`
    : `SELECT * FROM fwod_recording
       WHERE date = ? AND target = ? AND visibility = 'approved'
       ORDER BY created_at DESC`;
  const args = owner ? [params.date, target, owner] : [params.date, target];
  const { rows } = await db().execute({ sql, args });
  return rows.map((r) => rowToRecording(r as unknown as Record<string, unknown>));
}

/** 用户自己的所有录音（含 rejected — 让 ta 知道为什么没出现） */
export async function listMine(ownerToken: string): Promise<RecordingRow[]> {
  await ensureSchema();
  if (!TOKEN_RE.test(ownerToken)) return [];
  const { rows } = await db().execute({
    sql: `SELECT * FROM fwod_recording WHERE owner_token = ? ORDER BY created_at DESC`,
    args: [ownerToken],
  });
  return rows.map((r) => rowToRecording(r as unknown as Record<string, unknown>));
}

/** 已跟读 X 个词 / X 个例句（按 date+target 去重；rejected 也算 — 用户的努力就是数） */
export async function getMyStats(
  ownerToken: string,
): Promise<{ wordCount: number; exampleCount: number }> {
  await ensureSchema();
  if (!TOKEN_RE.test(ownerToken)) return { wordCount: 0, exampleCount: 0 };
  const { rows } = await db().execute({
    sql: `SELECT target, COUNT(DISTINCT date) AS c
          FROM fwod_recording
          WHERE owner_token = ?
          GROUP BY target`,
    args: [ownerToken],
  });
  let wordCount = 0;
  let exampleCount = 0;
  for (const r of rows as unknown as Array<Record<string, unknown>>) {
    const t = String(r.target);
    const c = Number(r.c ?? 0);
    if (t === "word") wordCount = c;
    else if (t === "example") exampleCount = c;
  }
  return { wordCount, exampleCount };
}

export async function getRecording(id: string): Promise<RecordingRow | null> {
  await ensureSchema();
  if (!ID_RE.test(id)) return null;
  const { rows } = await db().execute({
    sql: `SELECT * FROM fwod_recording WHERE id = ?`,
    args: [id],
  });
  if (rows.length === 0) return null;
  return rowToRecording(rows[0] as unknown as Record<string, unknown>);
}

/** 切换可见性：用户把私有 → pending（提审），或撤回 pending → private */
export async function setOwnVisibility(params: {
  id: string;
  ownerToken: string;
  visibility: "private" | "pending";
}): Promise<RecordingRow | null> {
  await ensureSchema();
  if (!ID_RE.test(params.id) || !TOKEN_RE.test(params.ownerToken)) return null;
  const now = new Date().toISOString();
  const res = await db().execute({
    sql: `UPDATE fwod_recording
          SET visibility = ?, updated_at = ?
          WHERE id = ? AND owner_token = ? AND visibility IN ('private', 'pending')`,
    args: [params.visibility, now, params.id, params.ownerToken],
  });
  if ((res.rowsAffected ?? 0) === 0) return null;
  return getRecording(params.id);
}

export async function deleteOwned(params: {
  id: string;
  ownerToken: string;
}): Promise<boolean> {
  await ensureSchema();
  if (!ID_RE.test(params.id) || !TOKEN_RE.test(params.ownerToken)) return false;
  const res = await db().execute({
    sql: `DELETE FROM fwod_recording WHERE id = ? AND owner_token = ?`,
    args: [params.id, params.ownerToken],
  });
  if ((res.rowsAffected ?? 0) === 0) return false;
  // 投票表里把这条相关的也清掉
  await db().execute({
    sql: `DELETE FROM fwod_recording_vote WHERE recording_id = ?`,
    args: [params.id],
  });
  return true;
}

/**
 * 投票：vote=null 撤回；like/dislike 切换。返回最新计数。
 * 简单 read-modify-write —— 法语词条流量不会大到非要原子操作。
 */
export async function castVote(params: {
  id: string;
  voterToken: string;
  vote: VoteValue | null;
}): Promise<{ likes: number; dislikes: number; my: VoteValue | null } | null> {
  await ensureSchema();
  if (!ID_RE.test(params.id) || !TOKEN_RE.test(params.voterToken)) return null;
  const cur = await getRecording(params.id);
  if (!cur || cur.visibility !== "approved") return null;

  const { rows } = await db().execute({
    sql: `SELECT vote FROM fwod_recording_vote WHERE recording_id = ? AND voter_token = ?`,
    args: [params.id, params.voterToken],
  });
  const existing =
    rows.length > 0 ? (String((rows[0] as unknown as Record<string, unknown>).vote) as VoteValue) : null;

  let likes = cur.likes;
  let dislikes = cur.dislikes;

  if (existing === params.vote) {
    return { likes, dislikes, my: existing };
  }

  // 撤掉旧票
  if (existing === "like") likes = Math.max(0, likes - 1);
  if (existing === "dislike") dislikes = Math.max(0, dislikes - 1);

  // 写新票
  if (params.vote === "like") likes += 1;
  if (params.vote === "dislike") dislikes += 1;

  const now = new Date().toISOString();
  if (params.vote === null) {
    await db().execute({
      sql: `DELETE FROM fwod_recording_vote WHERE recording_id = ? AND voter_token = ?`,
      args: [params.id, params.voterToken],
    });
  } else {
    await db().execute({
      sql: `INSERT INTO fwod_recording_vote (recording_id, voter_token, vote, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(recording_id, voter_token) DO UPDATE SET
              vote = excluded.vote,
              created_at = excluded.created_at`,
      args: [params.id, params.voterToken, params.vote, now],
    });
  }
  await db().execute({
    sql: `UPDATE fwod_recording SET likes = ?, dislikes = ?, updated_at = ? WHERE id = ?`,
    args: [likes, dislikes, now, params.id],
  });
  return { likes, dislikes, my: params.vote };
}

/** 用户对一组录音的投票状态（前端展示已选中状态） */
export async function getMyVotes(params: {
  recordingIds: string[];
  voterToken: string;
}): Promise<Record<string, VoteValue>> {
  await ensureSchema();
  if (!TOKEN_RE.test(params.voterToken) || params.recordingIds.length === 0) return {};
  const ids = params.recordingIds.filter((x) => ID_RE.test(x)).slice(0, 50);
  if (ids.length === 0) return {};
  const placeholders = ids.map(() => "?").join(",");
  const { rows } = await db().execute({
    sql: `SELECT recording_id, vote FROM fwod_recording_vote
          WHERE voter_token = ? AND recording_id IN (${placeholders})`,
    args: [params.voterToken, ...ids],
  });
  const out: Record<string, VoteValue> = {};
  for (const r of rows as unknown as Array<Record<string, unknown>>) {
    out[String(r.recording_id)] = String(r.vote) as VoteValue;
  }
  return out;
}

/* ---------- 管理端 ---------- */

export async function listPending(): Promise<RecordingRow[]> {
  await ensureSchema();
  const { rows } = await db().execute({
    sql: `SELECT * FROM fwod_recording WHERE visibility = 'pending' ORDER BY created_at ASC`,
    args: [],
  });
  return rows.map((r) => rowToRecording(r as unknown as Record<string, unknown>));
}

export async function moderate(params: {
  id: string;
  action: "approve" | "reject";
  reason?: string;
}): Promise<RecordingRow | null> {
  await ensureSchema();
  if (!ID_RE.test(params.id)) return null;
  const now = new Date().toISOString();
  const visibility = params.action === "approve" ? "approved" : "rejected";
  const reason = params.action === "reject" ? (params.reason ?? "").slice(0, 200) : null;
  const res = await db().execute({
    sql: `UPDATE fwod_recording
          SET visibility = ?, reject_reason = ?, updated_at = ?
          WHERE id = ? AND visibility = 'pending'`,
    args: [visibility, reason, now, params.id],
  });
  if ((res.rowsAffected ?? 0) === 0) return null;
  return getRecording(params.id);
}
