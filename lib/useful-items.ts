export type UsefulItem = {
  key: string;
  title: string;
  desc: string;
  emoji: string;
  href: string;
  keywords: string[];
  homeHidden?: boolean;
};

export const usefulItems: UsefulItem[] = [
  {
    key: "french-word",
    title: "每日法语一词",
    desc: "悄悄学，惊艳所有人",
    emoji: "🇫🇷",
    href: "/guides/french-word",
    keywords: ["法语", "français", "每日", "单词", "学习", "发音"],
  },
  {
    key: "french-sentence",
    title: "每日法语一句",
    desc: "整句 + 谐音 + 关键词变位",
    emoji: "💬",
    href: "/guides/french-sentence",
    keywords: ["法语", "français", "每日", "句子", "一句", "学习", "发音", "变位", "语法"],
  },
  {
    key: "weather",
    title: "天气预报·金沙萨",
    desc: "极端天气早知道",
    emoji: "🌦️",
    href: "/weather",
    keywords: ["天气", "weather", "雨", "温度", "金沙萨", "气象", "降水"],
  },
  {
    key: "surveys",
    title: "参与调研·奖品多多",
    desc: "答题帮商家·好礼带回家",
    emoji: "🎁",
    href: "/surveys",
    keywords: ["调研", "问卷", "survey", "奖品", "外卖", "市场调查"],
  },
  {
    key: "map",
    title: "商家地图",
    desc: "内置语音告诉司机地点",
    emoji: "🗺️",
    href: "/map",
    keywords: ["地图", "map", "商家", "司机", "taxi", "位置", "地点"],
  },
  {
    key: "first-time",
    title: "首次来刚果金",
    desc: "行李及注意事项",
    emoji: "🧳",
    href: "/guides/first-time",
    keywords: ["首次", "新手", "行李", "签证", "刚果", "入境", "第一次"],
  },
  {
    key: "events",
    title: "线下活动",
    desc: "在刚果金也有丰富生活",
    emoji: "🎉",
    href: "/events",
    keywords: ["活动", "event", "聚会", "线下", "party", "华人"],
  },
  {
    key: "recharge",
    title: "手机服务指南",
    desc: "运营商信息查询",
    emoji: "📱",
    href: "/guides/recharge",
    keywords: ["手机", "充值", "recharge", "运营商", "vodacom", "airtel", "orange", "卡", "流量"],
    homeHidden: true,
  },
  {
    key: "construction-french",
    title: "工地常用法语",
    desc: "真人发音教学",
    emoji: "👷",
    href: "/guides/construction-french",
    keywords: ["工地", "法语", "发音", "français", "construction", "施工", "语言"],
    homeHidden: true,
  },
];

export const homeUsefulItems = usefulItems.filter((it) => !it.homeHidden);

export function filterUseful(query: string): UsefulItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return usefulItems.filter((it) => {
    const hay = [it.title, it.desc, ...it.keywords].join(" ").toLowerCase();
    return hay.includes(q);
  });
}
