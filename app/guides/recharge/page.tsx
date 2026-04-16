import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";

export const metadata = {
  title: "本地话费充值指南 — 刚果金华人生活服务",
  description: "刚果金 VodaCom · Orange · Airtel · Africell 常用 USSD 代码速查",
};

interface Item {
  label: string;
  value: string;
  isUssd?: boolean;
}

interface Carrier {
  name: string;
  color: string;
  apn: string;
  items: Item[];
}

const carriers: Carrier[] = [
  {
    name: "VodaCom",
    color: "from-red-500 to-red-600",
    apn: "vodanet",
    items: [
      { label: "关套餐外流量", value: "*1468#", isUssd: true },
      { label: "查询余额", value: "*1100#", isUssd: true },
      { label: "查询号码", value: "*1489#", isUssd: true },
      { label: "查询流量", value: "*1100*2#", isUssd: true },
      { label: "购买流量", value: "*1111*1*4*1#", isUssd: true },
    ],
  },
  {
    name: "Orange",
    color: "from-orange-500 to-orange-600",
    apn: "iew.orange.cd",
    items: [
      { label: "关套餐外流量", value: "*105# 选 1" },
      { label: "查询余额", value: "*211#", isUssd: true },
      { label: "查询号码", value: "*211#", isUssd: true },
      { label: "查询流量", value: "*125#", isUssd: true },
      { label: "购买流量", value: "*101#", isUssd: true },
      { label: "购买流量", value: "*101*2#", isUssd: true },
      { label: "转话费", value: "*850*11111111*电话*钱#  手续费 4U" },
    ],
  },
  {
    name: "Airtel",
    color: "from-rose-500 to-pink-500",
    apn: "internet",
    items: [
      { label: "包月流量", value: "拨打 *425# 后依次选 5，选套餐，选 1" },
      { label: "查询余额", value: "*565#", isUssd: true },
      { label: "查询号码", value: "*502#", isUssd: true },
      { label: "查询流量", value: "拨打 *425# 后选 8" },
      { label: "购买流量", value: "*425#", isUssd: true },
    ],
  },
  {
    name: "Africell",
    color: "from-violet-500 to-purple-600",
    apn: "internet",
    items: [
      { label: "查特惠流量", value: "*111*100#", isUssd: true },
      { label: "查询余额", value: "*1000#", isUssd: true },
      { label: "查询号码", value: "*1000#", isUssd: true },
      { label: "查询流量", value: "*111*11#", isUssd: true },
      { label: "购买流量", value: "*111*1#", isUssd: true },
    ],
  },
];

function ussdHref(code: string): string {
  return `tel:${code.replace(/#/g, "%23")}`;
}

export default function RechargeGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <header className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/90 hover:text-white mb-3"
          >
            <ArrowLeft size={16} /> 返回首页
          </Link>
          <h1 className="text-2xl md:text-3xl font-black">本地话费充值指南</h1>
          <p className="text-sm md:text-base text-sky-100 mt-1">
            刚果金 VodaCom · Orange · Airtel · Africell 常用 USSD 速查
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>
            手机点击 <span className="font-mono">*xxx#</span>{" "}
            代码可直接拨起拨号盘发送；
            含文字说明（如"拨打 *425# 后依次选 …"）的需要在拨号后按提示逐项选择。
          </p>
        </div>

        {carriers.map((c) => (
          <section
            key={c.name}
            className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden"
          >
            <div
              className={`bg-gradient-to-r ${c.color} text-white px-4 py-3 flex items-baseline justify-between`}
            >
              <h2 className="text-lg font-bold">{c.name}</h2>
              <span className="text-xs text-white/90">
                APN：<span className="font-mono">{c.apn}</span>
              </span>
            </div>
            <ul className="divide-y divide-gray-100">
              {c.items.map((it, i) => (
                <li key={i} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-sm text-gray-600 shrink-0 w-24">
                    {it.label}
                  </span>
                  {it.isUssd ? (
                    <a
                      href={ussdHref(it.value)}
                      className="flex-1 text-right font-mono font-semibold text-sky-700 hover:text-sky-900 active:scale-[0.99] transition"
                    >
                      {it.value}
                    </a>
                  ) : (
                    <span className="flex-1 text-right text-sm text-gray-800 font-mono">
                      {it.value}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="text-xs text-gray-400 text-center pt-2">
          以运营商最新公告为准。代码失效可在「商家入驻」表单留言反馈。
        </p>
      </main>
    </div>
  );
}
