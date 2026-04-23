export interface FrenchDailyEntry {
  /** 该词对应的日期，YYYY-MM-DD（UTC 对齐，本地解读） */
  date: string;
  word: string;
  pos: string;
  zh: string;
  /** 近似中文读音，帮助零基础用户开口 */
  pron: string;
  /** 释义配图，放在 /public/fwod 下 */
  image: string;
  tip: string;
  example: string;
  exampleZh: string;
}

/**
 * 每日法语一词 — 工地 / 日常场景高频词
 * 起始 2026-04-03，每天一个词，到 2026-04-22 共 20 个。
 * 之后新增词只需往下追加日期与内容。
 */
export const BANK: FrenchDailyEntry[] = [
  { date: "2026-04-03", word: "balayer", pos: "v.", zh: "打扫", pron: "巴来耶",
    image: "/fwod/balayer.webp",
    tip: "让工人清场最直白的一个词。",
    example: "Balaie le bureau avant de partir.",
    exampleZh: "下班前把办公室扫一下。" },
  { date: "2026-04-04", word: "collaborer", pos: "v.", zh: "合作", pron: "ko 啦啵嘿",
    image: "/fwod/collaborer.webp",
    tip: "比 travailler ensemble 更正式，商务场合用得上。",
    example: "Nous souhaitons collaborer avec vous.",
    exampleZh: "我们希望与您合作。" },
  { date: "2026-04-05", word: "commander", pos: "v.", zh: "点单", pron: "ko 忙 dei",
    image: "/fwod/commander.webp",
    tip: "餐厅点菜、采购下单都能用。",
    example: "Je voudrais commander trois sacs de ciment.",
    exampleZh: "我想订三袋水泥。" },
  { date: "2026-04-06", word: "couler", pos: "v.", zh: "浇筑（混凝土）", pron: "姑累",
    image: "/fwod/couler.webp",
    tip: "工地核心动词：couler le béton = 浇混凝土。",
    example: "On coule la dalle demain matin.",
    exampleZh: "明天早上浇楼板。" },
  { date: "2026-04-07", word: "dangereux", pos: "adj.", zh: "危险的", pron: "当日喝",
    image: "/fwod/dangereux.webp",
    tip: "阴性写作 dangereuse，提醒安全必备。",
    example: "Ce chantier est dangereux, casque obligatoire.",
    exampleZh: "这工地危险，必须戴头盔。" },
  { date: "2026-04-08", word: "dépêcher", pos: "v.", zh: "赶快做", pron: "dei 悲谢",
    image: "/fwod/depecher.webp",
    tip: "催人最常说：Dépêche-toi !",
    example: "Dépêchez-vous, le camion attend.",
    exampleZh: "快点，卡车在等。" },
  { date: "2026-04-09", word: "essayer", pos: "v.", zh: "尝试", pron: "AC 液",
    image: "/fwod/essayer.webp",
    tip: "Essaie encore une fois. = 再试一次。",
    example: "On peut essayer une autre méthode.",
    exampleZh: "可以换个办法试试。" },
  { date: "2026-04-10", word: "excaver", pos: "v.", zh: "挖掘", pron: "ai 克斯卡为",
    image: "/fwod/excaver.webp",
    tip: "工地专业词，比 creuser 更正式。",
    example: "Il faut excaver plus profond ici.",
    exampleZh: "这里要挖得更深。" },
  { date: "2026-04-11", word: "exclure", pos: "v.", zh: "开除", pron: "X 克绿喝",
    image: "/fwod/exclure.webp",
    tip: "既可开除员工，也可用作「排除某方案」。",
    example: "On l'a exclu pour vol.",
    exampleZh: "因偷窃把他开除了。" },
  { date: "2026-04-12", word: "fatigué", pos: "adj.", zh: "累了", pron: "发嘀给",
    image: "/fwod/fatigue.webp",
    tip: "阴性 fatiguée；Je suis fatigué. 我累了。",
    example: "Les ouvriers sont fatigués.",
    exampleZh: "工人们都累了。" },
  { date: "2026-04-13", word: "le béton", pos: "n.m.", zh: "混凝土", pron: "勒 杯咚",
    image: "/fwod/beton.webp",
    tip: "常说 béton armé = 钢筋混凝土。",
    example: "Le béton doit sécher 24 heures.",
    exampleZh: "混凝土需要干 24 小时。" },
  { date: "2026-04-14", word: "le relevé", pos: "n.m.", zh: "账单 / 统计表", pron: "勒 喝了喂",
    image: "/fwod/releve.webp",
    tip: "银行对账单、考勤表都叫 relevé。",
    example: "Envoyez-moi le relevé de ce mois.",
    exampleZh: "请把本月对账单发给我。" },
  { date: "2026-04-15", word: "malade", pos: "adj.", zh: "生病", pron: "麻辣的",
    image: "/fwod/malade.webp",
    tip: "Je suis malade. 我生病了。",
    example: "Mon chauffeur est malade aujourd'hui.",
    exampleZh: "我的司机今天病了。" },
  { date: "2026-04-16", word: "oublier", pos: "v.", zh: "忘记", pron: "u 布利耶",
    image: "/fwod/oublier.webp",
    tip: "N'oublie pas ! = 别忘了！",
    example: "N'oubliez pas la facture.",
    exampleZh: "别忘了发票。" },
  { date: "2026-04-17", word: "passer", pos: "v.", zh: "经过", pron: "巴 sei",
    image: "/fwod/passer.webp",
    tip: "Je passe te chercher. 顺路接你。",
    example: "Je passerai au bureau cet après-midi.",
    exampleZh: "下午我会去办公室一趟。" },
  { date: "2026-04-18", word: "patienter", pos: "v.", zh: "耐心点儿", pron: "巴西昂 dei",
    image: "/fwod/patienter.webp",
    tip: "比 attendre 礼貌：Veuillez patienter。",
    example: "Patientez un instant, s'il vous plaît.",
    exampleZh: "请稍等片刻。" },
  { date: "2026-04-19", word: "reposer", pos: "v.", zh: "休息", pron: "喝泼 Z",
    image: "/fwod/reposer.webp",
    tip: "Repose-toi bien. 好好休息。",
    example: "Reposez-vous, on continue demain.",
    exampleZh: "歇着吧，明天继续。" },
  { date: "2026-04-20", word: "recruter", pos: "v.", zh: "招聘", pron: "喝亏 dei",
    image: "/fwod/recruter.webp",
    tip: "On recrute un chauffeur. 招司机。",
    example: "Nous recrutons trois maçons.",
    exampleZh: "我们招三名瓦工。" },
  { date: "2026-04-21", word: "rentrer", pos: "v.", zh: "回去", pron: "夯特嘿",
    image: "/fwod/rentrer.webp",
    tip: "Je rentre à Kinshasa demain. 明天回金沙萨。",
    example: "Je rentre au bureau.",
    exampleZh: "我回办公室。" },
  { date: "2026-04-22", word: "prendre", pos: "v.", zh: "拿", pron: "彭的喝",
    image: "/fwod/prendre.webp",
    tip: "万能动词：prendre un café / le bus…",
    example: "Prenez ce chemin, c'est plus court.",
    exampleZh: "走这条路，更近。" },
];

