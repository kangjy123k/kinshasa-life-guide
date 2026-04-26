export interface QuizOption {
  text: string;
  score: 0 | 1 | 2;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: [QuizOption, QuizOption, QuizOption];
}

export interface QuizTier {
  minScore: number;
  maxScore: number;
  title: string;
  emoji: string;
  description: string;
  accent: string;
}

export const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "你来刚果金的目的是什么？",
    options: [
      { text: "在国内实在是找不到工作了。", score: 0 },
      { text: "听说非洲机会多，风浪越大鱼越贵。", score: 1 },
      { text: "有明确的事业规划，想要在非洲这片广阔热土上实现人生理想。", score: 2 },
    ],
  },
  {
    id: 2,
    question: "你能接受基础设施不稳定吗？比如停电、堵车、空气污染严重、网络差、办事慢。",
    options: [
      { text: "不能，这会严重影响我生活质量。", score: 0 },
      { text: "能忍一段时间，但长期会累。", score: 1 },
      { text: "可以，我喜欢「荒野求生」。", score: 2 },
    ],
  },
  {
    id: 3,
    question: "你是否具备跨文化沟通能力？",
    options: [
      { text: "我不太会和外国人打交道，也不想学。", score: 0 },
      { text: "可以简单沟通，也愿意学习当地语言与文化。", score: 1 },
      { text: "精通当地语言和文化，能轻松了解到对方的利益、面子、恐惧和真实需求。", score: 2 },
    ],
  },
  {
    id: 4,
    question: "你对「不确定性」的耐受度如何？",
    options: [
      { text: "我喜欢一切按计划进行，变化太多会崩溃。", score: 0 },
      { text: "可以接受变化，但需要有人解释清楚。", score: 1 },
      { text: "计划赶不上变化？正常，我能随机应变。", score: 2 },
    ],
  },
  {
    id: 5,
    question: "你对「人情关系」的理解是？",
    options: [
      { text: "我只相信合同和规则。", score: 0 },
      { text: "我知道关系重要，但不太会经营。", score: 1 },
      { text: "合同是骨架，关系是血管，两个都要。", score: 2 },
    ],
  },
  {
    id: 6,
    question: "你是否能长期在蛮荒的地方独处、抗压、自己解决问题？",
    options: [
      { text: "不行，我需要稳定陪伴和清晰支持。", score: 0 },
      { text: "可以短期扛，但久了会情绪化。", score: 1 },
      { text: "可以，一个人也能开路、谈判、复盘、回血。", score: 2 },
    ],
  },
  {
    id: 7,
    question: "你对金钱风险的承受能力如何？",
    options: [
      { text: "不能接受回款慢、垫资、账期长。", score: 0 },
      { text: "可以接受小风险，但希望有人兜底。", score: 1 },
      { text: "知道现金流是命，会算账、控账、分阶段收款。", score: 2 },
    ],
  },
  {
    id: 8,
    question: "你是否已经了解了刚果金的一些社会情况？",
    options: [
      { text: "完全不了解。", score: 0 },
      { text: "在各种新闻报道里有所了解。", score: 1 },
      { text: "已经研究透了【刚果金华人生活服务指南】，也了解真实的刚果金情况。", score: 2 },
    ],
  },
  {
    id: 9,
    question: "家里人对于你来刚果金工作持什么样的态度？",
    options: [
      { text: "觉得风险很高，提到就面露难色。", score: 0 },
      { text: "不了解这个国家，觉得和其他任何相对不发达的国家差不多。", score: 1 },
      { text: "已经了解刚果金的实际情况，支持你来。", score: 2 },
    ],
  },
  {
    id: 10,
    question: "你是否对于拥有一个「正常」的人生节奏很看重？",
    options: [
      { text: "是的，我的同龄人都在结婚生子这样传统的轨道上行走，我也是一样。", score: 0 },
      { text: "走一步算一步，不强求和别人一致。", score: 1 },
      { text: "我有我自己独特的节奏，在刚果金的日子会闪闪发光。", score: 2 },
    ],
  },
];

export const quizTiers: QuizTier[] = [
  {
    minScore: 0,
    maxScore: 5,
    title: "飞行专家",
    emoji: "✈️",
    description:
      "你更适合旅游、考察、短期出差。刚果金可以来看看，但不建议长期扎根。这里不是普通副本，别把自己空投进雨林。",
    accent: "from-sky-400 to-cyan-500",
  },
  {
    minScore: 6,
    maxScore: 10,
    title: "新手猎人",
    emoji: "🏹",
    description:
      "你有一定适应力，但还需要在非洲其他条件更好的国家先待一段时间，适应一下社会发展程度较落后的感觉，之后再丝滑切入刚果金。",
    accent: "from-emerald-400 to-teal-500",
  },
  {
    minScore: 11,
    maxScore: 15,
    title: "非洲老江湖",
    emoji: "🦁",
    description:
      "你具备较强的适应力、判断力和抗压能力。在刚果金，你有机会找到自己的位置，把收入翻番。",
    accent: "from-amber-400 to-orange-500",
  },
  {
    minScore: 16,
    maxScore: 20,
    title: "部落扛把子",
    emoji: "👑",
    description:
      "你很适合这种高机会、高不确定性的环境。你不仅能生存，还可能建立资源网络、带队做事，闯出一片地盘。刚果金就是你命中注定要来的地方，你会在这里做出一番巨大的成就。",
    accent: "from-rose-500 to-fuchsia-600",
  },
];

export function tierForScore(score: number): QuizTier {
  return (
    quizTiers.find((t) => score >= t.minScore && score <= t.maxScore) ??
    quizTiers[0]
  );
}

export const QUIZ_TITLE = "测测你是否适合在刚果金工作";
export const QUIZ_TOTAL_SCORE = quizQuestions.length * 2;
