"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Eye,
  Users,
  Clock,
  Calendar,
  RefreshCw,
  TrendingUp,
  Smartphone,
  Monitor,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import {
  APP_TZ,
  tzDateString,
  tzHour,
  tzRecentDates,
  tzFormatDateTime,
  tzFormatTime,
} from "@/lib/tz";

interface VisitRecord {
  timestamp: string;
  date: string;
  hour: number;
  ua: string;
  referer: string;
  ip: string;
}

interface AnalyticsData {
  totalVisits: number;
  visits: VisitRecord[];
}

/* ------------------------------------------------------------------ */
/*  工具函数                                                            */
/* ------------------------------------------------------------------ */
function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    (map[key] ??= []).push(item);
  }
  return map;
}

function getDeviceType(ua: string): "手机" | "电脑" | "其他" {
  if (/mobile|android|iphone|ipad/i.test(ua)) return "手机";
  if (/windows|macintosh|linux/i.test(ua) && !/mobile/i.test(ua)) return "电脑";
  return "其他";
}

function uniqueIPs(visits: VisitRecord[]): number {
  return new Set(visits.map((v) => v.ip)).size;
}

/* ------------------------------------------------------------------ */
/*  统计卡片                                                            */
/* ------------------------------------------------------------------ */
function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-3xl font-black text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  柱状图（纯 CSS）                                                    */
/* ------------------------------------------------------------------ */
function BarChartSimple({
  data,
  title,
}: {
  data: { label: string; value: number }[];
  title: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16 shrink-0 text-right">{d.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${Math.max((d.value / max) * 100, 2)}%` }}
              >
                {d.value > 0 && (
                  <span className="text-[10px] font-bold text-white">{d.value}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  访问明细表                                                          */
/* ------------------------------------------------------------------ */
function VisitTable({ visits }: { visits: VisitRecord[] }) {
  const recent = [...visits].reverse().slice(0, 50);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">最近访问记录（最新50条）</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">时间</th>
              <th className="px-4 py-2.5 text-left font-medium">IP</th>
              <th className="px-4 py-2.5 text-left font-medium">设备</th>
              <th className="px-4 py-2.5 text-left font-medium">来源</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recent.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  暂无访问记录
                </td>
              </tr>
            ) : (
              recent.map((v, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                    {tzFormatDateTime(v.timestamp)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{v.ip}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        getDeviceType(v.ua) === "手机"
                          ? "bg-blue-50 text-blue-600"
                          : getDeviceType(v.ua) === "电脑"
                          ? "bg-purple-50 text-purple-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {getDeviceType(v.ua) === "手机" ? <Smartphone size={12} /> : <Monitor size={12} />}
                      {getDeviceType(v.ua)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs max-w-[200px] truncate">
                    {v.referer || "直接访问"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  页面                                                               */
/* ------------------------------------------------------------------ */
export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch {
      setData({ totalVisits: 0, visits: [] });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={32} className="mx-auto text-emerald-500 animate-spin mb-3" />
          <p className="text-gray-500 text-sm">加载统计数据...</p>
        </div>
      </div>
    );
  }

  const visits = data?.visits ?? [];
  const totalVisits = data?.totalVisits ?? 0;

  // 全部统计基于卢本巴希时区（UTC+2），并且重新从 timestamp 计算，
  // 兼容历史用 UTC 写入的 date/hour 字段。
  const visitDate = (v: VisitRecord) => tzDateString(v.timestamp);
  const visitHour = (v: VisitRecord) => tzHour(v.timestamp);

  // 今日数据
  const todayStr = tzDateString(Date.now());
  const todayVisits = visits.filter((v) => visitDate(v) === todayStr);

  // 独立访客
  const totalUniqueIPs = uniqueIPs(visits);
  const todayUniqueIPs = uniqueIPs(todayVisits);

  // 按日统计（最近7天，卢本巴希时区）
  const last7Days = tzRecentDates(7).map(({ iso, label }) => ({
    label,
    value: visits.filter((v) => visitDate(v) === iso).length,
  }));

  // 按小时统计（今日，卢本巴希时区）
  const hourlyData: { label: string; value: number }[] = [];
  for (let h = 0; h < 24; h++) {
    hourlyData.push({
      label: `${h}:00`,
      value: todayVisits.filter((v) => visitHour(v) === h).length,
    });
  }
  // 只显示有数据的时段及前后
  const activeHours = hourlyData.filter((h) => h.value > 0);
  const displayHourly = activeHours.length > 0 ? hourlyData : hourlyData.slice(6, 23);

  // 设备分布
  const deviceGroups = groupBy(visits, (v) => getDeviceType(v.ua));
  const deviceData = (["手机", "电脑", "其他"] as const).map((d) => ({
    label: d,
    value: deviceGroups[d]?.length ?? 0,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶栏 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-emerald-500" />
              <h1 className="font-bold text-gray-900">访问统计</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-gray-400">
                更新于 {tzFormatTime(lastRefresh)}（卢本巴希时间）
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              刷新
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* 概览卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Eye size={20} className="text-emerald-600" />}
            label="总访问量"
            value={totalVisits}
            sub="累计页面浏览"
            color="bg-emerald-50"
          />
          <StatCard
            icon={<Users size={20} className="text-blue-600" />}
            label="独立访客"
            value={totalUniqueIPs}
            sub="按 IP 去重"
            color="bg-blue-50"
          />
          <StatCard
            icon={<TrendingUp size={20} className="text-orange-600" />}
            label="今日访问"
            value={todayVisits.length}
            sub={`${todayUniqueIPs} 独立访客`}
            color="bg-orange-50"
          />
          <StatCard
            icon={<Clock size={20} className="text-purple-600" />}
            label="记录天数"
            value={new Set(visits.map(visitDate)).size}
            sub="有访问数据的天数"
            color="bg-purple-50"
          />
        </div>

        {/* 图表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BarChartSimple data={last7Days} title="最近7天访问趋势（卢本巴希时间 UTC+2）" />
          <BarChartSimple data={deviceData} title="设备类型分布" />
        </div>

        {/* 今日时段分布 */}
        <BarChartSimple data={displayHourly} title="今日各时段访问量（卢本巴希时间 UTC+2）" />

        {/* 明细表 */}
        <VisitTable visits={visits} />
      </div>
    </div>
  );
}
