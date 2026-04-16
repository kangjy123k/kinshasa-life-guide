import Link from "next/link";
import { ArrowLeft, Phone, Smartphone, Wallet, Info } from "lucide-react";

export const metadata = {
  title: "本地话费充值指南 — 刚果金华人生活服务",
  description: "Vodacom · Orange · Airtel · Africell 充值码、客服电话、Mobile Money 速查",
};

interface Carrier {
  name: string;
  color: string;
  airtimeUssd: string;
  customerCare: string;
  balance?: string;
  moneyName?: string;
  moneyUssd?: string;
  notes?: string[];
}

const carriers: Carrier[] = [
  {
    name: "Vodacom Congo",
    color: "from-red-500 to-red-600",
    airtimeUssd: "*123*充值码#",
    customerCare: "100",
    balance: "*101#",
    moneyName: "M-Pesa",
    moneyUssd: "*1222#",
    notes: [
      "刮开充值卡背面 14 位密码后拨打 *123*密码#。",
      "信号最广，金沙萨、矿区、内陆覆盖最好。",
    ],
  },
  {
    name: "Orange RDC",
    color: "from-orange-500 to-orange-600",
    airtimeUssd: "#123*充值码#",
    customerCare: "555",
    balance: "#124#",
    moneyName: "Orange Money",
    moneyUssd: "#144#",
    notes: [
      "Gombe 商圈、写字楼数据网速较好。",
      "Orange Money 可在 Orange 营业厅或代理点存取现金。",
    ],
  },
  {
    name: "Airtel RDC",
    color: "from-rose-500 to-pink-500",
    airtimeUssd: "*129*充值码#",
    customerCare: "121",
    balance: "*131#",
    moneyName: "Airtel Money",
    moneyUssd: "*432#",
    notes: [
      "套餐价相对便宜，适合做副号。",
      "代理点遍布大街，便利店多可代充。",
    ],
  },
  {
    name: "Africell RDC",
    color: "from-violet-500 to-purple-600",
    airtimeUssd: "*126*充值码#",
    customerCare: "123",
    balance: "*125#",
    moneyName: "Afrimoney",
    moneyUssd: "*144#",
    notes: [
      "新进入运营商，部分套餐流量便宜。",
      "覆盖以金沙萨主城为主，外省偏弱。",
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
            刚果金主流四大运营商：充值码 · 客服电话 · Mobile Money 速查
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>
            充值方式：路边小店、超市、营业厅可买刮刮卡（500 / 1 000 / 5 000 CDF
            等面额），刮开背面 14 位密码后按下方代码输入即可。手机点击代码可直接拨号；
            <span className="font-medium">USSD 中的 # 已编码，安卓拨号盘会自动识别，iOS 部分机型需手动补 #。</span>
          </p>
        </div>

        {carriers.map((c) => (
          <section
            key={c.name}
            className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden"
          >
            <div className={`bg-gradient-to-r ${c.color} text-white px-4 py-3`}>
              <h2 className="text-lg font-bold">{c.name}</h2>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <a
                href={ussdHref(c.airtimeUssd)}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-sky-50 hover:bg-sky-100 active:scale-[0.99] transition"
              >
                <span className="flex items-center gap-2 text-gray-700">
                  <Smartphone size={16} className="text-sky-600" />
                  话费充值
                </span>
                <span className="font-mono font-semibold text-sky-700">
                  {c.airtimeUssd}
                </span>
              </a>

              {c.balance && (
                <a
                  href={ussdHref(c.balance)}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-[0.99] transition"
                >
                  <span className="flex items-center gap-2 text-gray-700">
                    <Info size={16} className="text-gray-500" />
                    查询余额
                  </span>
                  <span className="font-mono font-semibold text-gray-700">
                    {c.balance}
                  </span>
                </a>
              )}

              {c.moneyUssd && (
                <a
                  href={ussdHref(c.moneyUssd)}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-[0.99] transition"
                >
                  <span className="flex items-center gap-2 text-gray-700">
                    <Wallet size={16} className="text-emerald-600" />
                    {c.moneyName}（电子钱包）
                  </span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {c.moneyUssd}
                  </span>
                </a>
              )}

              <a
                href={`tel:${c.customerCare}`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-[0.99] transition"
              >
                <span className="flex items-center gap-2 text-gray-700">
                  <Phone size={16} className="text-rose-600" />
                  客服热线
                </span>
                <span className="font-mono font-semibold text-rose-700">
                  {c.customerCare}
                </span>
              </a>

              {c.notes && (
                <ul className="text-xs text-gray-500 leading-relaxed pt-1 space-y-1 list-disc list-inside">
                  {c.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}

        <p className="text-xs text-gray-400 text-center pt-2">
          以运营商最新公告为准。如发现代码失效，欢迎在「商家入驻」表单留言反馈。
        </p>
      </main>
    </div>
  );
}
