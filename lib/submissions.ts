import { put, list } from "@vercel/blob";

export type SubmissionType = "merchant" | "hiring" | "jobseeker" | "secondhand" | "luggage";

export interface SubmissionRecord {
  id: string;
  type: SubmissionType;
  timestamp: string;
  status: "pending" | "approved" | "rejected";
  data: Record<string, string>;
}

const BLOB_KEY = "submissions/all.json";

interface SubmissionStore {
  records: SubmissionRecord[];
}

async function readStore(): Promise<SubmissionStore> {
  const empty: SubmissionStore = { records: [] };
  try {
    const { blobs } = await list({ prefix: "submissions/" });
    const existing = blobs.find((b) => b.pathname === BLOB_KEY);
    if (!existing) return empty;
    const res = await fetch(`${existing.downloadUrl}?_=${Date.now()}`, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return empty;
    return (await res.json()) as SubmissionStore;
  } catch {
    return empty;
  }
}

export async function addSubmission(
  type: SubmissionType,
  data: Record<string, string>
): Promise<SubmissionRecord> {
  const store = await readStore();
  const record: SubmissionRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp: new Date().toISOString(),
    status: "pending",
    data,
  };
  const records = [...store.records, record].slice(-2000);
  await put(BLOB_KEY, JSON.stringify({ records }), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return record;
}

export async function listSubmissions(): Promise<SubmissionRecord[]> {
  const store = await readStore();
  return store.records.slice().reverse();
}

export async function updateSubmissionStatus(
  id: string,
  status: SubmissionRecord["status"]
): Promise<SubmissionRecord | null> {
  const store = await readStore();
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  store.records[idx].status = status;
  await put(BLOB_KEY, JSON.stringify(store), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return store.records[idx];
}

export async function deleteSubmission(id: string): Promise<boolean> {
  const store = await readStore();
  const before = store.records.length;
  store.records = store.records.filter((r) => r.id !== id);
  if (store.records.length === before) return false;
  await put(BLOB_KEY, JSON.stringify(store), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return true;
}
