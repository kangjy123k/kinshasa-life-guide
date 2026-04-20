import Link from "next/link";
import { ArrowLeft, Luggage, AlertTriangle, Info } from "lucide-react";

export const metadata = {
  title: "首次来刚果金 — 行李及注意事项",
  description: "第一次来刚果金金沙萨前要准备什么？行李清单、入关注意、常识提醒。",
};

interface Section {
  title: string;
  tone: "bag" | "warn" | "info";
  items: string[];
}

const sections: Section[] = [
  {
    title: "随身证件 & 文件",
    tone: "info",
    items: [
      "护照 + 复印件（建议手机存电子版）",
      "黄热病疫苗黄本（机场有可能查验）",
      "刚果金签证（贴签或落地签函）",
      "返程机票行程单、酒店预订单",
      "工作/邀请函（公司发的原件 + 复印件）",
    ],
  },
  {
    title: "行李清单：建议带",
    tone: "bag",
    items: [
      "常用药：感冒药、肠胃药、退烧药、抗过敏、外伤药膏",
      "驱蚊液 / 蚊香片（疟疾高发，入住前几晚尤其重要）",
      "转换插头（刚果金用欧标 Type C/E）",
      "充电宝、长线插线板、充电头（停电常见）",
      "少量美元现金（小面额 10/20/50/100 都要）",
      "中国 SIM 卡（过渡用）+ 未锁机型手机",
      "长袖外套（空调房/凉季早晚偏凉）",
    ],
  },
  {
    title: "入关注意",
    tone: "warn",
    items: [
      "落地后优先换小面额美元（机场 ATM 不稳定）",
      "黄本、护照页随身不要托运",
      "行李尽量少托运贵重物品，相机/电脑放随身",
      "机场出门打车走正规渠道，提前和接机人对暗号",
    ],
  },
];

const toneMap: Record<Section["tone"], { bg: string; icon: typeof Info; color: string }> = {
  bag: { bg: "bg-sky-50 border-sky-200", icon: Luggage, color: "text-sky-600" },
  warn: { bg: "bg-rose-50 border-rose-200", icon: AlertTriangle, color: "text-rose-600" },
  info: { bg: "bg-amber-50 border-amber-200", icon: Info, color: "text-amber-600" },
};

export default function FirstTimePage() {
  return (
    <div className="min-h-screen bg-sky-50">
      <section className="bg-gradient-to-r from-sky-400 to-blue-500 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            aria-label="返回首页"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight">首次来刚果金</h1>
            <p className="text-xs text-white/80">行李及注意事项</p>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {sections.map((sec) => {
          const { bg, icon: Icon, color } = toneMap[sec.tone];
          return (
            <div key={sec.title} className={`${bg} border rounded-2xl p-4 shadow-sm`}>
              <div className="flex items-center gap-2 mb-2.5">
                <Icon size={18} className={color} />
                <h2 className="text-sm font-bold text-gray-800">{sec.title}</h2>
              </div>
              <ul className="space-y-1.5 text-sm text-gray-700 leading-relaxed">
                {sec.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <span className="text-sky-400 shrink-0">·</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <p className="text-xs text-gray-400 text-center pt-2">
          更多本地落地 tips 陆续补充中。欢迎在微信群留言帮我们完善这份清单。
        </p>
      </div>
    </div>
  );
}