export const TOTAL_ENTRIES = BANK.length;
export const FIRST_DATE = BANK[0].date;
export const LAST_DATE = BANK[BANK.length - 1].date;

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 本地时区日期字符串 YYYY-MM-DD（按用户手机的时区） */
export function localDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 找到"不晚于"给定日期的最新词条下标；若日期早于 FIRST_DATE 返回 0 */
export function indexForDate(dateStr: string, list: FrenchDailyEntry[] = BANK): number {
  if (list.length === 0) return 0;
  if (dateStr < list[0].date) return 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].date <= dateStr) return i;
  }
  return 0;
}

/** 今日词条下标（若今天之后无新词，停留在最后一个） */
export function todayIndex(list: FrenchDailyEntry[] = BANK): number {
  return indexForDate(localDateString(), list);
}

/**
 * 合并静态 BANK 与后台动态条目：相同日期时动态条目覆盖静态；
 * 动态条目可以扩展到静态 BANK 之外的日期。最终按日期升序返回。
 */
export function mergeEntries(
  staticList: FrenchDailyEntry[],
  dynamicList: FrenchDailyEntry[],
): FrenchDailyEntry[] {
  const byDate = new Map<string, FrenchDailyEntry>();
  for (const e of staticList) byDate.set(e.date, e);
  for (const e of dynamicList) byDate.set(e.date, e);
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
