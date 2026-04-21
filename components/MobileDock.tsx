"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  User,
  X,
  ShoppingCart,
  Store,
  Briefcase,
  UserPlus,
  Tag,
  Plane,
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
  { key: "hiring",     label: "发布招聘", icon: Briefcase,    color: "bg-gradient-to-br from-red-400 to-rose-500" },
  { key: "jobseeker",  label: "发布求职", icon: UserPlus,     color: "bg-gradient-to-br from-amber-400 to-yellow-500" },
  { key: "secondhand", label: "二手物品", icon: Tag,          color: "bg-gradient-to-br from-teal-400 to-sky-500" },
  { key: "luggage",    label: "顺风捎带", icon: Plane,        color: "bg-gradient-to-br from-fuchsia-400 to-rose-500" },
];

export default function MobileDock() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerClosing, setPickerClosing] = useState(false);
  const [formKey, setFormKey] = useState<FormKey | null>(null);
  const pathname = usePathname();

  // admin 页不显示(避免和后台自己的工具条打架)
  if (pathname?.startsWith("/admin")) return null;

  const isMyActive = pathname === "/my";

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
    // 等底部 sheet 收起再拉起 modal,动画不打架
    setTimeout(() => setFormKey(k), 200);
  };

  return (
    <>
      {/* 移动端悬浮胶囊 dock */}
      <div
        className="md:hidden fixed left-1/2 -translate-x-1/2 z-40 flex gap-2 px-3 py-2 rounded-full bg-white/85 backdrop-blur border border-gray-200 shadow-xl"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        aria-label="发布与我的发布"
      >
        <button
          onClick={openPicker}
          className="flex items-center gap-1.5 pl-3.5 pr-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm font-bold rounded-full shadow-md active:scale-95 transition"
        >
          <Sparkles size={15} fill="currentColor" />
          发布
        </button>
        <Link
          href="/my"
          className={`flex items-center gap-1.5 pl-3.5 pr-4 py-2 text-sm font-bold rounded-full transition active:scale-95 ${
            isMyActive
              ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md"
              : "bg-white text-gray-800 border border-gray-200"
          }`}
        >
          <User size={15} />
          我的发布
        </Link>
      </div>

      {/* 底部 sheet:选择发布类型 */}
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

      {/* 表单 modal */}
      {formKey && (
        <SubmissionModal formKey={formKey} onClose={() => setFormKey(null)} />
      )}
    </>
  );
}
