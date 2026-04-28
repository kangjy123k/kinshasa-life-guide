"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import dynamic from "next/dynamic";
import { X, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { categories, KINSHASA_COMMUNES } from "@/lib/businesses";
import { getOwnerToken, setOwnerToken } from "@/lib/owner-token-client";
import { SingleImageUploader, MultiImageUploader } from "@/components/ImageUploader";
import { AvailabilityPicker } from "@/components/AvailabilityPicker";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] rounded-lg border border-gray-200 bg-gray-50 animate-pulse" />
  ),
});

type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "subcategory"
  | "date"
  | "range-usd"
  | "range-count"
  | "radio"
  | "contact-group"
  | "image"
  | "gallery"
  | "location-picker"
  | "availability";

interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  helpText?: string;
  conditional?: { field: string; equals: string };
}

interface FormDef {
  title: string;
  fields: FormField[];
  /** variant 模式：顶部强制渲染一个 radio，下面字段按选中值切换 */
  variantSelector?: { name: string; label: string; options: string[] };
  variants?: Record<string, FormField[]>;
}

export type FormKey =
  | "merchant"
  | "secondhand"
  | "purchase"
  | "event";

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const merchantCommonStorefrontFields: FormField[] = [
  {
    name: "hasStore",
    label: "是否有门店",
    type: "select",
    required: true,
    options: ["有", "无"],
  },
  {
    name: "storeAddress",
    label: "具体地址（法语）",
    type: "text",
    required: true,
    placeholder: "网站自动语音播报，方便客人告诉司机",
    conditional: { field: "hasStore", equals: "有" },
  },
  {
    name: "storeLocation",
    label: "地图定位",
    type: "location-picker",
    required: true,
    helpText: "在地图上点一下放大头钉，客人能在商家地图里看到这个点",
    conditional: { field: "hasStore", equals: "有" },
  },
];

const merchantCompanyFields: FormField[] = [
  { name: "nameZh", label: "商家中文名称", type: "text", required: true },
  { name: "nameIntl", label: "商家外文名称", type: "text" },
  { name: "contactPerson", label: "联系人称呼", type: "text", required: true },
  { name: "phone", label: "联系人电话/WhatsApp", type: "text", required: true },
  { name: "wechat", label: "联系人微信号", type: "text" },
  {
    name: "category",
    label: "所属分类",
    type: "select",
    required: true,
    options: categories.map((c) => c.label),
  },
  { name: "subcategory", label: "子分类（可多选）", type: "subcategory", required: true },
  ...merchantCommonStorefrontFields,
  {
    name: "area",
    label: "所在区域（金沙萨）",
    type: "select",
    required: true,
    options: KINSHASA_COMMUNES,
  },
  {
    name: "mainService",
    label: "主营产品或服务介绍",
    type: "textarea",
    required: true,
    placeholder: "前 60 个字符将显示在商家卡片页上",
  },
  {
    name: "coverImageUrl",
    label: "页面首图（可选）",
    type: "image",
    helpText: "点击从手机相册选择；自动压缩。显示在商家卡片和详情页顶部，建议选横图。",
  },
  {
    name: "galleryUrls",
    label: "相册（可选 · 最多 12 张）",
    type: "gallery",
    helpText: "从手机相册多选，展示门店 / 产品 / 服务现场照。在详情页以九宫格展示。",
  },
  {
    name: "latestUpdateText",
    label: "最新动态（可选）",
    type: "textarea",
    placeholder: "新品到货 / 限时折扣 / 营业时间变更…审核通过后可随时在「我的发布」里再次编辑。",
  },
  {
    name: "latestUpdateImages",
    label: "最新动态配图（可选 · 最多 6 张）",
    type: "gallery",
    helpText: "从手机相册选择，用于展示最新产品或打折活动。",
  },
];

