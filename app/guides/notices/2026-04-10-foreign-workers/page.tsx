import Link from "next/link";
import { ArrowLeft, AlertTriangle, FileText, Calendar, User2 } from "lucide-react";

export const metadata = {
  title: "官方公告：制止违规雇佣外籍劳动者 — 刚果金华人生活服务",
  description:
    "刚果民主共和国就业与劳动部 017/CAB/MIN.ET/FMM/JTN/04/2026 号公告，30 天整改期限。",
};

const META = {
  title: "制止违规雇佣外籍劳动者",
  number: "017/CAB/MIN.ET/FMM/JTN/04/2026",
  issuer: "刚果民主共和国 · 就业与劳动部 部长",
  signer: "Ferdinand MASSAMBA WA MASSAMBA",
  issueDate: "2026-04-10",
  deadline: "2026-05-10",
  place: "金沙萨",
};

export default function NoticeForeignWorkersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <header className="bg-gradient-to-r from-red-600 to-rose-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/90 hover:text-white mb-3"
          >
            <ArrowLeft size={16} /> 返回首页
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-semibold mb-2">
            <AlertTriangle size={14} /> 官方公告
          </div>
          <h1 className="text-2xl md:text-3xl font-black leading-tight">
            {META.title}
          </h1>
          <p className="text-sm md:text-base text-rose-100 mt-2">{META.issuer}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <section className="bg-white rounded-2xl shadow-sm border border-rose-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <FileText size={16} className="mt-0.5 text-rose-500" />
            <div>
              <div className="text-gray-500 text-xs">公告编号</div>
              <div className="font-mono font-semibold text-gray-800">
                {META.number}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar size={16} className="mt-0.5 text-rose-500" />
            <div>
              <div className="text-gray-500 text-xs">发布日期</div>
              <div className="font-semibold text-gray-800">
                {META.issueDate}（{META.place}）
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 sm:col-span-2">
            <AlertTriangle size={16} className="mt-0.5 text-amber-500" />
            <div>
              <div className="text-gray-500 text-xs">整改期限</div>
              <div className="font-semibold text-gray-800">
                自公告发布日起 30 个日历日（截至 {META.deadline}），逾期可暂停经营活动并移送法院。
              </div>
            </div>
          </div>
        </section>

        <article className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5 text-[15px] leading-7 text-gray-800 space-y-4">
          <p>
            就业与劳动部特此通知国内公众、各经济经营者以及全体社会伙伴：共和国政府在共和国总统阁下的最高权威领导下，并在总理兼政府首脑女士的统筹协调下，已启动一项坚定而立即执行的行动，以制止与滥用外国劳动力有关的违法行为。
          </p>
          <p>
            事实上，各类企业仍持续蓄意规避国家就业法律，优先使用外籍劳动力，损害刚果籍劳动者利益，这明显违反了现行法规。
          </p>

          <h2 className="text-base font-bold text-gray-900 pt-2">就此，特提醒如下：</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              凡未经事先批准雇佣外籍劳动者的行为，均构成严重的行政违法行为，依据的是 2025 年 10 月 9 日第
              <span className="font-mono"> 075/CAB/MIN.ET/FMM/RK/10/2025 </span>号部长令的相关规定。
            </li>
            <li>
              外国人占据保留给本国公民的工作岗位，属严格禁止行为，违规者将受到处罚，依据的是 1986 年 3 月 31 日第
              <span className="font-mono"> 86/001 </span>号部令的相关规定。
            </li>
          </ol>

          <h2 className="text-base font-bold text-gray-900 pt-2">因此：</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>全国范围内将立即展开一项强化且有针对性的检查行动，且不预先通知；</li>
            <li>
              凡发现任何违规情况，将立即采取措施，包括在有关主管部门配合下，对相关外籍劳动者实施行政驱逐，以及对违规企业部分或全部暂停其经营活动；
            </li>
            <li>涉事企业的管理人员和负责人，可能依据现行法律法规被追究责任。</li>
          </ul>

          <p className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900">
            自本公告发布之日起，给予雇主严格的 <strong>三十（30）个日历日</strong> 期限，以全面补正规范其外籍员工的行政手续；否则，将面临最高可达暂停经营活动并移送有管辖权法院处理的处罚。
          </p>

          <p>
            这一举措属于国家经济主权政策以及保护刚果就业市场的一部分。
          </p>
          <p>
            因此，任何形式的欺诈、对劳动力的滥用性替代，以及对本国人才能力的边缘化，都将不再被容忍。
          </p>

          <div className="pt-4 mt-4 border-t border-gray-100 text-sm text-gray-600">
            <p>发布于 {META.place}，{META.issueDate}</p>
            <p className="flex items-center gap-1.5 mt-2">
              <User2 size={14} /> {META.signer}
            </p>
          </div>
        </article>

        <p className="text-xs text-gray-400 text-center pt-2">
          译文仅供参考，以官方法语原文为准。
        </p>
      </main>
    </div>
  );
}
