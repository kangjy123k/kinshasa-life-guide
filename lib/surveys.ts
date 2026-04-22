export type SurveyFieldType =
  | "text"
  | "textarea"
  | "radio"
  | "multi"      // 复选
  | "scale"      // 1-5 / 1-10 评分
  | "contact-group";

export interface SurveyField {
  name: string;
  label: string;
  type: SurveyFieldType;
  required?: boolean;
  options?: string[];
  scaleMax?: number;
  placeholder?: string;
  helpText?: string;
}

export interface SurveyDef {
  key: string;
  title: string;
  sponsor: string;
  summary: string;
  emoji: string;
  color: string; // tailwind 渐变片段
  reward: string;
  deadline?: string;
  fields: SurveyField[];
}

export const SURVEYS: SurveyDef[] = [
  {
    key: "takeaway",
    title: "金沙萨华人外卖习惯调研",
    sponsor: "某本地中餐外卖（筹备中）",
    summary:
      "我们在筹备一家面向金沙萨华人的中餐外卖，想听听你平时怎么点、踩过哪些坑，帮我们做到真正合胃口。",
    emoji: "🥡",
    color: "from-orange-500 via-rose-500 to-red-500",
    reward: "完整填写即可抽取 1 张 25 USD 外卖券 · 每周开奖",
    deadline: "2026-05-31",
    fields: [
      {
        name: "area",
        label: "你通常在哪个 commune / 区域活动？",
        type: "radio",
        required: true,
        options: ["Gombe", "Ngaliema", "Ma Campagne", "Limete", "Masina", "其他"],
      },
      {
        name: "frequency",
        label: "你平均一周点几次外卖或外带？",
        type: "radio",
        required: true,
        options: ["几乎不点", "1-2 次", "3-5 次", "6 次以上"],
      },
      {
        name: "budget",
        label: "单次外卖能接受的价格（单人 / USD）",
        type: "radio",
        required: true,
        options: ["≤ 8", "8–15", "15–25", "25 以上"],
      },
      {
        name: "cuisines",
        label: "最想吃的中餐品类（可多选）",
        type: "multi",
        required: true,
        options: [
          "川菜",
          "粤菜 / 烧腊",
          "东北菜",
          "家常炒菜",
          "面 / 粉 / 馄饨",
          "火锅 / 麻辣烫",
          "快餐 / 盒饭",
          "早餐（包子 / 豆浆）",
        ],
      },
      {
        name: "painPoints",
        label: "目前金沙萨点外卖最大的不满（可多选）",
        type: "multi",
        options: [
          "价格太贵",
          "口味不地道",
          "送餐慢 / 不准点",
          "包装差 / 洒漏",
          "品类少",
          "联系困难（只微信不接电话）",
          "卫生不放心",
        ],
      },
      {
        name: "deliveryFee",
        label: "愿意为配送单独付多少？",
        type: "radio",
        options: ["0（包在餐费里）", "1–2 USD", "2–5 USD", "视距离而定"],
      },
      {
        name: "channel",
        label: "你更习惯通过什么方式下单？",
        type: "multi",
        options: ["微信群接龙", "WhatsApp 直接发订单", "小程序 / 网站", "电话"],
      },
      {
        name: "timing",
        label: "最常点外卖的时间段",
        type: "multi",
        options: ["早餐", "工作日午餐", "工作日晚餐", "周末午餐", "周末晚餐", "夜宵"],
      },
      {
        name: "loyaltyDriver",
        label: "让你愿意长期复购的最重要因素",
        type: "radio",
        required: true,
        options: [
          "口味稳定",
          "准点送达",
          "价格实惠",
          "菜单持续更新",
          "老板 / 客服会沟通",
          "卫生 / 食材透明",
        ],
      },
      {
        name: "wouldPrePay",
        label: "愿意为每周固定配送预付月卡吗？",
        type: "radio",
        options: ["愿意 · 能省更好", "看价格吧", "不愿意"],
      },
      {
        name: "overallScore",
        label: "当前金沙萨中餐外卖体验综合打分",
        type: "scale",
        scaleMax: 5,
      },
      {
        name: "ideaText",
        label: "最想让筹备中的这家外卖做到哪 1 件事？",
        type: "textarea",
        placeholder: "一句话建议，具体点最好 —— 例如 '晚上 9 点后还能点到热乎的炒饭'",
      },
      {
        name: "contact",
        label: "留个联系方式参与抽奖（不公开）",
        type: "contact-group",
        required: true,
        helpText: "只用于抽奖通知，不会被商家用来推销。",
      },
    ],
  },
];

export function getSurvey(key: string): SurveyDef | null {
  return SURVEYS.find((s) => s.key === key) ?? null;
}
