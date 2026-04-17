"use client";

import { useEffect, useState } from "react";
import { Cloud, Droplets, Wind, CloudRain } from "lucide-react";

interface WeatherHour {
  time: string;
  temp: number;
  precip: number;
  code: number;
  wind: number;
  humidity: number;
}

interface Minutely15 {
  time: string;
  precipProbability: number;
  precipMm: number;
}

interface RainAlert {
  rainSoon: boolean;
  minutesToRain: number | null;
  peakProbability: number;
  source: "open-meteo" | "tomorrow.io" | "none";
}

interface WeatherResp {
  city: string;
  tz: string;
  current: {
    time?: string;
    temperature_2m?: number;
    weather_code?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
  } | null;
  hours: WeatherHour[];
  minutely15: Minutely15[];
  alert: RainAlert;
}

function wmoLabel(code: number): { emoji: string; zh: string } {
  if (code === 0) return { emoji: "☀️", zh: "晴" };
  if (code <= 2) return { emoji: "🌤️", zh: "多云转晴" };
  if (code === 3) return { emoji: "☁️", zh: "阴" };
  if (code === 45 || code === 48) return { emoji: "🌫️", zh: "雾" };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", zh: "毛毛雨" };
  if (code >= 61 && code <= 65) return { emoji: "🌧️", zh: "雨" };
  if (code >= 66 && code <= 67) return { emoji: "🌧️", zh: "冻雨" };
  if (code >= 71 && code <= 77) return { emoji: "🌨️", zh: "雪" };
  if (code >= 80 && code <= 82) return { emoji: "🌦️", zh: "阵雨" };
  if (code >= 95 && code <= 99) return { emoji: "⛈️", zh: "雷阵雨" };
  return { emoji: "☁️", zh: "多云" };
}

function formatHour(iso: string): string {
  return iso.slice(11, 16);
}

function RainAlertBanner({ alert }: { alert: RainAlert }) {
  if (!alert.rainSoon || alert.minutesToRain == null) return null;
  const mins = alert.minutesToRain;
  const label = mins === 0 ? "现在可能有雨" : `约 ${mins} 分钟后可能有雨`;
  const sourceTag =
    alert.source === "tomorrow.io" ? "雷达预报" : "模式预报";
  return (
    <div className="flex items-start gap-2 mb-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
      <CloudRain size={18} className="shrink-0 mt-0.5 text-orange-500" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-orange-700">⚠️ {label}</div>
        <div className="text-[11px] text-orange-600/80 mt-0.5">
          未来 2 小时峰值概率 {alert.peakProbability}% · {sourceTag}
        </div>
      </div>
    </div>
  );
}

export default function WeatherStrip() {
  const [data, setData] = useState<WeatherResp | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/weather")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http"))))
      .then((j: WeatherResp) => {
        if (!cancelled) setData(j);
      })
      .catch(() => {
        if (!cancelled) setErr(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) return null;

  if (!data) {
    return (
      <section className="max-w-4xl mx-auto px-4 mt-6">
        <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 p-4 min-h-[128px] animate-pulse">
          <div className="h-4 w-24 bg-sky-100 rounded" />
          <div className="mt-3 flex gap-2 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-14 h-20 bg-white/70 rounded-xl shrink-0"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const current = data.current;
  const currentLabel =
    current?.weather_code != null ? wmoLabel(current.weather_code) : null;

  const nowIso = current?.time ?? "";
  const nowHour = nowIso.slice(0, 13);
  const startIdx = Math.max(
    0,
    data.hours.findIndex((h) => h.time.slice(0, 13) > nowHour)
  );
  const displayHours = data.hours.slice(startIdx, startIdx + 24);

  return (
    <section className="max-w-4xl mx-auto px-4 mt-6">
      <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 p-4 shadow-sm">
        <RainAlertBanner alert={data.alert} />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-5 bg-sky-400 rounded-full" />
            <h2 className="text-base font-bold text-gray-800">金沙萨天气</h2>
          </div>
          <span className="text-xs text-gray-400">未来 24 小时</span>
          {currentLabel && current?.temperature_2m != null && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-2xl leading-none">{currentLabel.emoji}</span>
              <div className="leading-tight">
                <div className="text-xl font-bold text-sky-700">
                  {Math.round(current.temperature_2m)}°
                </div>
                <div className="text-[10px] text-gray-500 -mt-0.5">
                  {currentLabel.zh}
                </div>
              </div>
            </div>
          )}
        </div>

        {current && (
          <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500">
            {current.relative_humidity_2m != null && (
              <span className="flex items-center gap-1">
                <Droplets size={11} className="text-sky-500" />
                湿度 {Math.round(current.relative_humidity_2m)}%
              </span>
            )}
            {current.wind_speed_10m != null && (
              <span className="flex items-center gap-1">
                <Wind size={11} className="text-sky-500" />
                风 {Math.round(current.wind_speed_10m)} km/h
              </span>
            )}
            <span className="flex items-center gap-1">
              <Cloud size={11} className="text-sky-500" />
              {data.alert.source === "tomorrow.io"
                ? "Open-Meteo + Tomorrow.io"
                : "Open-Meteo"}
            </span>
          </div>
        )}

        <div className="mt-3 -mx-1 overflow-x-auto scrollbar-none">
          <div className="flex gap-1.5 px-1 pb-1">
            {displayHours.map((h) => {
              const label = wmoLabel(h.code);
              const rainy = h.precip >= 30;
              return (
                <div
                  key={h.time}
                  className={`shrink-0 w-14 rounded-xl px-1.5 py-2 text-center ${
                    rainy
                      ? "bg-sky-100 border border-sky-200"
                      : "bg-white border border-sky-50"
                  }`}
                >
                  <div className="text-[10px] text-gray-500 font-medium">
                    {formatHour(h.time)}
                  </div>
                  <div className="text-lg leading-tight mt-0.5">
                    {label.emoji}
                  </div>
                  <div className="text-xs font-bold text-gray-800 mt-0.5">
                    {Math.round(h.temp)}°
                  </div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      rainy ? "text-sky-600 font-medium" : "text-gray-400"
                    }`}
                  >
                    {h.precip}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
