"use client";

import { useEffect, useState } from "react";
import { Pencil, UserRound } from "lucide-react";
import { SingleImageUploader } from "@/components/ImageUploader";
import { useLocalRecord } from "./local-store";
import { SheetModal } from "./SheetModal";

export type Profile = {
  avatar: string;
  name: string;
  gender: string;
  age: string;
  city: string;
  bio: string;
};

const DEFAULTS: Profile = {
  avatar: "",
  name: "",
  gender: "",
  age: "",
  city: "",
  bio: "",
};

const CITIES = ["金沙萨", "卢本巴希", "戈马", "布卡武", "马塔迪", "其他城市"];

export function ProfileCard() {
  const [profile, setProfile] = useLocalRecord<Profile>("profile.v1", DEFAULTS);
  const [open, setOpen] = useState(false);

  const filled = !!profile.name;
  const subtitle = filled
    ? [profile.gender, profile.age && `${profile.age} 岁`, profile.city]
        .filter(Boolean)
        .join(" · ")
    : "性别 · 年龄 · 现居城市";

  return (
    <section className="bg-white rounded-3xl p-5 shadow-[0_2px_14px_rgba(15,23,42,0.04)] border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[19px] font-black text-black tracking-tight">
          个人资料
        </h2>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black text-white text-[11px] font-bold active:scale-95 transition"
        >
          <Pencil size={11} />
          {filled ? "编辑" : "编辑个人资料"}
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="shrink-0">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt="头像"
              className="w-16 h-16 rounded-full object-cover ring-2 ring-rose-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center ring-2 ring-gray-200">
              <UserRound size={28} className="text-gray-400" strokeWidth={1.6} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-[17px] font-bold truncate ${
              filled ? "text-black" : "text-gray-400"
            }`}
          >
            {filled ? profile.name : "用户名"}
          </p>
          <p className="text-[12px] text-gray-500 mt-0.5 truncate">{subtitle}</p>
          <p
            className={`text-[12px] mt-1 line-clamp-2 ${
              profile.bio ? "text-gray-700" : "text-gray-400 italic"
            }`}
          >
            {profile.bio || "个性签名 — 一句话介绍你自己"}
          </p>
        </div>
      </div>

      {open && (
        <ProfileEditor
          initial={profile}
          onClose={() => setOpen(false)}
          onSave={(p) => {
            setProfile(p);
            setOpen(false);
          }}
        />
      )}
    </section>
  );
}

function ProfileEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: Profile;
  onClose: () => void;
  onSave: (p: Profile) => void;
}) {
  const [draft, setDraft] = useState<Profile>(initial);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  // 防止年龄输入非数字
  useEffect(() => {
    if (draft.age && !/^\d{0,3}$/.test(draft.age)) {
      set("age", draft.age.replace(/\D/g, "").slice(0, 3));
    }
  }, [draft.age]);

  return (
    <SheetModal
      title="编辑个人资料"
      onClose={onClose}
      footer={
        <button
          onClick={() => onSave(draft)}
          className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white text-[14px] font-black rounded-full active:scale-95 transition"
        >
          保存
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>头像</Label>
          <div className="w-32">
            <SingleImageUploader
              value={draft.avatar}
              onChange={(url) => set("avatar", url)}
              scope="profile-avatar"
              placeholder="点击上传"
              aspect="1 / 1"
              fit="cover"
            />
          </div>
        </div>
        <Field
          label="用户名"
          value={draft.name}
          onChange={(v) => set("name", v)}
          maxLength={16}
          placeholder="想让别人怎么称呼你"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>性别</Label>
            <div className="flex gap-2">
              {["男", "女", "保密"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set("gender", g)}
                  className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition active:scale-95 ${
                    draft.gender === g
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <Field
            label="年龄"
            value={draft.age}
            onChange={(v) => set("age", v)}
            placeholder="如 32"
            inputMode="numeric"
          />
        </div>
        <div>
          <Label>现居城市（刚果金）</Label>
          <div className="flex flex-wrap gap-2">
            {CITIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("city", c)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition active:scale-95 ${
                  draft.city === c
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>个性签名</Label>
          <textarea
            value={draft.bio}
            onChange={(e) => set("bio", e.target.value)}
            rows={3}
            maxLength={60}
            placeholder="一句话介绍你自己"
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rose-400 resize-none"
          />
          <p className="mt-1 text-[10.5px] text-gray-400 text-right">
            {draft.bio.length} / 60
          </p>
        </div>
      </div>
    </SheetModal>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[12px] font-bold text-gray-700 mb-1.5">
      {children}
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "tel" | "email";
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rose-400"
      />
    </div>
  );
}
