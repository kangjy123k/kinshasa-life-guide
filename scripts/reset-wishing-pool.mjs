// 一次性操作：补种许愿池物品 + 所有物品助力值清零 + 清空助力记录
// 跑法（项目根）：node scripts/reset-wishing-pool.mjs
// 需要 .env.local 里的 DATABASE_URL / TURSO_AUTH_TOKEN

import fs from "node:fs";
import { createClient } from "@libsql/client/web";

function loadEnv(path) {
  const text = fs.readFileSync(path, "utf8");
  const env = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

const env = loadEnv(".env.local");
if (!env.DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
  console.error("missing DATABASE_URL / TURSO_AUTH_TOKEN in .env.local");
  process.exit(1);
}

const db = createClient({
  url: env.DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

// "手机被贴支架" 显然是 "手机背贴支架" 的拼音 typo，纠正
const NEW_ITEMS = [
  "电子设备清洁剂", "手机背贴支架", "自行车灯", "补光灯", "鼠标",
  "电纸屏", "储存卡", "读卡器", "防尘面罩", "鼻通",
  "帽子", "驱蚊器", "床单", "板鞋", "泳衣",
  "运动服装", "内裤", "职业装", "充电宝", "卡包",
  "定妆粉", "发箍", "防晒霜", "洗面奶", "眼镜",
  "烧烤套装", "帐篷", "静音耳罩", "拼豆手工材料", "桌游",
  "美甲套装", "假发", "宠物修毛器", "花生酱",
];

async function count(sql) {
  const r = await db.execute(sql);
  return Number(r.rows[0]?.n ?? 0);
}

const beforeP = await count("SELECT COUNT(*) AS n FROM product_demand");
const beforeV = await count("SELECT COUNT(*) AS n FROM product_vote");
console.log(`[before] product_demand=${beforeP}  product_vote=${beforeV}`);

// 1) 补种（name_lower UNIQUE，重复的 OR IGNORE 跳过）
const now = new Date().toISOString();
let added = 0;
for (const name of NEW_ITEMS) {
  const r = await db.execute({
    sql: "INSERT OR IGNORE INTO product_demand (name, name_lower, votes, created_at) VALUES (?, ?, 0, ?)",
    args: [name, name.toLowerCase(), now],
  });
  if (r.rowsAffected > 0) added++;
}
console.log(`[insert] 新增 ${added}/${NEW_ITEMS.length} 条（其余是已有同名）`);

// 2) 所有物品助力值清零
const r2 = await db.execute(
  "UPDATE product_demand SET votes = 0, last_voted_at = NULL"
);
console.log(`[reset]  votes=0 已应用到 ${r2.rowsAffected} 条`);

// 3) 清空助力记录
const r3 = await db.execute("DELETE FROM product_vote");
console.log(`[wipe]   product_vote 已清空 ${r3.rowsAffected} 条`);

// Turso 远端不支持 VACUUM（需要独占访问），但 delete 后的 pages 会在后续
// 写入中被复用，存储配额会回落。

const afterP = await count("SELECT COUNT(*) AS n FROM product_demand");
const afterV = await count("SELECT COUNT(*) AS n FROM product_vote");
console.log(`[after]  product_demand=${afterP}  product_vote=${afterV}`);
