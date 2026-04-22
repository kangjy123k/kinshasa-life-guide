"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Gift,
  Loader2,
  Sparkles,
  Star,
} from "lucide-react";
import { getSurvey, type SurveyField } from "@/lib/surveys";
import { getOwnerToken, setOwnerToken } from "@/lib/owner-token-client";

export default function SurveyDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const survey = getSurvey(key);
  if (!survey) return notFound();

  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setValue = (name: string, v: string) =>
    setValues((prev) => ({ ...prev, [name]: v }));

  const toggleMulti = (name: string, opt: string) => {
    setValues((prev) => {
      const cur = new Set(
        (prev[name] ?? "")
          .split("、")
          .map((s) => s.trim())
          .filter(Boolean)
      );
      if (cur.has(opt)) cur.delete(opt);
      else cur.add(opt);
      const ordered = (survey.fields.find((f) => f.name === name)?.options ?? []).filter((o) =>
        cur.has(o)
      );
      return { ...prev, [name]: ordered.join("、") };
    });
  };

  const submit = async () => {
    // 校验
    for (const f of survey.fields) {
      if (!f.required) continue;
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
      const payload: Record<string, string> = { surveyKey: survey.key, surveyTitle: survey.title };
      for (const f of survey.fields) {
        if (f.type === "contact-group") {
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
        body: JSON.stringify({ type: "survey", data: payload }),
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

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-20">
        <main className="max-w-xl mx-auto px-5 pt-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">提交成功！</h1>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            感谢您的回答。抽奖开奖后，我们会通过您留下的联系方式通知您。
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Link
              href="/surveys"
              className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold active:scale-95 transition"
            >
              再看看其他调研
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold active:scale-95 transition"
            >
              回首页
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-24">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-amber-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/surveys"
            aria-label="返回"
            className="w-8 h-8 rounded-full hover:bg-amber-100 flex items-center justify-center text-gray-600 active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-bold text-gray-800 truncate">{survey.title}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4">
        <section
          className={`relative rounded-3xl overflow-hidden shadow-md bg-gradient-to-br ${survey.color} text-white px-5 py-5 mb-5`}
        >
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/15" />
          <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/10" />
          <p className="text-[11px] font-semibold text-white/80 uppercase tracking-wider relative">
            调研 · {survey.sponsor}
          </p>
          <h2 className="text-lg font-black leading-tight drop-shadow mt-1 relative">
            {survey.title}
          </h2>
          <p className="text-xs text-white/90 leading-snug mt-2 relative">
            {survey.summary}
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap relative">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/25 backdrop-blur text-[11px] font-semibold">
              <Gift size={11} /> {survey.reward}
            </span>
            {survey.deadline && (
              <span className="text-[11px] text-white/80">截止 {survey.deadline}</span>
            )}
          </div>
        </section>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          {survey.fields.map((f, idx) => (
            <FieldRow
              key={`${f.name}-${idx}`}
              field={f}
              index={idx}
              values={values}
              setValue={setValue}
              toggleMulti={toggleMulti}
            />
          ))}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white text-sm font-bold shadow-md active:scale-95 transition disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" /> 提交中…
              </>
            ) : (
              <>
                <Sparkles size={14} /> 提交并参与抽奖
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-gray-400 leading-relaxed">
            您的联系方式仅用于抽奖通知，不会被赞助方直接用于推销。
          </p>
        </form>
      </main>
    </div>
  );
}

function FieldRow({
  field,
  index,
  values,
  setValue,
  toggleMulti,
}: {
  field: SurveyField;
  index: number;
  values: Record<string, string>;
  setValue: (name: string, v: string) => void;
  toggleMulti: (name: string, v: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm px-4 py-3.5">
      <div className="flex items-start gap-2 mb-2">
        <span className="mt-0.5 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-snug">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </p>
          {field.helpText && (
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{field.helpText}</p>
          )}
        </div>
      </div>
      <div className="pl-8">
        <FieldInput field={field} values={values} setValue={setValue} toggleMulti={toggleMulti} />
      </div>
    </div>
  );
}

function FieldInput({
  field,
  values,
  setValue,
  toggleMulti,
}: {
  field: SurveyField;
  values: Record<string, string>;
  setValue: (name: string, v: string) => void;
  toggleMulti: (name: string, v: string) => void;
}) {
  const base =
    "w-full px-3 py-2 rounded-xl text-sm text-gray-800 placeholder-gray-400 bg-gray-50 border border-gray-200 focus:outline-none focus:border-amber-400 focus:bg-white";

  if (field.type === "radio") {
    const v = values[field.name] ?? "";
    return (
      <div className="flex flex-wrap gap-1.5">
        {field.options?.map((opt) => {
          const on = v === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setValue(field.name, opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                on
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-amber-50"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (field.type === "multi") {
    const selected = new Set(
      (values[field.name] ?? "")
        .split("、")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    return (
      <div className="flex flex-wrap gap-1.5">
        {field.options?.map((opt) => {
          const on = selected.has(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleMulti(field.name, opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                on
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-amber-50"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (field.type === "scale") {
    const max = field.scaleMax ?? 5;
    const v = Number(values[field.name] ?? 0);
    return (
      <div className="flex items-center gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
          const on = v >= n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setValue(field.name, String(n))}
              aria-label={`${n} 分`}
              className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition"
            >
              <Star
                size={26}
                className={on ? "text-amber-500" : "text-gray-300"}
                fill={on ? "currentColor" : "none"}
              />
            </button>
          );
        })}
        {v > 0 && (
          <span className="ml-2 text-xs font-semibold text-amber-600">{v} / {max}</span>
        )}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        rows={3}
        value={values[field.name] ?? ""}
        onChange={(e) => setValue(field.name, e.target.value)}
        placeholder={field.placeholder}
        className={base}
      />
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
      <div className="grid grid-cols-2 gap-2">
        {keys.map(({ k, label }) => (
          <input
            key={k}
            type={k === "email" ? "email" : "text"}
            placeholder={label}
            value={values[`${field.name}_${k}`] ?? ""}
            onChange={(e) => setValue(`${field.name}_${k}`, e.target.value)}
            className={base}
          />
        ))}
      </div>
    );
  }

  return (
    <input
      type="text"
      value={values[field.name] ?? ""}
      onChange={(e) => setValue(field.name, e.target.value)}
      placeholder={field.placeholder}
      className={base}
    />
  );
}
