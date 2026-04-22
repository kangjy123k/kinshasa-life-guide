"use client";

import { useState } from "react";
import Link from "next/link";
import { X, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { categories, KINSHASA_COMMUNES } from "@/lib/businesses";
import { getOwnerToken, setOwnerToken } from "@/lib/owner-token-client";
import { SingleImageUploader, MultiImageUploader } from "@/components/ImageUploader";

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
  | "gallery";

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

export const FORMS: Record<FormKey, { title: string; fields: FormField[] }> = {
  purchase: {
    title: "求购信息发布",
    fields: [
      { name: "itemName", label: "求购物品名称", type: "text", required: true },
      { name: "quantity", label: "数量", type: "text", required: true },
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
    fields: [
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
      {
        name: "area",
        label: "所在区域（金沙萨）",
        type: "select",
        required: true,
        options: KINSHASA_COMMUNES,
      },
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
    ],
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

export function SubmissionModal({
  formKey,
  onClose,
}: {
  formKey: FormKey;
  onClose: () => void;
}) {
  const def = FORMS[formKey];
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    def.fields.forEach((f) => {
      if (f.type === "date") seed[f.name] = todayISO();
    });
    return seed;
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing((c) => {
      if (c) return c;
      setTimeout(onClose, 260);
      return true;
    });
  };

  const update = (name: string, v: string) =>
    setValues((prev) => {
      const next = { ...prev, [name]: v };
      if (name === "category" && prev.category !== v) next.subcategory = "";
      if (name === "hasStore" && prev.hasStore !== v && v !== "有") {
        next.storeAddress = "";
      }
      return next;
    });

  const isActive = (f: FormField) => {
    if (!f.conditional) return true;
    return values[f.conditional.field] === f.conditional.equals;
  };

  const submit = async () => {
    for (const f of def.fields) {
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

      if (!values[f.name]?.trim()) {
        setError(`请填写「${f.label}」`);
        return;
      }
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {};
      for (const f of def.fields) {
        if (!isActive(f)) continue;
        if (f.name.startsWith("_")) continue;
        if (f.type === "range-usd" || f.type === "range-count") {
          payload[`${f.name}Min`] = values[`${f.name}_min`] ?? "";
          payload[`${f.name}Max`] = values[`${f.name}_max`] ?? "";
        } else if (f.type === "contact-group") {
          (["phone", "whatsapp", "wechat", "email"] as const).forEach((k) => {
            payload[`${f.name}_${k}`] = values[`${f.name}_${k}`] ?? "";
          });
        } else {
          payload[f.name] = values[f.name] ?? "";
        }
      }
      const token = getOwnerToken();
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
    } catch {
      setError("提交失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity duration-300 ease-out ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        className={`w-full max-w-[22rem] md:max-w-sm bg-white rounded-2xl shadow-xl max-h-[85vh] flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          closing ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
          <h3 className="text-[15px] font-semibold text-gray-800 flex-1 min-w-0 truncate">
            {def.title}
          </h3>
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
            <p className="text-base font-semibold text-gray-800 mb-1">提交成功</p>
            <p className="inline-block px-2.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-xs font-medium">
              ⏳ 审核中
            </p>
            <p className="text-[11px] text-gray-400 mt-3">
              审核通过后会展示在对应分类页面
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Link
                href="/my"
                onClick={handleClose}
                className="inline-flex items-center gap-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-full active:scale-95 transition"
              >
                查看我的发布
              </Link>
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
              {formKey === "purchase" && (
                <Link
                  href="/requests"
                  onClick={handleClose}
                  className="flex items-center justify-center gap-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white text-sm font-bold shadow-md active:scale-95 transition"
                >
                  直通需求大厅
                  <ArrowRight size={14} />
                </Link>
              )}

              {def.fields.map((f, idx) => {
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
            <div className="px-4 py-2.5 border-t border-gray-100 shrink-0">
              <button
                onClick={submit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-black text-white text-[13px] font-semibold rounded-full transition-all disabled:opacity-60 active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> 提交中…
                  </>
                ) : (
                  "提交申请"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
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
