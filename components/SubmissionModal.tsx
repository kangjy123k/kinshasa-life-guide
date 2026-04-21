"use client";

import { useState } from "react";
import Link from "next/link";
import { X, CheckCircle2, Loader2, ArrowRight, ExternalLink } from "lucide-react";
import { categories, KINSHASA_COMMUNES } from "@/lib/businesses";
import { getOwnerToken, setOwnerToken } from "@/lib/owner-token-client";

type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "subcategory"
  | "date"
  | "range-usd"
  | "radio"
  | "contact-group";

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
  | "hiring"
  | "jobseeker"
  | "secondhand"
  | "luggage"
  | "purchase";

const WORK_CITIES = [
  "金沙萨 (Kinshasa)",
  "卢本巴希 (Lubumbashi)",
  "马塔迪 (Matadi)",
  "科卢韦齐 (Kolwezi)",
  "刚果金其他地区",
];

const JOBSEEKER_CITIES = [
  "金沙萨 (Kinshasa)",
  "卢本巴希 (Lubumbashi)",
  "马塔迪 (Matadi)",
  "科卢韦齐 (Kolwezi)",
  "刚果金所有地区不限",
];

const LUGGAGE_CITIES_FROM_DRC = ["金沙萨", "卢本巴希", "科卢韦齐", "马塔迪", "戈马"];
const LUGGAGE_CITIES_FROM_CN = ["北京", "上海", "广州", "深圳", "香港", "成都"];

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
    ],
  },
  hiring: {
    title: "招聘信息发布",
    fields: [
      { name: "industry", label: "公司行业", type: "text", required: true },
      {
        name: "companyPublic",
        label: "公司名称是否展示",
        type: "radio",
        required: true,
        options: ["展示", "暂时保密"],
      },
      { name: "companyZh", label: "公司中文名称", type: "text", required: true },
      { name: "companyIntl", label: "公司外文名称", type: "text" },
      {
        name: "registrationCountry",
        label: "公司主体注册国家",
        type: "select",
        required: true,
        options: ["中国", "刚果金", "其他"],
      },
      { name: "position", label: "招聘职位", type: "text", required: true },
      {
        name: "workCity",
        label: "主要工作地点",
        type: "select",
        required: true,
        options: WORK_CITIES,
      },
      { name: "jobContent", label: "主要工作内容", type: "textarea", required: true },
      { name: "requirement", label: "任职条件", type: "textarea", required: true },
      { name: "salary", label: "年薪区间", type: "range-usd", required: true },
      { name: "benefits", label: "其他福利", type: "textarea" },
      { name: "recruiterName", label: "招聘负责人称呼", type: "text", required: true },
      {
        name: "recruiterContact",
        label: "招聘负责人微信号或邮箱",
        type: "text",
        required: true,
      },
      {
        name: "deadline",
        label: "招聘截止日期",
        type: "date",
        required: true,
        helpText: "最多展示 1 个月，如需急招或长期招聘，请联系小程序运营",
      },
    ],
  },
  jobseeker: {
    title: "求职信息发布",
    fields: [
      { name: "name", label: "求职者称呼", type: "text", required: true },
      {
        name: "gender",
        label: "性别",
        type: "radio",
        required: true,
        options: ["男", "女"],
      },
      { name: "age", label: "年龄", type: "text", required: true },
      { name: "contact", label: "联系方式", type: "contact-group", required: true },
      { name: "targetPosition", label: "目标岗位", type: "text", required: true },
      { name: "experienceYears", label: "相关工作年限", type: "text", required: true },
      {
        name: "expectCity",
        label: "期望工作地",
        type: "select",
        required: true,
        options: JOBSEEKER_CITIES,
      },
      { name: "expectSalary", label: "期望年薪", type: "range-usd", required: true },
      { name: "skills", label: "技能描述", type: "textarea", required: true },
      { name: "achievements", label: "过往工作成就", type: "textarea" },
      { name: "unacceptable", label: "不可接受的条件", type: "textarea" },
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
      { name: "address", label: "物品所在地址", type: "text", required: true },
      { name: "contactPerson", label: "联系人称呼", type: "text", required: true },
      { name: "contact", label: "联系方式", type: "contact-group", required: true },
    ],
  },
  luggage: {
    title: "顺风捎带 · 发布信息",
    fields: [
      {
        name: "direction",
        label: "方向",
        type: "radio",
        required: true,
        options: ["刚果金 → 中国", "中国 → 刚果金"],
      },
      { name: "name", label: "带货人称呼", type: "text", required: true },
      { name: "contact", label: "联系方式", type: "contact-group", required: true },
      {
        name: "fromCity",
        label: "出发城市",
        type: "select",
        required: true,
        options: LUGGAGE_CITIES_FROM_DRC,
        conditional: { field: "direction", equals: "刚果金 → 中国" },
      },
      {
        name: "fromCity",
        label: "出发城市",
        type: "select",
        required: true,
        options: LUGGAGE_CITIES_FROM_CN,
        conditional: { field: "direction", equals: "中国 → 刚果金" },
      },
      { name: "departureDate", label: "出发时间", type: "date", required: true },
      { name: "capacity", label: "可捎带重量/空间", type: "text", required: true },
      {
        name: "_reminder",
        label: "小程序温馨提醒",
        type: "textarea",
        helpText:
          "请务必当面确认物品合法合规，不捎带任何禁运/违禁/受管制物品；交接请保留凭证；本小程序仅提供信息对接，不参与任何运输纠纷与赔付。",
      },
    ],
  },
};