const merchantIndividualFields: FormField[] = [
  { name: "nameZh", label: "商家名称", type: "text", required: true },
  { name: "phone", label: "电话/WhatsApp", type: "text", required: true },
  { name: "wechat", label: "微信号", type: "text" },
  {
    name: "category",
    label: "所属分类",
    type: "select",
    required: true,
    options: categories.map((c) => c.label),
  },
  { name: "subcategory", label: "子分类（可多选）", type: "subcategory", required: true },
  {
    name: "mainService",
    label: "主营业务描述",
    type: "textarea",
    required: true,
    placeholder: "前 60 个字符将显示在商家卡片页上",
  },
  {
    name: "area",
    label: "所在区域（金沙萨）",
    type: "select",
    required: true,
    options: KINSHASA_COMMUNES,
  },
  {
    name: "coverImageUrl",
    label: "页面首图（可选）",
    type: "image",
    helpText: "点击从手机相册选择；自动压缩。显示在商家卡片和详情页顶部，建议选横图。",
  },
  {
    name: "galleryUrls",
    label: "相册（可选 · 最多 12 张）",
    type: "gallery",
    helpText: "从手机相册多选；个人展示工作现场或作品照。",
  },
  {
    name: "availabilityDates",
    label: "最近档期（未来 90 天）",
    type: "availability",
    helpText: "点选你能接活的日期；客人会优先看到档期更新过的商家。可以随时在「我的发布」里再点。",
  },
];

export const FORMS: Record<FormKey, FormDef> = {
  purchase: {
    title: "求购信息发布",
    fields: [
      { name: "itemName", label: "求购物品名称", type: "text", required: true },
      { name: "quantity", label: "数量", type: "text", required: true },
      {
        name: "description",
        label: "详细描述（可选）",
        type: "textarea",
        placeholder: "规格、品牌、型号、用途等，越详细越容易找到对的人",
      },
      {
        name: "galleryUrls",
        label: "参考图片（可选 · 最多 9 张）",
        type: "gallery",
        helpText: "从手机相册选择，发布后会在求购卡片上展示。",
      },
      { name: "budget", label: "预算区间（美元）", type: "range-usd", required: true },
      { name: "deadline", label: "最晚收货时间", type: "date", required: true },
      {
        name: "paymentMethod",
        label: "付费方式",
        type: "select",
        required: true,
        options: ["发货前支付全款", "首款-尾款", "收货后付款"],
      },
      {
        name: "area",
        label: "收货人所在区域",
        type: "select",
        required: true,
        options: KINSHASA_COMMUNES,
      },
      { name: "contactPerson", label: "发布人称呼", type: "text", required: true },
      { name: "phone", label: "发布人电话/WhatsApp", type: "text", required: true },
      { name: "wechat", label: "发布人微信号", type: "text", required: true },
    ],
  },
  merchant: {
    title: "商家入驻申请",
    fields: [],
    variantSelector: {
      name: "merchantType",
      label: "商家类型",
      options: ["公司型", "个人型"],
    },
    variants: {
      "公司型": merchantCompanyFields,
      "个人型": merchantIndividualFields,
    },
  },
  secondhand: {
    title: "二手物品发布",
    fields: [
      { name: "itemName", label: "物品名称", type: "text", required: true },
      { name: "categoryKey", label: "物品类别关键词", type: "text" },
      {
        name: "condition",
        label: "新旧程度",
        type: "select",
        required: true,
        options: ["全新", "9 成新", "8 成新", "7 成新", "6 成新及以下"],
      },
      { name: "price", label: "售价（美元）", type: "text", required: true },
      { name: "description", label: "物品描述", type: "textarea", required: true },
      {
        name: "galleryUrls",
        label: "物品图片（可选 · 最多 9 张）",
        type: "gallery",
        helpText: "从手机相册选择；第一张作为物品封面，其余在详情页以九宫格展示。",
      },
      { name: "address", label: "物品所在地址", type: "text", required: true },
      { name: "contactPerson", label: "联系人称呼", type: "text", required: true },
      { name: "contact", label: "联系方式", type: "contact-group", required: true },
    ],
  },
  event: {
    title: "发布活动申请",
    fields: [
      { name: "eventName", label: "活动名称", type: "text", required: true },
      {
        name: "recurrence",
        label: "重复性",
        type: "radio",
        required: true,
        options: ["单次活动", "常规活动"],
      },
      { name: "eventDate", label: "活动日期", type: "date", required: true },
      { name: "eventVenue", label: "活动地点", type: "text", required: true, placeholder: "场地名 + 区域，例：Pullman · Gombe" },
      {
        name: "participantCount",
        label: "参与人数（最少 — 最多）",
        type: "range-count",
        required: true,
      },
      { name: "organizer", label: "活动组织方", type: "text", required: true },
      {
        name: "eventDescription",
        label: "活动内容描述",
        type: "textarea",
        required: true,
        placeholder: "活动亮点、流程、报名方式…",
      },
      {
        name: "galleryUrls",
        label: "活动相册（可选 · 最多 12 张）",
        type: "gallery",
        helpText: "从手机相册选择；第一张会作为海报。",
      },
      { name: "contactPerson", label: "联系人称呼", type: "text", required: true },
      { name: "contact", label: "联系方式", type: "contact-group", required: true },
    ],
  },
};

