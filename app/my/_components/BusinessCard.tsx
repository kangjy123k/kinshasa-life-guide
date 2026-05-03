"use client";

import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Pencil,
  Languages,
  Maximize2,
  X,
  Copy,
  Check,
  CornerDownLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { createPortal } from "react-dom";
import { SingleImageUploader } from "@/components/ImageUploader";
import { useLocalRecord } from "./local-store";
import { SheetModal } from "./SheetModal";
import {
  BIZCARD_DEFAULTS,
  type BizCardData,
  type BizCardLang,
} from "./bizcard-types";
import { renderBizCardImage, pickLang } from "./bizcard-render";

export type { BizCardData } from "./bizcard-types";

const LANG_LABEL: Record<BizCardLang, string> = {
  zh: "中文",
  en: "English",
  fr: "Français",
};

const LANG_NEXT: Record<BizCardLang, BizCardLang> = {
  zh: "en",
  en: "fr",
  fr: "zh",
};

export function BusinessCard() {
  const [data, setData] = useLocalRecord<BizCardData>("bizcard.v1", BIZCARD_DEFAULTS);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lang, setLang] = useState<BizCardLang>("zh");

  const filled = !!data.company || !!data.name;

  return (
    <section className="bg-white rounded-3xl p-5 shadow-[0_2px_14px_rgba(15,23,42,0.04)] border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[19px] font-black text-black tracking-tight">职业名片</h2>
        {filled && (
          <div className="flex items-center gap-1.5">
            <IconChip
              label={LANG_LABEL[LANG_NEXT[lang]]}
              onClick={() => setLang(LANG_NEXT[lang])}
              icon={Languages}
            />
            <IconChip
              label="预览"
              onClick={() => setPreviewOpen(true)}
              icon={Maximize2}
            />
            <IconChip
              label="编辑"
              onClick={() => setEditOpen(true)}
              icon={Pencil}
            />
          </div>
        )}
      </div>

      {!filled ? (
        <EmptyState onEdit={() => setEditOpen(true)} />
      ) : (
        <CardBody data={data} lang={lang} />
      )}

      {editOpen && (
        <BizCardEditor
          initial={data}
          onClose={() => setEditOpen(false)}
          onSave={(d) => {
            setData(d);
            setEditOpen(false);
          }}
        />
      )}

      {previewOpen && (
        <FullscreenPreview
          data={data}
          initialLang={lang}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </section>
  );
}

function EmptyState({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
        <Briefcase size={22} className="text-gray-400" strokeWidth={1.6} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-gray-500 leading-relaxed">
          填一张你的职业名片
          <br />
          认识你的人能一眼看清你做什么
        </p>
        <button
          onClick={onEdit}
          className="mt-2 inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-black text-white text-[12px] font-bold active:scale-95 transition"
        >
          <Pencil size={11} />
          编辑名片
        </button>
      </div>
    </div>
  );
}

function CardBody({ data, lang }: { data: BizCardData; lang: BizCardLang }) {
  const company = pickLang(data, "company", lang);
  const business = pickLang(data, "business", lang);
  const name = pickLang(data, "name", lang);
  const address = pickLang(data, "address", lang);
  const showWechat = data.showWechat !== false && !!data.wechat?.trim();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {data.logo ? (
          <img
            src={data.logo}
            alt={company || "logo"}
            className="w-14 h-14 rounded-xl object-cover bg-gray-50 ring-1 ring-gray-100"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
            <Briefcase size={22} className="text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-black text-black truncate">
            {company || (lang === "fr" ? "Nom de l'entreprise" : lang === "en" ? "Company name" : "公司名称")}
          </p>
          {business && (
            <p className="text-[12px] text-gray-500 truncate mt-0.5">{business}</p>
          )}
        </div>
      </div>

      <div className="space-y-2 pl-1">
        {name && <ContactRow icon={Briefcase} value={name} />}
        {data.phone && <ContactRow icon={Phone} value={data.phone} copyable />}
        {showWechat && <ContactRow icon={MessageCircle} value={data.wechat} copyable />}
        {data.email && <ContactRow icon={Mail} value={data.email} copyable />}
        {address && <ContactRow icon={MapPin} value={address} />}
      </div>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  value,
  copyable,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="flex items-center gap-2 text-[13px] text-gray-800">
      <Icon size={13} className="text-gray-400 shrink-0" />
      <span className="flex-1 min-w-0 truncate">{value}</span>
      {copyable && (
        <button
          onClick={copy}
          aria-label="复制"
          className="shrink-0 w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 active:scale-95 transition"
        >
          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
        </button>
      )}
    </div>
  );
}

function IconChip({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition active:scale-95 bg-gray-100 hover:bg-gray-200 text-gray-700"
    >
      <Icon size={11} />
      {label}
    </button>
  );
}

// ---- Editor ----

const TAB_FIELDS: Record<
  BizCardLang,
  Array<{
    key: keyof BizCardData;
    label: string;
    placeholder: string;
    canReuse?: boolean;
    inputMode?: "text" | "email" | "tel";
  }>
> = {
  zh: [
    { key: "company", label: "公司名称", placeholder: "如 XX 国际贸易有限公司" },
    { key: "business", label: "主营业务 / 职位", placeholder: "如 钢材、水泥、五金建材" },
    { key: "name", label: "姓名", placeholder: "你的姓名" },
    { key: "address", label: "地址", placeholder: "如 Kinshasa, Gombe…" },
  ],
  en: [
    { key: "companyEn", label: "Company", placeholder: "e.g. ABC Trading Co., Ltd.", canReuse: true },
    { key: "businessEn", label: "Title / Business", placeholder: "e.g. Co-Founder & CTO", canReuse: true },
    { key: "nameEn", label: "Name", placeholder: "Your name", canReuse: true },
    { key: "addressEn", label: "Address", placeholder: "Kinshasa, Gombe…", canReuse: true },
  ],
  fr: [
    { key: "companyFr", label: "Nom de l'entreprise", placeholder: "Société…", canReuse: true },
    { key: "businessFr", label: "Activités / Poste", placeholder: "Co-Fondateur & CTO", canReuse: true },
    { key: "nameFr", label: "Nom", placeholder: "Prénom Nom", canReuse: true },
    { key: "addressFr", label: "Adresse", placeholder: "Kinshasa, Gombe…", canReuse: true },
  ],
};

const REUSE_SOURCE: Partial<Record<keyof BizCardData, keyof BizCardData>> = {
  companyEn: "company",
  businessEn: "business",
  nameEn: "name",
  addressEn: "address",
  companyFr: "company",
  businessFr: "business",
  nameFr: "name",
  addressFr: "address",
};

function BizCardEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: BizCardData;
  onClose: () => void;
  onSave: (d: BizCardData) => void;
}) {
  const [draft, setDraft] = useState<BizCardData>({
    ...BIZCARD_DEFAULTS,
    ...initial,
    showWechat: initial.showWechat !== false,
  });
  const [tab, setTab] = useState<BizCardLang>("zh");
  const set = <K extends keyof BizCardData>(k: K, v: BizCardData[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <SheetModal
      title="编辑职业名片"
      onClose={onClose}
      footer={
        <button
          onClick={() => onSave(draft)}
          className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white text-[14px] font-black rounded-full active:scale-95 transition"
        >
          保存名片
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>公司 logo</Label>
          <div className="w-32">
            <SingleImageUploader
              value={draft.logo}
              onChange={(url) => set("logo", url)}
              scope="profile-bizcard"
              placeholder="点击上传"
              aspect="1 / 1"
              fit="cover"
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <Label>语言版本</Label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-full">
            {(["zh", "en", "fr"] as BizCardLang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setTab(l)}
                className={`py-1.5 rounded-full text-[12px] font-bold transition active:scale-95 ${
                  tab === l ? "bg-white text-black shadow-sm" : "text-gray-500"
                }`}
              >
                {LANG_LABEL[l]}
              </button>
            ))}
          </div>

          <div className="space-y-3 pt-3">
            {TAB_FIELDS[tab].map((f) => {
              const reuseSrc = REUSE_SOURCE[f.key];
              const reuseValue = reuseSrc ? ((draft[reuseSrc] as string | undefined) ?? "") : "";
              const currentValue = (draft[f.key] as string | undefined) ?? "";
              const canReuse =
                !!f.canReuse && !!reuseValue && reuseValue !== currentValue;
              const writeStr = (v: string) =>
                setDraft((d) => ({ ...d, [f.key]: v }));
              return (
                <Field
                  key={f.key}
                  label={f.label}
                  value={currentValue}
                  onChange={writeStr}
                  placeholder={f.placeholder}
                  inputMode={f.inputMode}
                  action={
                    canReuse ? (
                      <button
                        type="button"
                        onClick={() => writeStr(reuseValue)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[11px] font-bold hover:bg-rose-100 active:scale-95 transition shrink-0"
                      >
                        <CornerDownLeft size={11} />
                        复用中文
                      </button>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <Label>通用联系方式（不分语言）</Label>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="联系电话"
              value={draft.phone}
              onChange={(v) => set("phone", v)}
              placeholder="+243…"
              inputMode="tel"
            />
            <Field
              label="邮箱"
              value={draft.email}
              onChange={(v) => set("email", v)}
              placeholder="name@example.com"
              inputMode="email"
            />
          </div>
          <Field
            label="微信号"
            value={draft.wechat}
            onChange={(v) => set("wechat", v)}
            placeholder="WeChat ID"
          />
          <button
            type="button"
            onClick={() => set("showWechat", !draft.showWechat)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition active:scale-[0.99] ${
              draft.showWechat
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}
          >
            <span className="flex items-center gap-2 text-[12px] font-bold">
              {draft.showWechat ? <Eye size={13} /> : <EyeOff size={13} />}
              在名片上展示微信
            </span>
            <span
              className={`relative w-9 h-5 rounded-full transition ${
                draft.showWechat ? "bg-emerald-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                  draft.showWechat ? "left-[18px]" : "left-0.5"
                }`}
              />
            </span>
          </button>
        </div>
      </div>
    </SheetModal>
  );
}

// ---- Fullscreen preview (landscape card image) ----

function FullscreenPreview({
  data,
  initialLang,
  onClose,
}: {
  data: BizCardData;
  initialLang: BizCardLang;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<BizCardLang>(initialLang);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const id = ++reqIdRef.current;
    setImgUrl(null);
    setError(null);
    renderBizCardImage(data, lang)
      .then((url) => {
        if (cancelled || reqIdRef.current !== id) return;
        setImgUrl(url);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[bizcard] render failed", e);
        setError("渲染失败");
      });
    return () => {
      cancelled = true;
    };
  }, [data, lang]);

  const handleClose = () => {
    setClosing((c) => {
      if (c) return c;
      setTimeout(onClose, 260);
      return true;
    });
  };

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-black/95 transition-opacity duration-300 ease-out ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <button
        onClick={handleClose}
        aria-label="关闭"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center active:scale-95 transition z-10"
      >
        <X size={20} />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 p-1 bg-white/10 rounded-full backdrop-blur-sm z-10"
      >
        {(["zh", "en", "fr"] as BizCardLang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition active:scale-95 ${
              lang === l ? "bg-white text-black" : "text-white/80 hover:text-white"
            }`}
          >
            {LANG_LABEL[l]}
          </button>
        ))}
      </div>

      <style>{`
        .bizcard-fit {
          width: min(95vw, calc(95dvh * 1.667));
          aspect-ratio: 1100 / 660;
        }
        @media (orientation: portrait) {
          .bizcard-fit {
            width: min(95dvh, calc(95vw * 1.667));
            transform: rotate(90deg);
          }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        className={`transition-transform duration-300 ${
          closing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt="名片"
            className="bizcard-fit rounded-xl shadow-2xl"
            style={{
              WebkitTouchCallout: "default",
              WebkitUserSelect: "auto",
              userSelect: "auto",
            }}
          />
        ) : error ? (
          <div className="bizcard-fit rounded-xl bg-white/5 flex items-center justify-center text-white/60 text-sm">
            {error}
          </div>
        ) : (
          <div className="bizcard-fit rounded-xl bg-white/5 flex items-center justify-center text-white/40 text-sm animate-pulse">
            生成中…
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ---- Form primitives ----

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
  inputMode,
  action,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-bold text-gray-700">{label}</span>
        {action}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rose-400"
      />
    </div>
  );
}
