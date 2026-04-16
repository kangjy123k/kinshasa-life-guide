import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";

export const metadata = {
  title: "本地话费充值指南 — 刚果金华人生活服务",
  description: "Vodacom · Orange · Airtel · Africell 充值码、客服电话、Mobile Money 速查",
};

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
            刚果金主流运营商充值码 · 客服电话 · Mobile Money
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <Info size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold mb-1">内容整理中</p>
            <p>
              本页正在按官方资料整理 Vodacom / Orange / Airtel / Africell
              的充值代码与客服电话，避免发布有误信息。整理完成后会同步上线。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