function variantSelectorAsField(def: FormDef): FormField | null {
  if (!def.variantSelector) return null;
  return {
    name: def.variantSelector.name,
    label: def.variantSelector.label,
    type: "radio",
    required: true,
    options: def.variantSelector.options,
  };
}

function getActiveFields(def: FormDef, values: Record<string, string>): FormField[] {
  if (!def.variantSelector || !def.variants) return def.fields;
  const sel = variantSelectorAsField(def)!;
  const picked = values[def.variantSelector.name];
  const vfields = (picked && def.variants[picked]) || [];
  return [sel, ...vfields, ...def.fields];
}

function getAllPossibleFields(def: FormDef): FormField[] {
  if (!def.variantSelector || !def.variants) return def.fields;
  const sel = variantSelectorAsField(def)!;
  const all = Object.values(def.variants).flat();
  return [sel, ...all, ...def.fields];
}

export function SubmissionModal({
  formKey,
  onClose,
  editRecordId,
  initialData,
  onSaved,
}: {
  formKey: FormKey;
  onClose: () => void;
  /** 传入表示进入编辑模式：POST /api/my/update 而非 /api/submit */
  editRecordId?: string;
  /** 编辑时用于回填表单，包含 DB 里 data_json 的全部键值 */
  initialData?: Record<string, string>;
  /** 编辑成功的回调（新增成功仍走原来的 done 页面） */
  onSaved?: () => void;
}) {
  const editing = !!editRecordId;
  const def = FORMS[formKey];
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    // variant 模式：默认选第一项；编辑模式则用 initialData 里的值（在下方回填覆盖）
    if (def.variantSelector && def.variants) {
      seed[def.variantSelector.name] = def.variantSelector.options[0];
    }
    const allFields = getAllPossibleFields(def);
    allFields.forEach((f) => {
      if (f.type === "date") seed[f.name] = todayISO();
    });
    if (initialData) {
      for (const f of allFields) {
        if (f.type === "range-usd" || f.type === "range-count") {
          // DB 里存的是 xxxMin / xxxMax，表单内部键是 xxx_min / xxx_max
          const lo = initialData[`${f.name}Min`];
          const hi = initialData[`${f.name}Max`];
          if (lo != null) seed[`${f.name}_min`] = String(lo);
          if (hi != null) seed[`${f.name}_max`] = String(hi);
        } else if (f.type === "contact-group") {
          (["phone", "whatsapp", "wechat", "email"] as const).forEach((k) => {
            const key = `${f.name}_${k}`;
            if (initialData[key] != null) seed[key] = String(initialData[key]);
          });
        } else if (f.type === "location-picker") {
          const lat = initialData[`${f.name}Lat`];
          const lng = initialData[`${f.name}Lng`];
          if (lat != null) seed[`${f.name}_lat`] = String(lat);
          if (lng != null) seed[`${f.name}_lng`] = String(lng);
        } else if (initialData[f.name] != null) {
          seed[f.name] = String(initialData[f.name]);
        }
      }
    }
    return seed;
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleClose = () => {
    setClosing((c) => {
      if (c) return c;
      setTimeout(onClose, 260);
      return true;
    });
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const update = (name: string, v: string) =>
    setValues((prev) => {
      const next = { ...prev, [name]: v };
      if (name === "category" && prev.category !== v) next.subcategory = "";
      if (name === "hasStore" && prev.hasStore !== v && v !== "有") {
        next.storeAddress = "";
        next.storeLocation_lat = "";
        next.storeLocation_lng = "";
      }
      return next;
    });

  const isActive = (f: FormField) => {
    if (!f.conditional) return true;
    return values[f.conditional.field] === f.conditional.equals;
  };

  const activeFields = getActiveFields(def, values);

  const submit = async () => {
    for (const f of activeFields) {
      if (!isActive(f)) continue;
      if (!f.required) continue;

      if (f.type === "subcategory") {
        const cat = categories.find((c) => c.label === values.category);
        if (cat && cat.sub.length > 0 && !values[f.name]?.trim()) {
          setError(`请选择「${f.label}」`);
          return;
        }
        continue;
      }

      if (f.type === "range-usd" || f.type === "range-count") {
        const lo = values[`${f.name}_min`]?.trim();
        const hi = values[`${f.name}_max`]?.trim();
        if (!lo || !hi) {
          setError(`请填写「${f.label}」最小和最大值`);
          return;
        }
        continue;
      }

      if (f.type === "contact-group") {
        const any = ["phone", "whatsapp", "wechat", "email"].some((k) =>
          values[`${f.name}_${k}`]?.trim()
        );
        if (!any) {
          setError(`请至少填写一项「${f.label}」`);
          return;
        }
        continue;
      }

      if (f.type === "location-picker") {
        const lat = values[`${f.name}_lat`]?.trim();
        const lng = values[`${f.name}_lng`]?.trim();
        if (!lat || !lng) {
          setError(`请在地图上点一下放置「${f.label}」大头钉`);
          return;
        }
        continue;
      }

      if (!values[f.name]?.trim()) {
        setError(`请填写「${f.label}」`);
        return;
      }
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {};
      for (const f of activeFields) {
        if (!isActive(f)) continue;
        if (f.name.startsWith("_")) continue;
        if (f.type === "range-usd" || f.type === "range-count") {
          payload[`${f.name}Min`] = values[`${f.name}_min`] ?? "";
          payload[`${f.name}Max`] = values[`${f.name}_max`] ?? "";
        } else if (f.type === "contact-group") {
          (["phone", "whatsapp", "wechat", "email"] as const).forEach((k) => {
            payload[`${f.name}_${k}`] = values[`${f.name}_${k}`] ?? "";
          });
        } else if (f.type === "location-picker") {
          payload[`${f.name}Lat`] = values[`${f.name}_lat`] ?? "";
          payload[`${f.name}Lng`] = values[`${f.name}_lng`] ?? "";
        } else {
          payload[f.name] = values[f.name] ?? "";
        }
      }
      // 个人型档期：用户每次提交/编辑都更新 availabilityUpdatedAt，供卡片显示「档期更新」徽标
      if (formKey === "merchant" && payload.availabilityDates?.trim()) {
        payload.availabilityUpdatedAt = new Date().toISOString();
      }
      const token = getOwnerToken();
      if (editing) {
        const res = await fetch("/api/my/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "x-owner-token": token } : {}),
          },
          body: JSON.stringify({ id: editRecordId, data: payload }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(json.error || "update failed");
        }
        onSaved?.();
        setDone(true);
      } else {
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "x-owner-token": token } : {}),
          },
          body: JSON.stringify({ type: formKey, data: payload }),
        });
        if (!res.ok) throw new Error("submit failed");
        const json = (await res.json().catch(() => null)) as
          | { ownerToken?: string }
          | null;
        if (json?.ownerToken) setOwnerToken(json.ownerToken);
        setDone(true);
      }
    } catch {
      setError(editing ? "保存失败，请稍后再试" : "提交失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;
  return createPortal(
    <div
      onClick={(e) => e.stopPropagation()}
      className={`fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out ${
        editing ? "p-0 sm:p-4" : "p-4"
      } ${closing ? "opacity-0" : "opacity-100"}`}
    >
      <div
        className={`bg-white shadow-xl flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          editing
            ? "w-screen h-[100dvh] max-w-none rounded-none sm:w-full sm:h-auto sm:max-w-lg sm:max-h-[92dvh] sm:rounded-2xl"
            : "w-full max-w-[22rem] md:max-w-sm rounded-2xl max-h-[85dvh]"
        } ${closing ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-gray-800 truncate">
              {editing ? `编辑：${def.title}` : def.title}
            </h3>
            {formKey === "merchant" && !editing && (
              <span
                className="relative inline-flex items-center justify-center px-2 h-5 text-[10px] font-black text-white tracking-wider whitespace-nowrap shrink-0 -rotate-[4deg]"
                style={{ filter: "drop-shadow(0 1px 2px rgba(244,63,94,0.35))" }}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600"
                  style={{
                    clipPath:
                      "polygon(50% 0%, 63.4% 17.7%, 85.4% 14.6%, 82.3% 36.6%, 100% 50%, 82.3% 63.4%, 85.4% 85.4%, 63.4% 82.3%, 50% 100%, 36.6% 82.3%, 14.6% 85.4%, 17.7% 63.4%, 0% 50%, 17.7% 36.6%, 14.6% 14.6%, 36.6% 17.7%)",
                  }}
                />
                <span className="relative">免费入驻</span>
              </span>
            )}
          </div>
          {formKey === "purchase" && !editing && !done && (
            <Link
              href="/requests"
              onClick={handleClose}
              className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600 hover:text-amber-700 active:scale-95 transition"
            >
              直通需求大厅 <ArrowRight size={11} />
            </Link>
          )}
          <button
            onClick={handleClose}
            className="w-7 h-7 -mr-1 rounded-full hover:bg-gray-100 flex items-center justify-center active:scale-95 transition"
            aria-label="关闭"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center flex-1">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 mb-3">
              <CheckCircle2 size={26} className="text-red-400" />
            </div>
            <p className="text-base font-semibold text-gray-800 mb-1">
              {editing ? "修改已保存" : "提交成功"}
            </p>
            <p className="inline-block px-2.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-xs font-medium">
              ⏳ 审核中
            </p>
            <p className="text-[11px] text-gray-400 mt-3">
              {editing
                ? "修改后需要重新审核，通过后会再次展示"
                : "审核通过后会展示在对应分类页面"}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              {!editing && (
                <Link
                  href="/my"
                  onClick={handleClose}
                  className="inline-flex items-center gap-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-full active:scale-95 transition"
                >
                  查看我的发布
                </Link>
              )}
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-full active:scale-95 transition"
              >
                完成
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto px-4 py-3 space-y-3 flex-1">
              {activeFields.map((f, idx) => {
                if (!isActive(f)) return null;

                if (f.type === "subcategory") {
                  const cat = categories.find((c) => c.label === values.category);
                  if (!cat || cat.sub.length === 0) return null;
                  return (
                    <SubcategoryPicker
                      key={`${f.name}-${idx}`}
                      field={f}
                      options={cat.sub}
                      value={values[f.name] ?? ""}
                      onChange={(v) => update(f.name, v)}
                    />
                  );
                }

                return (
                  <FormFieldInput
                    key={`${f.name}-${idx}`}
                    field={f}
                    values={values}
                    onChange={(name, v) => update(name, v)}
                  />
                );
              })}

              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg">
                  {error}
                </p>
              )}
            </div>
            <div
              className="px-4 pt-2.5 border-t border-gray-100 shrink-0 bg-white"
              style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom, 0px))" }}
            >
              <button
                onClick={submit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-black text-white text-[13px] font-semibold rounded-full transition-all disabled:opacity-60 active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {editing ? "保存中…" : "提交中…"}
                  </>
                ) : editing ? (
                  "保存修改"
                ) : (
                  "提交申请"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

function SubcategoryPicker({
  field,
  options,
  value,
  onChange,
}: {
  field: FormField;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const selected = new Set(
    value.split("、").map((s) => s.trim()).filter(Boolean)
  );
  const toggle = (opt: string) => {
    if (selected.has(opt)) selected.delete(opt);
    else selected.add(opt);
    const ordered = options.filter((o) => selected.has(o));
    onChange(ordered.join("、"));
  };
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex flex-wrap gap-1.5 rounded-lg p-1.5">
        {options.map((opt) => {
          const on = selected.has(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                on
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FieldLabel({ field }: { field: FormField }) {
  return (
    <label className="block text-[12px] font-medium text-gray-600 mb-1">
      {field.label}
      {field.required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FormFieldInput({
  field,
  values,
  onChange,
}: {
  field: FormField;
  values: Record<string, string>;
  onChange: (name: string, v: string) => void;
}) {
  const baseInput =
    "w-full px-2.5 py-2 border rounded-lg text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-500";
  const filled = (v: string) => !!v?.trim();

  if (field.type === "range-usd" || field.type === "range-count") {
    const lo = values[`${field.name}_min`] ?? "";
    const hi = values[`${field.name}_max`] ?? "";
    const cls = `${baseInput} bg-gray-50 border-gray-200`;
    const loPh = field.type === "range-count" ? "最少" : "最低";
    const hiPh = field.type === "range-count" ? "最多" : "最高";
    const suffix = field.type === "range-count" ? "人" : null;
    return (
      <div>
        <FieldLabel field={field} />
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              inputMode="numeric"
              placeholder={loPh}
              value={lo}
              onChange={(e) => onChange(`${field.name}_min`, e.target.value)}
              className={`${cls}${suffix ? " pr-6" : ""}`}
            />
            {suffix && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                {suffix}
              </span>
            )}
          </div>
          <span className="text-gray-400 text-xs">—</span>
          <div className="flex-1 relative">
            <input
              type="number"
              inputMode="numeric"
              placeholder={hiPh}
              value={hi}
              onChange={(e) => onChange(`${field.name}_max`, e.target.value)}
              className={`${cls}${suffix ? " pr-6" : ""}`}
            />
            {suffix && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                {suffix}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (field.type === "availability") {
    const v = values[field.name] ?? "";
    return (
      <div>
        <FieldLabel field={field} />
        <AvailabilityPicker value={v} onChange={(next) => onChange(field.name, next)} />
        {field.helpText && (
          <p className="mt-1 text-[10.5px] leading-snug text-gray-500">{field.helpText}</p>
        )}
      </div>
    );
  }

  if (field.type === "location-picker") {
    const latStr = values[`${field.name}_lat`];
    const lngStr = values[`${field.name}_lng`];
    const lat = latStr ? Number(latStr) : undefined;
    const lng = lngStr ? Number(lngStr) : undefined;
    return (
      <div>
        <FieldLabel field={field} />
        <LocationPicker
          value={{
            lat: Number.isFinite(lat) ? lat : undefined,
            lng: Number.isFinite(lng) ? lng : undefined,
          }}
          onChange={(la, lo) => {
            onChange(`${field.name}_lat`, String(la));
            onChange(`${field.name}_lng`, String(lo));
          }}
        />
        {field.helpText && (
          <p className="mt-1 text-[11px] text-gray-500 leading-snug">{field.helpText}</p>
        )}
      </div>
    );
  }

  if (field.type === "contact-group") {
    const keys: { k: "phone" | "whatsapp" | "wechat" | "email"; label: string }[] = [
      { k: "phone", label: "电话" },
      { k: "whatsapp", label: "WhatsApp" },
      { k: "wechat", label: "微信号" },
      { k: "email", label: "邮箱" },
    ];
    return (
      <div>
        <FieldLabel field={field} />
        <div className="grid grid-cols-2 gap-2">
          {keys.map(({ k, label }) => {
            const v = values[`${field.name}_${k}`] ?? "";
            const cls = `${baseInput} bg-gray-50 border-gray-200`;
            return (
              <input
                key={k}
                type={k === "email" ? "email" : "text"}
                placeholder={label}
                value={v}
                onChange={(e) => onChange(`${field.name}_${k}`, e.target.value)}
                className={cls}
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "image") {
    const v = values[field.name] ?? "";
    return (
      <div>
        <FieldLabel field={field} />
        <SingleImageUploader
          value={v}
          onChange={(url) => onChange(field.name, url)}
          scope="merchant-cover"
          placeholder="点击上传商家首图"
        />
        {field.helpText && (
          <p className="mt-1 text-[10.5px] leading-snug text-gray-500">{field.helpText}</p>
        )}
      </div>
    );
  }

  if (field.type === "gallery") {
    const v = values[field.name] ?? "";
    const urls = v.split(/\r?\n/).map((s) => s.trim()).filter((s) => /^https?:\/\/|^\//.test(s));
    return (
      <div>
        <FieldLabel field={field} />
        <MultiImageUploader
          values={urls}
          onChange={(next) => onChange(field.name, next.join("\n"))}
          scope="merchant-gallery"
          max={12}
          note={field.helpText}
        />
      </div>
    );
  }

  if (field.type === "radio") {
    const v = values[field.name] ?? "";
    return (
      <div>
        <FieldLabel field={field} />
        <div className="flex flex-wrap gap-1.5 rounded-lg p-1.5">
          {field.options?.map((opt) => {
            const on = v === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(field.name, opt)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                  on
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const v = values[field.name] ?? "";
  const cls = `${baseInput} bg-gray-50 border-gray-200`;

  return (
    <div>
      <FieldLabel field={field} />
      {field.type === "textarea" ? (
        <textarea
          value={v}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          rows={2}
          className={cls}
        />
      ) : field.type === "select" ? (
        <select
          value={v}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={cls}
        >
          <option value="">请选择</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.type === "date" ? (
        <input
          type="date"
          value={v}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={cls}
        />
      ) : (
        <input
          type="text"
          value={v}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          className={cls}
        />
      )}
      {field.helpText && (
        <p className="mt-1 text-[10.5px] leading-snug text-gray-500">{field.helpText}</p>
      )}
    </div>
  );
}
