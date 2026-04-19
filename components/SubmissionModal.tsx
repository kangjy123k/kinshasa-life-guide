"use client";

import { useState } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { categories, KINSHASA_COMMUNES } from "@/lib/businesses";

type FieldType = "text" | "textarea" | "select" | "subcategory";
interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

export type FormKey = "merchant" | "hiring" | "jobseeker" | "secondhand" | "luggage";

export const FORMS: Record<FormKey, { title: string; fields: FormField[] }> = {
  merchant: {
    title: "商家入驻申请",
    fields: [
      { name: "name",          label: "商家名称",         type: "text", required: true },
      { name: "contactPerson", label: "联系人",           type: "text", required: true },
      { name: "wechat",        label: "微信号",           type: "text" },
      { name: "phone",         label: "电话 / WhatsApp",  type: "text", required: true },
      { name: "category",      label: "所属分类",         type: "select", required: true,
        options: categories.map((c) => c.label) },
      { name: "subcategory",   label: "子分类（可多选）",  type: "subcategory", required: true },
      { name: "area",          label: "所在区域（金沙萨）", type: "select", required: true,
        options: KINSHASA_COMMUNES },
      { name: "hasStore",      label: "是否有门店",       type: "select", required: true, options: ["有", "无"] },
      { name: "mainService",   label: "主营产品或服务",   type: "textarea", required: true },
      { name: "serviceScope",  label: "服务范围",         type: "textarea" },
      { name: "intro",         label: "商家简介",         type: "textarea" },
    ],
  },
  hiring: {
    title: "招聘信息发布",
    fields: [
      { name: "company",      label: "公司名称",        type: "text", required: true },
      { name: "contactPerson",label: "联系人",          type: "text", required: true },
      { name: "phone",        label: "电话 / WhatsApp", type: "text", required: true },
      { name: "wechat",       label: "微信号",          type: "text" },
      { name: "area",         label: "工作地点",        type: "text", placeholder: "如：金沙萨、卢本巴希 …" },
      { name: "position",     label: "招聘岗位",        type: "text", required: true },
      { name: "salary",       label: "薪资范围",        type: "text", placeholder: "如：1500-2500 USD/月" },
      { name: "requirement",  label: "岗位要求",        type: "textarea", required: true,
        placeholder: "学历、经验、语言、技能 …" },
      { name: "description",  label: "岗位描述",        type: "textarea" },
    ],
  },
  jobseeker: {
    title: "求职信息发布",
    fields: [
      { name: "name",         label: "姓名",            type: "text", required: true },
      { name: "phone",        label: "电话 / WhatsApp", type: "text", required: true },
      { name: "wechat",       label: "微信号",          type: "text" },
      { name: "targetPosition",label: "目标岗位",       type: "text", required: true },
      { name: "expectArea",   label: "期望工作地",      type: "text" },
      { name: "expectSalary", label: "期望薪资",        type: "text" },
      { name: "experience",   label: "工作经验",        type: "textarea", required: true },
      { name: "skills",       label: "技能特长",        type: "textarea" },
      { name: "intro",        label: "个人简介",        type: "textarea" },
    ],
  },
  secondhand: {
    title: "二手物品发布",
    fields: [
      { name: "itemName",     label: "物品名称",        type: "text", required: true },
      { name: "category",     label: "类别",            type: "text", placeholder: "家电、家具、车辆、电子产品 …" },
      { name: "condition",    label: "新旧程度",        type: "select",
        options: ["全新", "9成新", "8成新", "7成新", "6成新及以下"] },
      { name: "price",        label: "售价（USD）",      type: "text", required: true },
      { name: "description",  label: "物品描述",        type: "textarea", required: true },
      { name: "area",         label: "所在区域",        type: "text" },
      { name: "contactPerson",label: "联系人",          type: "text", required: true },
      { name: "phone",        label: "电话 / WhatsApp", type: "text", required: true },
      { name: "wechat",       label: "微信号",          type: "text" },
    ],
  },
  luggage: {
    title: "✈️ 发布捎带 · 顺路变现",
    fields: [
      { name: "direction",      label: "方向",            type: "select", required: true,
        options: ["回国 🇨🇩 → 🇨🇳", "来刚 🇨🇳 → 🇨🇩"] },
      { name: "name",           label: "姓名",            type: "text", required: true },
      { name: "phone",          label: "电话 / WhatsApp", type: "text", required: true },
      { name: "wechat",         label: "微信号",          type: "text" },
      { name: "fromCity",       label: "出发城市",        type: "text", required: true, placeholder: "金沙萨 / 广州 / 上海 …" },
      { name: "toCity",         label: "抵达城市",        type: "text", required: true, placeholder: "广州 / 香港 / 金沙萨 …" },
      { name: "departureDate",  label: "出发日期",        type: "text", required: true, placeholder: "2026-05-01" },
      { name: "availableWeight",label: "可带重量 (kg)",   type: "text", required: true, placeholder: "例：10" },
      { name: "price",          label: "💰 报价 / 运费",  type: "text", placeholder: "例：5 USD/kg · 小件免费 · 面议" },
      { name: "goodsType",      label: "可捎带物品类型",  type: "textarea", placeholder: "文件、药品、零食、化妆品、小电子产品 …" },
      { name: "restrictions",   label: "不可带物品",      type: "textarea", placeholder: "液体、刀具、仿牌、违禁品 …" },
      { name: "remark",         label: "补充说明",        type: "textarea", placeholder: "联系时段、交接方式、落地后回程等" },
    ],
  },
};

