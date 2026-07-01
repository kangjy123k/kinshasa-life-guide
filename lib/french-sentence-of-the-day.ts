// 每日法语一句 — 刚果金供应链 / 贸易 / 谈判高频句
// 每天一句实用句子，突出一个关键词（动词），给意义 / 用法 / 四时态变位
// + 两个用其他变位的例句。起始日期见 BANK，之后往下追加即可。

/** 一个时态下六个人称的变位 */
export interface TenseForms {
  je: string;
  tu: string;
  il: string;
  nous: string;
  vous: string;
  ils: string;
}

/** 关键词动词的四种时态变位 */
export interface Conjugation {
  /** 直陈式现在时 */
  present: TenseForms;
  /** 直陈式复合过去时 */
  passeCompose: TenseForms;
  /** 未完成过去时（imparfait） */
  imparfait: TenseForms;
  /** 简单将来时 */
  futur: TenseForms;
}

/** 用其他变位造的例句 + 讲解 */
export interface ExtraExample {
  /** 例句法语 */
  fr: string;
  /** 用了哪种变位，如「复合过去时」 */
  tense: string;
  /** 翻译 */
  zh: string;
  /** 用法讲解（意义 + 什么时候用） */
  usage: string;
}

export interface FrenchSentenceEntry {
  /** 该句对应的日期，YYYY-MM-DD（按用户手机本地时区解读） */
  date: string;
  /** 法语句子 */
  sentence: string;
  /** 句中要高亮的确切子串（关键词在句中的出现形式，可能是变位后的） */
  highlight: string;
  /** 整句近似中文谐音，帮零基础开口 */
  pron: string;
  /** 句子翻译 */
  zh: string;
  /** 关键词动词原形（卡片标题用） */
  keyword: string;
  /** 词性，一般 v. */
  pos: string;
  /** 关键词意义 */
  keywordZh: string;
  /** 关键词用法讲解 */
  keywordUsage: string;
  /** 四时态变位 */
  conj: Conjugation;
  /** 两个用其他变位的例句 + 讲解 */
  extras: ExtraExample[];
}

