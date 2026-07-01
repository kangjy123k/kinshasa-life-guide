import type { Metadata } from "next";
import FrenchSentenceClient from "./FrenchSentenceClient";

export const metadata: Metadata = {
  title: "每日法语一句 · 刚果金华人生活服务指南",
  description: "每天一句实用法语：句子 + 谐音 + 翻译 + 关键词讲解 + 四时态变位，悄悄学，惊艳所有人。",
};

// 纯静态 BANK 按本地日期解锁，无需服务端取数
export default function FrenchSentencePage() {
  return <FrenchSentenceClient />;
}
