"use client";

import Link from "next/link";
import { ArrowLeft, HardHat } from "lucide-react";
import { SpeakButton } from "@/components/BusinessCardUI";

interface Phrase {
  cn: string;
  fr: string;
}

interface Group {
  title: string;
  phrases: Phrase[];
}

const groups: Group[] = [
  {
    title: "打招呼 · 管工地基本交流",
    phrases: [
      { cn: "你好，开工了", fr: "Bonjour, on commence le travail" },
      { cn: "今天所有人都来了吗？", fr: "Est-ce que tout le monde est là aujourd'hui ?" },
      { cn: "谁是领班？", fr: "Qui est le chef d'équipe ?" },
      { cn: "请等一下", fr: "Attendez un instant, s'il vous plaît" },
      { cn: "听清楚了吗？", fr: "Vous avez bien compris ?" },
    ],
  },
  {
    title: "指挥施工",
    phrases: [
      { cn: "把这堵墙砌起来", fr: "Montez ce mur, s'il vous plaît" },
      { cn: "这里不平，重新做", fr: "Ce n'est pas droit, refaites-le" },
      { cn: "先搅水泥，再搬砖", fr: "D'abord, mélangez le ciment, ensuite apportez les briques" },
      { cn: "把这堆沙子运到那边", fr: "Transportez ce tas de sable là-bas" },
      { cn: "今天要完成这部分", fr: "Aujourd'hui, on doit finir cette partie" },
    ],
  },
  {
    title: "安全 · 警告",
    phrases: [
      { cn: "戴好安全帽", fr: "Mettez bien votre casque" },
      { cn: "小心，有电", fr: "Attention, il y a du courant électrique" },
      { cn: "这里很危险，不要靠近", fr: "C'est dangereux ici, ne vous approchez pas" },
      { cn: "用绳子绑好", fr: "Attachez-le bien avec une corde" },
      { cn: "慢一点，别急", fr: "Doucement, ne vous précipitez pas" },
    ],
  },
  {
    title: "材料 · 工具",
    phrases: [
      { cn: "缺水泥了，去买一袋", fr: "Il manque du ciment, allez en acheter un sac" },
      { cn: "把铁锹拿来", fr: "Apportez la pelle" },
      { cn: "这个钻头不行，换一个", fr: "Ce foret ne va pas, changez-le" },
      { cn: "多少钱一袋？", fr: "Combien coûte un sac ?" },
      { cn: "你们有几个人？", fr: "Vous êtes combien ?" },
    ],
  },
  {
    title: "工时 · 工钱",
    phrases: [
      { cn: "今天下班", fr: "On arrête pour aujourd'hui" },
      { cn: "明天早上 7 点开始", fr: "On commence demain à 7 heures du matin" },
      { cn: "这周五结工钱", fr: "On paie le salaire vendredi de cette semaine" },
      { cn: "这不是我们说好的价格", fr: "Ce n'est pas le prix qu'on avait convenu" },
      { cn: "干得好，加班费给你", fr: "Vous avez bien travaillé, je vous donne une prime" },
    ],
  },
];

export default function ConstructionFrenchPage() {
  return (
    <div className="min-h-screen bg-sky-50">
      <section className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            aria-label="返回首页"
          >
            <ArrowLeft size={18} />
          </Link>
          <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <HardHat size={20} />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight">工地常用法语</h1>
            <p className="text-xs text-white/80">点喇叭听真人发音</p>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {groups.map((g, gi) => (
          <div key={g.title} className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
            <div className="px-4 py-2.5 bg-sky-50 border-b border-sky-100">
              <h2 className="text-sm font-bold text-gray-800">{g.title}</h2>
            </div>
            <ul className="divide-y divide-sky-100">
              {g.phrases.map((p, pi) => (
                <li key={p.fr} className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium">{p.cn}</p>
                    <p className="text-sm text-sky-700 mt-0.5 leading-snug">{p.fr}</p>
                  </div>
                  <SpeakButton text={p.fr} cacheKey={`cf-${gi}-${pi}`} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        <p className="text-xs text-gray-400 text-center pt-2">
          发音来自 Gemini TTS，首次会稍慢，之后复用缓存。
        </p>
      </div>
    </div>
  );
}
