export interface OfflineEvent {
  id: string;
  title: string;
  organizer: string;
  date: string;       // ISO yyyy-mm-dd
  timeHint?: string;  // "19:00 开席"
  venue: string;
  area: string;
  feeHint?: string;   // "免费 / 200 USD/桌"
  participantRange?: string; // "20 — 50 人"
  tagline?: string;
  description: string;
  poster?: string;    // 图片 URL（第一张作为海报）
  gallery?: string[]; // 其余相册
  contactPerson?: string;
  contactWechat?: string;
  contactPhone?: string;
  contactEmail?: string;
  tags?: string[];
  externalUrl?: string;
  featured?: boolean;
}

// libsql `user_submission` 行 → OfflineEvent
export function submissionToEvent(s: {
  id: string;
  type: string;
  data: Record<string, string>;
}): OfflineEvent | null {
  if (s.type !== "event") return null;
  const d = s.data ?? {};
  const get = (k: string) => (d[k] ?? "").trim();
  const name = get("eventName");
  const date = get("eventDate");
  const venue = get("eventVenue");
  if (!name || !date || !venue) return null;
  const min = get("participantCountMin");
  const max = get("participantCountMax");
  const participantRange = min && max ? `${min} — ${max} 人` : min || max ? `${min || max} 人` : undefined;
  const urls = (get("galleryUrls") || "")
    .split(/\r?\n/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u) || u.startsWith("/api/media/"));
  const [poster, ...restGallery] = urls;
  return {
    id: s.id,
    title: name,
    organizer: get("organizer") || "活动方",
    date,
    venue,
    area: "",
    participantRange,
    description: get("eventDescription"),
    poster,
    gallery: restGallery.length ? restGallery : undefined,
    contactPerson: get("contactPerson") || undefined,
    contactPhone: get("contact_phone") || get("contact_whatsapp") || undefined,
    contactWechat: get("contact_wechat") || undefined,
    contactEmail: get("contact_email") || undefined,
  };
}

// 占位种子 — 上线后由管理员逐步替换
export const EVENTS: OfflineEvent[] = [];

export function upcomingEvents(now: Date = new Date()): OfflineEvent[] {
  const today = now.toISOString().slice(0, 10);
  return EVENTS.filter((e) => e.date >= today).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

export function getEvent(id: string): OfflineEvent | null {
  return EVENTS.find((e) => e.id === id) ?? null;
}
