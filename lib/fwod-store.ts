import { createClient, type Client } from "@libsql/client/web";
import type { FrenchDailyEntry } from "./french-word-of-the-day";

const SCHEMA = `CREATE TABLE IF NOT EXISTS fwod_entry (
  date TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  pos TEXT NOT NULL DEFAULT '',
  zh TEXT NOT NULL,
  pron TEXT NOT NULL,
  image TEXT NOT NULL,
  tip TEXT NOT NULL DEFAULT '',
  example TEXT NOT NULL DEFAULT '',
  example_zh TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

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
  schemaReady = true;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function rowToEntry(r: Record<string, unknown>): FrenchDailyEntry {
  return {
    date: String(r.date),
    word: String(r.word),
    pos: String(r.pos ?? ""),
    zh: String(r.zh),
    pron: String(r.pron),
    image: String(r.image),
    tip: String(r.tip ?? ""),
    example: String(r.example ?? ""),
    exampleZh: String(r.example_zh ?? ""),
  };
}

export async function listFwod(): Promise<FrenchDailyEntry[]> {
  await ensureSchema();
  const { rows } = await db().execute({
    sql: "SELECT date, word, pos, zh, pron, image, tip, example, example_zh FROM fwod_entry ORDER BY date ASC",
    args: [],
  });
  return rows.map((r) => rowToEntry(r as unknown as Record<string, unknown>));
}

export interface UpsertFwodInput {
  date: string;
  word: string;
  pos?: string;
  zh: string;
  pron: string;
  image: string;
  tip?: string;
  example?: string;
  exampleZh?: string;
}

export async function upsertFwod(
  input: UpsertFwodInput,
): Promise<{ ok: true; entry: FrenchDailyEntry } | { ok: false; reason: string }> {
  await ensureSchema();
  const date = (input.date ?? "").trim();
  if (!DATE_RE.test(date)) return { ok: false, reason: "日期必须为 YYYY-MM-DD" };

  const word = (input.word ?? "").trim();
  const zh = (input.zh ?? "").trim();
  const pron = (input.pron ?? "").trim();
  const image = (input.image ?? "").trim();
  if (!word) return { ok: false, reason: "法文单词不能为空" };
  if (!zh) return { ok: false, reason: "中文释义不能为空" };
  if (!pron) return { ok: false, reason: "近似读音不能为空" };
  if (!image) return { ok: false, reason: "释义图片不能为空" };
  if (!/^https?:\/\/|^\/api\/media\/|^\/fwod\//i.test(image)) {
    return { ok: false, reason: "图片地址非法" };
  }

  const pos = (input.pos ?? "").trim();
  const tip = (input.tip ?? "").trim();
  const example = (input.example ?? "").trim();
  const exampleZh = (input.exampleZh ?? "").trim();
  const now = new Date().toISOString();

  await db().execute({
    sql: `INSERT INTO fwod_entry (date, word, pos, zh, pron, image, tip, example, example_zh, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(date) DO UPDATE SET
            word = excluded.word,
            pos = excluded.pos,
            zh = excluded.zh,
            pron = excluded.pron,
            image = excluded.image,
            tip = excluded.tip,
            example = excluded.example,
            example_zh = excluded.example_zh,
            updated_at = excluded.updated_at`,
    args: [date, word, pos, zh, pron, image, tip, example, exampleZh, now, now],
  });

  return {
    ok: true,
    entry: { date, word, pos, zh, pron, image, tip, example, exampleZh },
  };
}

export async function deleteFwod(date: string): Promise<boolean> {
  await ensureSchema();
  if (!DATE_RE.test(date)) return false;
  const res = await db().execute({
    sql: "DELETE FROM fwod_entry WHERE date = ?",
    args: [date],
  });
  return (res.rowsAffected ?? 0) > 0;
}