export function SubmissionModal({ formKey, onClose }: { formKey: FormKey; onClose: () => void }) {
  const def = FORMS[formKey];
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (name: string, v: string) =>
    setValues((prev) => {
      const next = { ...prev, [name]: v };
      // 切换分类时清掉子分类，避免残留旧分类下的选项
      if (name === "category" && prev.category !== v) next.subcategory = "";
      return next;
    });

  const submit = async () => {
    for (const f of def.fields) {
      if (f.type === "subcategory") {
        // 子分类仅当分类有 sub 列表时才必填
        const cat = categories.find((c) => c.label === values.category);
        if (f.required && cat && cat.sub.length > 0 && !values[f.name]?.trim()) {
          setError(`请选择「${f.label}」`);
          return;
        }
        continue;
      }
      if (f.required && !values[f.name]?.trim()) {
        setError(`请填写「${f.label}」`);
        return;
      }
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: formKey, data: values }),
      });
      if (!res.ok) throw new Error("submit failed");
      setDone(true);
    } catch {
      setError("提交失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
      <div className="w-full max-w-[22rem] md:max-w-sm bg-white rounded-2xl shadow-xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h3 className="text-[15px] font-semibold text-gray-800">{def.title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 -mr-1 rounded-full hover:bg-gray-100 flex items-center justify-center"
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
            <p className="text-[11px] text-gray-400 mt-3">审核通过后会展示在对应分类页面</p>
            <button
              onClick={onClose}
              className="mt-5 px-5 py-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-full"
            >
              完成
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto px-4 py-3 space-y-3 flex-1">
              {def.fields.map((f) => {
                if (f.type === "subcategory") {
                  const cat = categories.find((c) => c.label === values.category);
                  if (!cat || cat.sub.length === 0) return null;
                  return (
                    <SubcategoryPicker
                      key={f.name}
                      field={f}
                      options={cat.sub}
                      value={values[f.name] ?? ""}
                      onChange={(v) => update(f.name, v)}
                    />
                  );
                }
                return (
                  <FormFieldInput
                    key={f.name}
                    field={f}
                    value={values[f.name] ?? ""}
                    onChange={(v) => update(f.name, v)}
                  />
                );
              })}
              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg">{error}</p>
              )}
            </div>
            <div className="px-4 py-2.5 border-t border-gray-100 shrink-0">
              <button
                onClick={submit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-black text-white text-[13px] font-semibold rounded-full transition-all disabled:opacity-60"
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
      <label className="block text-[12px] font-medium text-gray-600 mb-1">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="flex flex-wrap gap-1.5">
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
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
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

function FormFieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const base =
    "w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white";

  return (
    <div>
      <label className="block text-[12px] font-medium text-gray-600 mb-1">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={2}
          className={base}
        />
      ) : field.type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          <option value="">请选择</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={base}
        />
      )}
    </div>
  );
}
