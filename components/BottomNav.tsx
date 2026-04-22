"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  User,
  Plus,
  X,
  ShoppingCart,
  Store,
  Tag,
  CalendarHeart,
} from "lucide-react";
import { SubmissionModal, type FormKey } from "./SubmissionModal";

type Option = {
  key: FormKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
};

const PUBLISH_OPTIONS: Option[] = [
  { key: "purchase",   label: "求购信息", icon: ShoppingCart, color: "bg-gradient-to-br from-orange-400 to-amber-500" },
  { key: "merchant",   label: "商家入驻", icon: Store,        color: "bg-gradient-to-br from-sky-400 to-blue-500" },
  { key: "secondhand", label: "二手物品", icon: Tag,          color: "bg-gradient-to-br from-teal-400 to-sky-500" },
  { key: "event",      label: "发布活动", icon: CalendarHeart, color: "bg-gradient-to-br from-violet-500 to-sky-500" },
];

type Tab = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
};

const LEFT_TABS: Tab[] = [
  { href: "/", label: "首页", Icon: Home },
];
const RIGHT_TABS: Tab[] = [
  { href: "/my", label: "我的", Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerClosing, setPickerClosing] = useState(false);
  const [formKey, setFormKey] = useState<FormKey | null>(null);

  // admin 页不挂
  if (pathname?.startsWith("/admin")) return null;

  const openPicker = () => {
    setPickerClosing(false);
    setPickerOpen(true);
  };
  const closePicker = () => {
    setPickerClosing((c) => {
      if (c) return c;
      setTimeout(() => {
        setPickerOpen(false);
        setPickerClosing(false);
      }, 260);
      return true;
    });
  };
  const pickType = (k: FormKey) => {
    closePicker();
    setTimeout(() => setFormKey(k), 200);
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname?.startsWith(href + "/");

  return (
    <>
      {/* 底部 tab bar — 仅移动端 */}
      <nav
        className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-100"
        style={{
          boxShadow: "0 -2px 14px rgba(15, 23, 42, 0.05)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        aria-label="底部导航"
      >
        <div className="flex items-end h-14 px-1">
          {LEFT_TABS.map((t) => (
            <TabLink key={t.href} tab={t} active={isActive(t.href)} />
          ))}
          <button
            onClick={openPicker}
            aria-label="发布"
            className="flex-1 flex flex-col items-center gap-0.5 py-1 active:scale-95 transition"
          >
            <span className="-mt-4 w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-red-500 text-white flex items-center justify-center shadow-[0_6px_18px_rgba(244,63,94,0.45)] ring-4 ring-white">
              <Plus size={20} strokeWidth={2.8} />
            </span>
            <span className="text-[10px] font-semibold text-gray-500">发布</span>
          </button>
          {RIGHT_TABS.map((t) => (
            <TabLink key={t.href} tab={t} active={isActive(t.href)} />
          ))}
        </div>
      </nav>

      {/* 底部 sheet:选发布类型 */}
      {pickerOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out ${
            pickerClosing ? "opacity-0" : "opacity-100"
          }`}
          onClick={closePicker}
          aria-modal
          role="dialog"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md bg-white rounded-t-3xl px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-5 transition-transform duration-300 ease-out ${
              pickerClosing ? "translate-y-full" : "translate-y-0"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800">选择要发布的类型</h3>
              <button
                onClick={closePicker}
                aria-label="关闭"
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center active:scale-95 transition"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-x-2 gap-y-4">
              {PUBLISH_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    onClick={() => pickType(opt.key)}
                    className="flex flex-col items-center gap-1.5 py-1 active:scale-95 transition"
                  >
                    <span
                      className={`${opt.color} w-14 h-14 rounded-full flex items-center justify-center shadow-md ring-1 ring-white/70 ring-inset`}
                    >
                      <Icon size={22} className="text-white" />
                    </span>
                    <span className="text-[11px] font-medium text-gray-700 whitespace-nowrap">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 具体表单 */}
      {formKey && (
        <SubmissionModal formKey={formKey} onClose={() => setFormKey(null)} />
      )}
    </>
  );
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  const { Icon, label, href } = tab;
  return (
    <Link
      href={href}
      className={`flex-1 flex flex-col items-center gap-0.5 py-1 active:scale-95 transition ${
        active ? "text-red-500" : "text-gray-500"
      }`}
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.4 : 1.8}
        className={active ? "drop-shadow-sm" : ""}
      />
      <span className={`text-[10px] font-semibold ${active ? "" : "text-gray-500"}`}>
        {label}
      </span>
    </Link>
  );
}
