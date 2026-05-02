"use client";

import { useState } from "react";
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
} from "lucide-react";
import { createPortal } from "react-dom";
import { SingleImageUploader } from "@/components/ImageUploader";
import { useLocalRecord } from "./local-store";
import { SheetModal } from "./SheetModal";

export type BizCardData = {
  logo: string;
  company: string;
  /** 主营业务（中文） */
  business: string;
  name: string;
  phone: string;
  wechat: string;
  email: string;
  address: string;
  /** 法语版本（仅 company / business / name / address 翻译） */
  companyFr: string;
  businessFr: string;
  nameFr: string;
  addressFr: string;
};

const DEFAULTS: BizCardData = {
  logo: "",
  company: "",
  business: "",
  name: "",
  phone: "",
  wechat: "",
  email: "",
  address: "",
  companyFr: "",
  businessFr: "",
  nameFr: "",
  addressFr: "",
};

export function BusinessCard() {
  const [data, setData] = useLocalRecord<BizCardData>("bizcard.v1", DEFAULTS);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lang, setLang] = useState<"zh" | "fr">("zh");

  const filled = !!data.company || !!data.name;
  const hasFr = !!(data.companyFr || data.businessFr || data.nameFr);

  return (
    <section className="bg-white rounded-3xl p-5 shadow-[0_2px_14px_rgba(15,23,42,0.04)] border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[19px] font-black text-black tracking-tight">
          职业名片
        </h2>
        {filled && (
          <div className="flex items-center gap-1.5">
            <IconChip
              label={lang === "zh" ? "法语" : "中文"}
              onClick={() => setLang(lang === "zh" ? "fr" : "zh")}
              icon={Languages}
              disabled={!hasFr && lang === "zh"}
              hint={!hasFr && lang === "zh" ? "请先在编辑里填法语版" : undefined}
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
          lang={lang}
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

function CardBody({
  data,
  lang,
}: {
  data: BizCardData;
  lang: "zh" | "fr";
}) {
  const company = lang === "fr" && data.companyFr ? data.companyFr : data.company;
  const business =
    lang === "fr" && data.businessFr ? data.businessFr : data.business;
  const name = lang === "fr" && data.nameFr ? data.nameFr : data.name;
  const address = lang === "fr" && data.addressFr ? data.addressFr : data.address;

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
            {company || (lang === "fr" ? "Nom de l'entreprise" : "公司名称")}
          </p>
          {business && (
            <p className="text-[12px] text-gray-500 truncate mt-0.5">{business}</p>
          )}
        </div>
      </div>

      <div className="space-y-2 pl-1">
        {name && <ContactRow icon={Briefcase} value={name} />}
        {data.phone && (
          <ContactRow icon={Phone} value={data.phone} copyable />
        )}
        {data.wechat && (
          <ContactRow icon={MessageCircle} value={data.wechat} copyable />
        )}
        {data.email && (
          <ContactRow icon={Mail} value={data.email} copyable />
        )}
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
  disabled,
  hint,
}: {
  label: string;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition active:scale-95 ${
        disabled
          ? "bg-gray-50 text-gray-300"
          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
      }`}
    >
      <Icon size={11} />
      {label}
    </button>
  );
}

function BizCardEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: BizCardData;
  onClose: () => void;
  onSave: (d: BizCardData) => void;
}) {
  const [draft, setDraft] = useState<BizCardData>(initial);
  const [showFr, setShowFr] = useState(
    !!(initial.companyFr || initial.businessFr || initial.nameFr || initial.addressFr)
  );
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
        <Field
          label="公司名称"
          value={draft.company}
          onChange={(v) => set("company", v)}
          placeholder="如 XX 国际贸易有限公司"
        />
        <Field
          label="主营业务"
          value={draft.business}
          onChange={(v) => set("business", v)}
          placeholder="如 钢材、水泥、五金建材"
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="姓名"
            value={draft.name}
            onChange={(v) => set("name", v)}
            placeholder="姓名"
          />
          <Field
            label="联系电话"
            value={draft.phone}
            onChange={(v) => set("phone", v)}
            placeholder="+243…"
            inputMode="tel"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="微信号"
            value={draft.wechat}
            onChange={(v) => set("wechat", v)}
            placeholder="WeChat ID"
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
          label="地址"
          value={draft.address}
          onChange={(v) => set("address", v)}
          placeholder="如 Kinshasa, Gombe…"
        />

        <div className="border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => setShowFr((s) => !s)}
            className="w-full flex items-center justify-between py-2 text-[13px] font-bold text-gray-700"
          >
            <span className="flex items-center gap-1.5">
              <Languages size={14} className="text-rose-500" />
              法语版（可选 · 给本地客户看）
            </span>
            <span className="text-[11px] text-gray-400">
              {showFr ? "收起" : "展开"}
            </span>
          </button>
          {showFr && (
            <div className="space-y-3 pt-2">
              <Field
                label="Nom de l'entreprise"
                value={draft.companyFr}
                onChange={(v) => set("companyFr", v)}
                placeholder="Société…"
              />
              <Field
                label="Activités principales"
                value={draft.businessFr}
                onChange={(v) => set("businessFr", v)}
                placeholder="Acier, ciment, quincaillerie…"
              />
              <Field
                label="Nom"
                value={draft.nameFr}
                onChange={(v) => set("nameFr", v)}
                placeholder="Prénom Nom"
              />
              <Field
                label="Adresse"
                value={draft.addressFr}
                onChange={(v) => set("addressFr", v)}
                placeholder="Kinshasa, Gombe…"
              />
            </div>
          )}
        </div>
      </div>
    </SheetModal>
  );
}

function FullscreenPreview({
  data,
  lang,
  onClose,
}: {
  data: BizCardData;
  lang: "zh" | "fr";
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const handleClose = () => {
    setClosing((c) => {
      if (c) return c;
      setTimeout(onClose, 260);
      return true;
    });
  };

  const company = lang === "fr" && data.companyFr ? data.companyFr : data.company;
  const business =
    lang === "fr" && data.businessFr ? data.businessFr : data.business;
  const name = lang === "fr" && data.nameFr ? data.nameFr : data.name;
  const address = lang === "fr" && data.addressFr ? data.addressFr : data.address;

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black p-6 transition-opacity duration-300 ease-out ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <button
        onClick={handleClose}
        aria-label="关闭"
        className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center active:scale-95 transition"
      >
        <X size={18} />
      </button>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm bg-white rounded-3xl p-7 shadow-2xl transition-transform duration-300 ${
          closing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <div className="flex items-start gap-4">
          {data.logo ? (
            <img
              src={data.logo}
              alt={company}
              className="w-20 h-20 rounded-2xl object-cover bg-gray-50 ring-1 ring-gray-100"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Briefcase size={32} className="text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[20px] leading-tight font-black text-black">{company}</p>
            {business && (
              <p className="text-[12px] text-gray-500 mt-1.5">{business}</p>
            )}
          </div>
        </div>

        <div className="mt-5 h-px bg-gray-100" />

        <div className="mt-4 space-y-2.5 text-[13px]">
          {name && (
            <p className="font-bold text-black">{name}</p>
          )}
          {data.phone && (
            <p className="flex items-center gap-2 text-gray-700">
              <Phone size={14} className="text-rose-500" />
              {data.phone}
            </p>
          )}
          {data.wechat && (
            <p className="flex items-center gap-2 text-gray-700">
              <MessageCircle size={14} className="text-emerald-500" />
              {data.wechat}
            </p>
          )}
          {data.email && (
            <p className="flex items-center gap-2 text-gray-700 break-all">
              <Mail size={14} className="text-sky-500" />
              {data.email}
            </p>
          )}
          {address && (
            <p className="flex items-start gap-2 text-gray-700">
              <MapPin size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <span>{address}</span>
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-gray-300 tracking-widest uppercase">
          KINSHASA · 刚华生活
        </p>
      </div>
    </div>,
    document.body
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
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
}) {
  return (
    <div>
      <Label>{label}</Label>
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
