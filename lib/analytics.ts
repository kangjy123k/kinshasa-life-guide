import { createClient, type Client } from "@libsql/client/web";
import { tzDateString, tzHour } from "./tz";

export interface VisitRecord {
  timestamp: string;
  date: string;
  hour: number;
  ua: string;
  referer: string;
  ip: string;
  country?: string;
  city?: string;
  region?: string;
  latitude?: string;
  longitude?: string;
}

export interface AnalyticsData {
  totalVisits: number;
  visits: VisitRecord[];
}

let client: Client | null = null;
function db(): Client {
  if (!client) {
    const url = process.env.DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
      throw new Error("DATABASE_URL / TURSO_AUTH_TOKEN not configured");
    }
    client = createClient({ url, authToken });
  }
  return client;
}

function toStr(v: unknown): string {
  return v == null ? "" : String(v);
}
function toOpt(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v);
  return s.length ? s : undefined;
}

export async function recordVisit(
  record: Omit<VisitRecord, "date" | "hour">
): Promise<number> {
  const date = tzDateString(record.timestamp);
  const hour = tzHour(record.timestamp);
  const c = db();
  await c.execute({
    sql: `INSERT INTO visits
          (timestamp, date, hour, ua, referer, ip, country, city, region, latitude, longitude)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      record.timestamp,
      date,
      hour,
      record.ua ?? "",
      record.referer ?? "",
      record.ip ?? "",
      record.country ?? null,
      record.city ?? null,
      record.region ?? null,
      record.latitude ?? null,
      record.longitude ?? null,
    ],
  });
  const row = await c.execute("SELECT COUNT(*) AS n FROM visits");
  return Number(row.rows[0]?.n ?? 0);
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const c = db();
  const [countRes, listRes] = await Promise.all([
    c.execute("SELECT COUNT(*) AS n FROM visits"),
    c.execute(
      `SELECT timestamp, date, hour, ua, referer, ip, country, city, region, latitude, longitude
       FROM visits
       ORDER BY id DESC
       LIMIT 5000`
    ),
  ]);
  const totalVisits = Number(countRes.rows[0]?.n ?? 0);
  const visits: VisitRecord[] = listRes.rows.map((r) => ({
    timestamp: toStr(r.timestamp),
    date: toStr(r.date),
    hour: Number(r.hour ?? 0),
    ua: toStr(r.ua),
    referer: toStr(r.referer),
    ip: toStr(r.ip),
    country: toOpt(r.country),
    city: toOpt(r.city),
    region: toOpt(r.region),
    latitude: toOpt(r.latitude),
    longitude: toOpt(r.longitude),
  }));
  return { totalVisits, visits };
}