const BOARD_URL: Record<FormKey, string> = {
  purchase: "/requests",
  merchant: "/",
  hiring: "/hiring",
  jobseeker: "/jobs",
  secondhand: "/secondhand",
  luggage: "/luggage",
};

export function SubmissionModal({
  formKey,
  onClose,
}: {
  formKey: FormKey;
  onClose: () => void;
}) {
  const def = FORMS[formKey];
  const boardHref = BOARD_URL[formKey];
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
      if (name === "direction" && prev.direction !== v) next.fromCity = "";
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

      if (f.type === "range-usd") {
        const lo = values[`${f.name}_min`]?.trim();
        const hi = values[`${f.name}_max`]?.trim();
        if (!lo || !hi) {
          setError(`请填写「${f.label}」最低和最高值`);
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
        if (f.type === "range-usd") {
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
          <Link
            href={boardHref}
            onClick={handleClose}
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-sky-600 hover:text-sky-700 px-2 py-1 rounded-full bg-sky-50 active:scale-95 transition"
          >
            看看已发布
            <ExternalLink size={10} />
          </Link>
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
                查看我发布的
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
  const missing = field.required && selected.size === 0;
  return (
    <div>
      <FieldLabel field={field} />
      <div
        className={`flex flex-wrap gap-1.5 rounded-lg p-1.5 ${
          missing ? "bg-red-50 ring-1 ring-red-200" : ""
        }`}
      >
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

  if (field.type === "range-usd") {
    const lo = values[`${field.name}_min`] ?? "";
    const hi = values[`${field.name}_max`] ?? "";
    const loOk = filled(lo);
    const hiOk = filled(hi);
    const loCls = `${baseInput} ${
      field.required && !loOk
        ? "bg-red-50 border-red-200"
        : "bg-gray-50 border-gray-200"
    }`;
    const hiCls = `${baseInput} ${
      field.required && !hiOk
        ? "bg-red-50 border-red-200"
        : "bg-gray-50 border-gray-200"
    }`;
    return (
      <div>
        <FieldLabel field={field} />
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="最低"
            value={lo}
            onChange={(e) => onChange(`${field.name}_min`, e.target.value)}
            className={loCls}
          />
          <span className="text-gray-400 text-xs">—</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="最高"
            value={hi}
            onChange={(e) => onChange(`${field.name}_max`, e.target.value)}
            className={hiCls}
          />
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
    const anyFilled = keys.some((x) => filled(values[`${field.name}_${x.k}`] ?? ""));
    return (
      <div>
        <FieldLabel field={field} />
        <div className="grid grid-cols-2 gap-2">
          {keys.map(({ k, label }) => {
            const v = values[`${field.name}_${k}`] ?? "";
            const needHighlight = field.required && !anyFilled;
            const cls = `${baseInput} ${
              needHighlight
                ? "bg-red-50 border-red-200"
                : "bg-gray-50 border-gray-200"
            }`;
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

  if (field.type === "radio") {
    const v = values[field.name] ?? "";
    const missing = field.required && !v;
    return (
      <div>
        <FieldLabel field={field} />
        <div
          className={`flex flex-wrap gap-1.5 rounded-lg p-1.5 ${
            missing ? "bg-red-50 ring-1 ring-red-200" : ""
          }`}
        >
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
  const needRed = field.required && !filled(v);
  const cls = `${baseInput} ${
    needRed ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
  }`;

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
