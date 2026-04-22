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
export const EVENTS: OfflineEvent[] = [
  {
    id: "chinese-new-year-gala-2026",
    title: "刚果金华人 2026 春节联欢晚会",
    organizer: "刚果金华人华侨联合会",
    date: "2026-02-14",
    timeHint: "18:30 入场 · 19:30 开席",
    venue: "Pullman Kinshasa Grand Hotel · Grand Ballroom",
    area: "金沙萨 Gombe 区",
    feeHint: "1500 USD / 整桌 · 180 USD / 单人票",
    tagline: "千人团圆饭 · 抽奖 · 文艺演出 · 华人企业家之夜",
    description:
      "2026 年春节前夕，与上千名在刚果金打拼的同胞一起吃一顿年夜饭。晚会设家宴、文艺演出、幸运抽奖、企业家颁奖礼，支持组团包桌。",
    tags: ["春节", "晚宴", "千人"],
    featured: true,
  },
  {
    id: "kinshasa-chinese-badminton-league-2026-05",
    title: "金沙萨华人羽毛球月赛（五月场）",
    organizer: "Kin 羽毛球俱乐部",
    date: "2026-05-11",
    timeHint: "周六 15:00–21:00",
    venue: "American School of Kinshasa · Gym",
    area: "金沙萨 Ngaliema 区",
    feeHint: "报名 20 USD / 人（含场地饮料）",
    tagline: "单打 + 双打两组 · 前三名有奖品",
    description:
      "每月一场的华人羽毛球月赛，单打与混双双组赛制，比完一起吃个大排档。欢迎新朋友，组团有优惠。",
    tags: ["运动", "社交", "月赛"],
  },
  {
    id: "book-club-may-2026",
    title: "金沙萨中文读书会 · 五月专场",
    organizer: "Kin 读书会",
    date: "2026-05-18",
    timeHint: "周日 16:00–18:30",
    venue: "亚洲花园咖啡吧 · Aimer Tower 17F",
    area: "金沙萨 Gombe 区",
    feeHint: "AA 60 USD / 人（含咖啡甜点）",
    tagline: "本月共读《杀死一只知更鸟》",
    description:
      "每月一次的中文读书会，主题分享 + 自由讨论。参与者提前阅读本月书目，现场带一个自己的小观察来交换。",
    tags: ["读书", "社交", "周末"],
  },
];

export function upcomingEvents(now: Date = new Date()): OfflineEvent[] {
  const today = now.toISOString().slice(0, 10);
  return EVENTS.filter((e) => e.date >= today).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

export function getEvent(id: string): OfflineEvent | null {
  return EVENTS.find((e) => e.id === id) ?? null;
}
