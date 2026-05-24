import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Download, ShieldCheck, Smartphone, Apple } from "lucide-react";

export const metadata: Metadata = {
  title: "下载 App · 刚华生活",
  description: "下载「刚华生活」安卓 App，扫码即装，全屏无广告。",
};

const APK_SIZE = "2.6 MB";
const APK_VERSION = "v1.0";

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white pb-24">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-sky-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            aria-label="返回首页"
            className="w-8 h-8 rounded-full hover:bg-sky-100 flex items-center justify-center text-gray-600 active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-1 h-5 bg-sky-400 rounded-full" />
            <h1 className="text-base font-bold text-gray-800">下载 App</h1>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-6 animate-[fadeIn_0.5s_ease-out]">
        {/* 应用卡片 */}
        <div className="flex flex-col items-center text-center">
          <div className="w-28 h-28 rounded-[26px] overflow-hidden shadow-lg shadow-sky-200/60 ring-1 ring-black/5">
            <Image src="/icon-512.png" alt="刚华生活" width={112} height={112} priority />
          </div>
          <h2 className="mt-4 text-xl font-black text-gray-800 tracking-tight">刚华生活</h2>
          <p className="mt-1 text-sm text-gray-500">刚果金华人生活服务指南</p>
          <p className="mt-1 text-xs text-gray-400">
            安卓 {APK_VERSION} · {APK_SIZE} · 全屏无广告
          </p>
        </div>

        {/* 下载按钮 */}
        <a
          href="/klg.apk"
          download="刚华生活.apk"
          className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white font-bold py-4 text-base shadow-lg shadow-sky-300/50 transition"
        >
          <Download size={20} />
          下载安装 APK
        </a>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck size={13} /> 官方签名 · 仅供刚果金华人社区使用
        </p>

        {/* 安装步骤 */}
        <div className="mt-7 rounded-2xl bg-white border border-sky-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone size={16} className="text-sky-500" />
            <h3 className="text-sm font-bold text-gray-700">安卓安装步骤</h3>
          </div>
          <ol className="space-y-3">
            {[
              "点上方「下载安装 APK」，等待下载完成。",
              "点开下载的文件；若提示「未知来源/未知应用」，点「设置」并允许本次安装即可。",
              "安装完成后桌面出现「刚华生活」图标，点开就是全屏 App。",
            ].map((t, i) => (
              <li key={i} className="flex gap-3 text-[13px] leading-relaxed text-gray-600">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-100 text-sky-600 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 扫码分享 */}
        <div className="mt-5 rounded-2xl bg-white border border-sky-100 p-5 shadow-sm flex items-center gap-4">
          <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-white ring-1 ring-sky-100">
            <Image src="/download-qr.png" alt="下载二维码" width={96} height={96} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700">扫码分享给朋友</h3>
            <p className="mt-1 text-[12px] text-gray-500 leading-relaxed">
              扫一扫打开本下载页，把 App 推荐给身边的刚果金华人。
            </p>
          </div>
        </div>

        {/* iOS 提示 */}
        <div className="mt-5 rounded-2xl bg-gray-50 border border-gray-100 p-4 flex gap-3">
          <Apple size={18} className="text-gray-500 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-600">iPhone 用户：</span>
            苹果系统不支持安装 APK。请用 Safari 打开本站，点底部「分享」→「添加到主屏幕」，
            同样能像 App 一样全屏使用。
          </p>
        </div>
      </main>
    </div>
  );
}
