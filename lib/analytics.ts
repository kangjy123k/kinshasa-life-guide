import { put, list } from "@vercel/blob";
import { tzDateString, tzHour } from "./tz";

const BLOB_KEY = "analytics/visits.json";

export interface VisitRecord {
  timestamp: string;
  date: string;       // YYYY-MM-DD
  hour: number;
  ua: string;
  referer: string;
  ip: string;
}

export interface AnalyticsData {
  totalVisits: number;
  visits: VisitRecord[];
}

async function readData(): Promise<AnalyticsData> {
  const empty: AnalyticsData = { totalVisits: 0, visits: [] };
  try {
    const { blobs } = await list({ prefix: "analytics/" });
    const existing = blobs.find((b) => b.pathname === BLOB_KEY);
    if (!existing) return empty;

    const res = await fetch(existing.downloadUrl, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    });
    if (!res.ok) return empty;
    return (await res.json()) as AnalyticsData;
  } catch {
    return empty;
  }
}

export async function recordVisit(record: Omit<VisitRecord, "date" | "hour">) {
  const data = await readData();

  const date = tzDateString(record.timestamp);
  const hour = tzHour(record.timestamp);

  // 只保留最近 5000 条明细，防止 blob 过大
  const visits = [...data.visits, { ...record, date, hour }].slice(-5000);

  const updated: AnalyticsData = {
    totalVisits: data.totalVisits + 1,
    visits,
  };

  await put(BLOB_KEY, JSON.stringify(updated), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });

  return updated.totalVisits;
}

export async function getAnalytics(): Promise<AnalyticsData> {
  return readData();
}
