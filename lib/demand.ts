import { createClient, type Client } from "@libsql/client/web";

export interface ProductDemand {
  id: number;
  name: string;
  votes: number;
  createdAt: string;
  lastVotedAt: string | null;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS product_demand (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_lower TEXT NOT NULL UNIQUE,
    votes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_voted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS product_vote (
    fingerprint TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    voted_at TEXT NOT NULL,
    PRIMARY KEY (fingerprint, product_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_product_vote_fp_time
    ON product_vote(fingerprint, voted_at)`,
];

const SEED_PRODUCTS = [
  "鼠标", "读卡器", "探照灯", "USB 集线器", "移动电源",
  "充电数据线", "万能转换插头", "多口排插/拖线板", "强光手电", "驱蚊液",
  "蚊帐", "保鲜盒", "菜刀/厨具", "老干妈", "火锅底料",
  "方便面", "感冒药 / 退烧药", "保暖毯", "晒衣架", "速食米饭",
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
  // Seed if empty
  const { rows } = await db().execute({
    sql: "SELECT COUNT(*) AS n FROM product_demand",
    args: [],
  });
  const n = Number((rows[0] as unknown as { n: number }).n ?? 0);
  if (n === 0) {
    const now = new Date().toISOString();
    for (const raw of SEED_PRODUCTS) {
      const name = raw.trim();
      const nameLower = name.toLowerCase();
      try {
        await db().execute({
          sql: "INSERT OR IGNORE INTO product_demand (name, name_lower, votes, created_at) VALUES (?, ?, 0, ?)",
          args: [name, nameLower, now],
        });
      } catch {
        /* ignore */
      }
    }
  }
  schemaReady = true;
}

function rowToProduct(r: Record<string, unknown>): ProductDemand {
  return {
    id: Number(r.id),
    name: String(r.name),
    votes: Number(r.votes ?? 0),
    createdAt: String(r.created_at ?? ""),
    lastVotedAt: r.last_voted_at ? String(r.last_voted_at) : null,
  };
}

export async function listProducts(): Promise<ProductDemand[]> {
  await ensureSchema();
  const { rows } = await db().execute({
    sql: "SELECT id, name, votes, created_at, last_voted_at FROM product_demand ORDER BY votes DESC, id ASC",
    args: [],
  });
  return rows.map((r) => rowToProduct(r as unknown as Record<string, unknown>));
}

export async function addProduct(rawName: string): Promise<
  { ok: true; product: ProductDemand } | { ok: false; reason: string }
> {
  await ensureSchema();
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, reason: "商品名不能为空" };
  if (name.length > 24) return { ok: false, reason: "商品名过长（最多 24 字符）" };
  const nameLower = name.toLowerCase();
  const now = new Date().toISOString();

  // Check existing
  const existing = await db().execute({
    sql: "SELECT id, name, votes, created_at, last_voted_at FROM product_demand WHERE name_lower = ?",
    args: [nameLower],
  });
  if (existing.rows.length > 0) {
    return { ok: false, reason: "已有相同商品，可直接搜索找到" };
  }

  await db().execute({
    sql: "INSERT INTO product_demand (name, name_lower, votes, created_at) VALUES (?, ?, 0, ?)",
    args: [name, nameLower, now],
  });
  const { rows } = await db().execute({
    sql: "SELECT id, name, votes, created_at, last_voted_at FROM product_demand WHERE name_lower = ?",
    args: [nameLower],
  });
  return { ok: true, product: rowToProduct(rows[0] as unknown as Record<string, unknown>) };
}

export async function voteProduct(
  productId: number,
  fingerprint: string
): Promise<
  | { ok: true; votes: number }
  | { ok: false; reason: string; cooldownHours?: number }
> {
  await ensureSchema();
  if (!Number.isFinite(productId) || productId <= 0) {
    return { ok: false, reason: "无效商品 id" };
  }
  if (!fingerprint || fingerprint.length < 8 || fingerprint.length > 128) {
    return { ok: false, reason: "无效指纹" };
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const DAY = 24 * 60 * 60 * 1000;
  const thresholdIso = new Date(now - DAY).toISOString();

  // 商品存在性检查（避免孤儿 vote）
  const prod = await db().execute({
    sql: "SELECT id FROM product_demand WHERE id = ?",
    args: [productId],
  });
  if (prod.rows.length === 0) {
    return { ok: false, reason: "商品不存在" };
  }

  // 原子 upsert：首次写入，或旧记录 voted_at <= (now - 24h) 才更新。
  // 并发同指纹请求会被 Turso 写锁串行化：
  //   第一个 INSERT 成功；第二个走 ON CONFLICT 分支但 WHERE 不成立（voted_at 刚被设为 now），rowsAffected=0
  // 仅 rowsAffected=1 才递增 votes，杜绝同一指纹刷票。
  const upsert = await db().execute({
    sql: `INSERT INTO product_vote (fingerprint, product_id, voted_at)
          VALUES (?, ?, ?)
          ON CONFLICT(fingerprint, product_id) DO UPDATE SET voted_at = excluded.voted_at
          WHERE product_vote.voted_at <= ?`,
    args: [fingerprint, productId, nowIso, thresholdIso],
  });

  const applied = Number(upsert.rowsAffected ?? 0) > 0;
  if (!applied) {
    // 找当前记录计算剩余冷却时间（告知用户）
    const prev = await db().execute({
      sql: "SELECT voted_at FROM product_vote WHERE fingerprint = ? AND product_id = ?",
      args: [fingerprint, productId],
    });
    let cooldownHours = 24;
    if (prev.rows.length > 0) {
      const last = Date.parse(String((prev.rows[0] as unknown as { voted_at: string }).voted_at));
      if (Number.isFinite(last)) {
        cooldownHours = Math.max(1, Math.ceil((DAY - (now - last)) / 3600_000));
      }
    }
    return { ok: false, reason: `你已投过票，${cooldownHours} 小时后可再次投`, cooldownHours };
  }

  // vote 写入成功 → 递增 votes（单行 UPDATE 在 Turso 写锁下原子）
  await db().execute({
    sql: "UPDATE product_demand SET votes = votes + 1, last_voted_at = ? WHERE id = ?",
    args: [nowIso, productId],
  });

  const { rows } = await db().execute({
    sql: "SELECT votes FROM product_demand WHERE id = ?",
    args: [productId],
  });
  const votes = Number((rows[0] as unknown as { votes: number }).votes ?? 0);
  return { ok: true, votes };
}
