export const APP_TZ = "Africa/Lubumbashi"; // UTC+2，CAT 全年无夏令时

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hourFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TZ,
  hour: "2-digit",
  hour12: false,
});

/** YYYY-MM-DD in 卢本巴希时区 */
export function tzDateString(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  return dateFmt.format(d);
}

/** 0-23 in 卢本巴希时区 */
export function tzHour(input: Date | string | number): number {
  const d = input instanceof Date ? input : new Date(input);
  // en-GB hour with hour12:false 在 24:00 时会回成 "24"，需要兜底
  const h = parseInt(hourFmt.format(d), 10);
  return h === 24 ? 0 : h;
}

/** "M/D" 短日期标签（卢本巴希时区） */
export function tzShortMD(input: Date | string | number): string {
  const ymd = tzDateString(input).split("-"); // ["YYYY","MM","DD"]
  return `${parseInt(ymd[1], 10)}/${parseInt(ymd[2], 10)}`;
}

/** 卢本巴希时区下"今天往前 n 天"对应的 YYYY-MM-DD 数组（最早→最新） */
export function tzRecentDates(days: number): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = now - i * 86_400_000;
    out.push({ iso: tzDateString(d), label: tzShortMD(d) });
  }
  return out;
}

/** 用卢本巴希时区格式化为完整本地时间字符串（中文） */
export function tzFormatDateTime(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  return d.toLocaleString("zh-CN", { timeZone: APP_TZ });
}

/** 仅时分秒，用于"更新于 hh:mm:ss" */
export function tzFormatTime(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  return d.toLocaleTimeString("zh-CN", { timeZone: APP_TZ });
}
