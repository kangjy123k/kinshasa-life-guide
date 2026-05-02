"use client";

import Link from "next/link";
import { Star, Headphones } from "lucide-react";
import { ProfileCard } from "./_components/ProfileCard";
import { BusinessCard } from "./_components/BusinessCard";
import { PublishedSection } from "./_components/PublishedSection";

export default function MyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部白条：收藏 + 客服 */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link
            href="/?fav=1"
            aria-label="我的收藏"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 active:scale-95 transition"
          >
            <Star size={17} strokeWidth={2} />
          </Link>
          <a
            href="https://wa.me/8615901589983?text=你好%2C我在刚华生活有问题想咨询"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="联系客服"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 active:scale-95 transition"
          >
            <Headphones size={17} strokeWidth={2} />
          </a>
          <h1 className="ml-1 text-[15px] font-black text-black tracking-tight">
            我的
          </h1>
          <div className="ml-auto" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <ProfileCard />
        <BusinessCard />
        <PublishedSection />
      </main>
    </div>
  );
}
