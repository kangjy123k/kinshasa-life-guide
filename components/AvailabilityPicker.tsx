"use client";

import { useMemo } from "react";

const DAYS = 90;
const WEEK_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildCalendar(): { monthLabel: string; cells: (Date | null)[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + DAYS - 1);

  const months: { monthLabel: string; cells: (Date | null)[] }[] = [];
  const cursor = new Date(today.getFullYear(), today.getMonth(), 1);
  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = Array(firstDow).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(year, month, day));
    }
    months.push({
      monthLabel: `${year} 年 ${month + 1} 月`,
      cells,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export function AvailabilityPicker({
  value,
  onChange,
}: {
  /** 内部用 "\n" 分隔的 ISO date 字符串集 */
  value: string;
  onChange: (next: string) => void;
}) {
  const months = useMemo(() => buildCalendar(), []);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const horizon = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + DAYS - 1);
    return d;
  }, [today]);

  const selected = useMemo(
    () =>
      new Set(
        value
          .split(/[\r\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    [value],
  );

  const toggle = (d: Date) => {
    const key = ymd(d);
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    const sorted = Array.from(next).sort();
    onChange(sorted.join("\n"));
  };

  const isInRange = (d: Date) =>
    d.getTime() >= today.getTime() && d.getTime() <= horizon.getTime();

  const clearAll = () => onChange("");

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-2.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-amber-700 font-medium leading-snug">
          点选未来 90 天内有空档的日期 · 已选 {selected.size} 天
        </p>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[10.5px] text-gray-500 hover:text-red-500 underline-offset-2 hover:underline active:scale-95 transition"
          >
            清空
          </button>
        )}
      </div>

      <div className="space-y-3">
        {months.map((m) => (
          <div key={m.monthLabel}>
            <div className="text-[11px] font-semibold text-gray-700 mb-1.5 px-0.5">
              {m.monthLabel}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEK_LABELS.map((w, i) => (
                <div
                  key={`h-${i}`}
                  className="text-[10px] text-gray-400 pb-1"
                >
                  {w}
                </div>
              ))}
              {m.cells.map((cell, i) => {
                if (!cell)
                  return <div key={`e-${i}`} className="h-8" aria-hidden />;
                const inRange = isInRange(cell);
                const key = ymd(cell);
                const on = selected.has(key);
                const isToday = cell.getTime() === today.getTime();
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!inRange}
                    onClick={() => toggle(cell)}
                    className={`h-8 rounded-md text-[12px] font-medium transition ${
                      !inRange
                        ? "text-gray-300 cursor-not-allowed"
                        : on
                          ? "bg-orange-500 text-white shadow-sm"
                          : isToday
                            ? "bg-white border border-orange-300 text-orange-600 hover:bg-orange-100"
                            : "bg-white border border-gray-200 text-gray-700 hover:bg-orange-50 hover:border-orange-200"
                    }`}
                  >
                    {cell.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