export const BANK: FrenchSentenceEntry[] = [
  {
    date: "2026-06-26",
    sentence: "Vous pouvez livrer le ciment demain matin ?",
    highlight: "livrer",
    pron: "wu 布喂 li-弗雷 勒 西孟 德曼 马丹?",
    zh: "您明天上午能把水泥送来吗？",
    keyword: "livrer",
    pos: "v.",
    keywordZh: "交货 / 送货",
    keywordUsage:
      "商贸最高频动词之一：livrer + 货物。名词 la livraison = 送货 / 交货。比 apporter 更正式，强调按约交付。",
    conj: {
      present: { je: "je livre", tu: "tu livres", il: "il livre", nous: "nous livrons", vous: "vous livrez", ils: "ils livrent" },
      passeCompose: { je: "j'ai livré", tu: "tu as livré", il: "il a livré", nous: "nous avons livré", vous: "vous avez livré", ils: "ils ont livré" },
      imparfait: { je: "je livrais", tu: "tu livrais", il: "il livrait", nous: "nous livrions", vous: "vous livriez", ils: "ils livraient" },
      futur: { je: "je livrerai", tu: "tu livreras", il: "il livrera", nous: "nous livrerons", vous: "vous livrerez", ils: "ils livreront" },
    },
    extras: [
      {
        fr: "Le fournisseur a livré hier soir.",
        tense: "复合过去时",
        zh: "供应商昨晚已经送到了。",
        usage: "a livré = 已经交货（动作完成、看结果）。追货时最常用：Vous avez livré ? 你们送了吗？",
      },
      {
        fr: "Je vous livrerai avant vendredi.",
        tense: "简单将来时",
        zh: "我会在周五前给您送到。",
        usage: "livrerai = （我）将交货，承诺交期用它。口语也常说 je vais livrer（近期将来）。",
      },
    ],
  },
  {
    date: "2026-06-27",
    sentence: "Je vais payer par virement aujourd'hui.",
    highlight: "payer",
    pron: "热 wei 贝耶 巴喝 vi-喝孟 奥九喝迪.",
    zh: "我今天用转账付款。",
    keyword: "payer",
    pos: "v.",
    keywordZh: "付款 / 支付",
    keywordUsage:
      "payer + 金额 / 方式：payer par virement 转账付款、payer en cash 付现金。名词 le paiement = 付款。",
    conj: {
      present: { je: "je paie", tu: "tu paies", il: "il paie", nous: "nous payons", vous: "vous payez", ils: "ils paient" },
      passeCompose: { je: "j'ai payé", tu: "tu as payé", il: "il a payé", nous: "nous avons payé", vous: "vous avez payé", ils: "ils ont payé" },
      imparfait: { je: "je payais", tu: "tu payais", il: "il payait", nous: "nous payions", vous: "vous payiez", ils: "ils payaient" },
      futur: { je: "je paierai", tu: "tu paieras", il: "il paiera", nous: "nous paierons", vous: "vous paierez", ils: "ils paieront" },
    },
    extras: [
      {
        fr: "J'ai déjà payé la facture.",
        tense: "复合过去时",
        zh: "我已经付了这张发票。",
        usage: "déjà payé = 已付。对方催款时直接回：J'ai payé. 我付了。",
      },
      {
        fr: "Avant, on payait toujours en cash.",
        tense: "未完成过去时",
        zh: "以前我们总是付现金。",
        usage: "payait = （过去习惯性地）付款，imparfait 表示过去的习惯 / 常态。",
      },
    ],
  },
  {
    date: "2026-06-28",
    sentence: "Appelle le chauffeur, il attend dehors.",
    highlight: "Appelle",
    pron: "阿佩勒 勒 少佛喝, 伊了 阿丹 德奥喝.",
    zh: "给司机打电话，他在外面等。",
    keyword: "appeler",
    pos: "v.",
    keywordZh: "叫 / 打电话给",
    keywordUsage:
      "appeler qn = 叫某人 / 给某人打电话；s'appeler = 叫（名字）。注意重读音节双写 l：j'appelle。",
    conj: {
      present: { je: "j'appelle", tu: "tu appelles", il: "il appelle", nous: "nous appelons", vous: "vous appelez", ils: "ils appellent" },
      passeCompose: { je: "j'ai appelé", tu: "tu as appelé", il: "il a appelé", nous: "nous avons appelé", vous: "vous avez appelé", ils: "ils ont appelé" },
      imparfait: { je: "j'appelais", tu: "tu appelais", il: "il appelait", nous: "nous appelions", vous: "vous appeliez", ils: "ils appelaient" },
      futur: { je: "j'appellerai", tu: "tu appelleras", il: "il appellera", nous: "nous appellerons", vous: "vous appellerez", ils: "ils appelleront" },
    },
    extras: [
      {
        fr: "Je t'ai appelé trois fois.",
        tense: "复合过去时",
        zh: "我给你打了三次电话。",
        usage: "t'ai appelé = 给你打过电话（已发生）。对方没接时用来施压。",
      },
      {
        fr: "Je vous appellerai ce soir.",
        tense: "简单将来时",
        zh: "我今晚给您打电话。",
        usage: "appellerai = 将回电，双 l + erai。答应回电话时用。",
      },
    ],
  },
  {
    date: "2026-06-29",
    sentence: "Attendez-moi, j'arrive dans cinq minutes.",
    highlight: "Attendez",
    pron: "阿丹dei-姆瓦, 热阿嘿夫 当 三克 mi-女特.",
    zh: "等我一下，我五分钟后到。",
    keyword: "attendre",
    pos: "v.",
    keywordZh: "等待",
    keywordUsage:
      "attendre qn / qch = 等某人 / 某物（后面不加介词）。Attends ! = 等一下！属第三组 -re 动词。",
    conj: {
      present: { je: "j'attends", tu: "tu attends", il: "il attend", nous: "nous attendons", vous: "vous attendez", ils: "ils attendent" },
      passeCompose: { je: "j'ai attendu", tu: "tu as attendu", il: "il a attendu", nous: "nous avons attendu", vous: "vous avez attendu", ils: "ils ont attendu" },
      imparfait: { je: "j'attendais", tu: "tu attendais", il: "il attendait", nous: "nous attendions", vous: "vous attendiez", ils: "ils attendaient" },
      futur: { je: "j'attendrai", tu: "tu attendras", il: "il attendra", nous: "nous attendrons", vous: "vous attendrez", ils: "ils attendront" },
    },
    extras: [
      {
        fr: "On a attendu deux heures.",
        tense: "复合过去时",
        zh: "我们等了两个小时。",
        usage: "a attendu = 等过了（说明确的时长时用它）。",
      },
      {
        fr: "Il attendait devant le bureau.",
        tense: "未完成过去时",
        zh: "他当时在办公室门口等着。",
        usage: "attendait = 当时正在等（描述背景 / 持续状态）。",
      },
    ],
  },
  {
    date: "2026-06-30",
    sentence: "N'oubliez pas de signer le contrat.",
    highlight: "signer",
    pron: "怒布利耶 巴 德 si-捏 勒 空特哈.",
    zh: "别忘了在合同上签字。",
    keyword: "signer",
    pos: "v.",
    keywordZh: "签字 / 签署",
    keywordUsage:
      "signer + 文件：signer le contrat 签合同、signer le bon de livraison 签收货单。名词 la signature = 签名。",
    conj: {
      present: { je: "je signe", tu: "tu signes", il: "il signe", nous: "nous signons", vous: "vous signez", ils: "ils signent" },
      passeCompose: { je: "j'ai signé", tu: "tu as signé", il: "il a signé", nous: "nous avons signé", vous: "vous avez signé", ils: "ils ont signé" },
      imparfait: { je: "je signais", tu: "tu signais", il: "il signait", nous: "nous signions", vous: "vous signiez", ils: "ils signaient" },
      futur: { je: "je signerai", tu: "tu signeras", il: "il signera", nous: "nous signerons", vous: "vous signerez", ils: "ils signeront" },
    },
    extras: [
      {
        fr: "Le client a signé ce matin.",
        tense: "复合过去时",
        zh: "客户今早签了。",
        usage: "a signé = 已签（成交确认）。报喜 / 汇报进度时用。",
      },
      {
        fr: "Nous signerons après vérification.",
        tense: "简单将来时",
        zh: "核对之后我们就签。",
        usage: "signerons = （我们）将签，给条件、谈判收尾时用。",
      },
    ],
  },
  {
    date: "2026-07-01",
    sentence: "Je dois vérifier la quantité avant de payer.",
    highlight: "vérifier",
    pron: "热 dwa vei-hi-fi-耶 拉 空提dei 阿翁 德 贝耶.",
    zh: "付款前我得核对数量。",
    keyword: "vérifier",
    pos: "v.",
    keywordZh: "核对 / 检查",
    keywordUsage:
      "vérifier + 对象：核对数量 / 质量 / 账目。名词 la vérification。控货控款、验收必备词。",
    conj: {
      present: { je: "je vérifie", tu: "tu vérifies", il: "il vérifie", nous: "nous vérifions", vous: "vous vérifiez", ils: "ils vérifient" },
      passeCompose: { je: "j'ai vérifié", tu: "tu as vérifié", il: "il a vérifié", nous: "nous avons vérifié", vous: "vous avez vérifié", ils: "ils ont vérifié" },
      imparfait: { je: "je vérifiais", tu: "tu vérifiais", il: "il vérifiait", nous: "nous vérifiions", vous: "vous vérifiiez", ils: "ils vérifiaient" },
      futur: { je: "je vérifierai", tu: "tu vérifieras", il: "il vérifiera", nous: "nous vérifierons", vous: "vous vérifierez", ils: "ils vérifieront" },
    },
    extras: [
      {
        fr: "J'ai vérifié tous les sacs.",
        tense: "复合过去时",
        zh: "我核对了所有袋子。",
        usage: "ai vérifié = 已核对（验收后回话）。",
      },
      {
        fr: "On vérifiera à la livraison.",
        tense: "简单将来时",
        zh: "到货时我们会核对。",
        usage: "vérifiera = 将核对，约定验收时点时用。",
      },
    ],
  },
];

export const TOTAL_ENTRIES = BANK.length;
export const FIRST_DATE = BANK[0].date;
export const LAST_DATE = BANK[BANK.length - 1].date;

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 本地时区日期字符串 YYYY-MM-DD（按用户手机时区） */
export function localDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 找到「不晚于」给定日期的最新句子下标；日期早于 FIRST_DATE 返回 0 */
export function indexForDate(dateStr: string, list: FrenchSentenceEntry[] = BANK): number {
  if (list.length === 0) return 0;
  if (dateStr < list[0].date) return 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].date <= dateStr) return i;
  }
  return 0;
}

/** 今日句子下标（今天之后没有新句则停在最后一句） */
export function todayIndex(list: FrenchSentenceEntry[] = BANK): number {
  return indexForDate(localDateString(), list);
}
