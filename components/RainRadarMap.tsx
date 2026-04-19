"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Play, Pause, CloudRain } from "lucide-react";

const DRC_CITIES = [
  { name: "金沙萨",     lat: -4.3276, lng: 15.3136 },
  { name: "马塔迪",     lat: -5.8168, lng: 13.4610 },
  { name: "博马",       lat: -5.8539, lng: 13.0550 },
  { name: "姆班达卡",   lat:  0.0487, lng: 18.2625 },
  { name: "格梅纳",     lat:  3.2537, lng: 19.7717 },
  { name: "基桑加尼",   lat:  0.5156, lng: 25.2214 },
  { name: "布尼亚",     lat:  1.5648, lng: 30.2422 },
  { name: "贝尼",       lat:  0.4914, lng: 29.4692 },
  { name: "戈马",       lat: -1.6792, lng: 29.2228 },
  { name: "布卡武",     lat: -2.5083, lng: 28.8608 },
  { name: "乌维拉",     lat: -3.4075, lng: 29.1375 },
  { name: "金杜",       lat: -2.9486, lng: 25.9125 },
  { name: "卡南加",     lat: -5.8961, lng: 22.4178 },
  { name: "姆布吉马伊", lat: -6.1456, lng: 23.5898 },
  { name: "奇卡帕",     lat: -6.4163, lng: 20.8020 },
  { name: "科卢韦齐",   lat: -10.716, lng: 25.4667 },
  { name: "利卡西",     lat: -10.979, lng: 26.7384 },
  { name: "卢本巴希",   lat: -11.688, lng: 27.5026 },
];

const CENTER: [number, number] = [-3.5, 22];

interface Grid {
  hours: string[];
  data: {
    name: string;
    lat: number;
    lng: number;
    precip: number[];
  }[];
}

async function fetchGrid(): Promise<Grid> {
  const lat = DRC_CITIES.map((c) => c.lat).join(",");
  const lng = DRC_CITIES.map((c) => c.lng).join(",");
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&hourly=precipitation&forecast_days=2&timezone=Africa%2FKinshasa`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("open-meteo failed");
  const json = (await res.json()) as
    | Array<{ hourly: { time: string[]; precipitation: number[] } }>
    | { hourly: { time: string[]; precipitation: number[] } };
  const arr = Array.isArray(json) ? json : [json];
  const hours = arr[0].hourly.time;
  const data = arr.map((d, i) => ({
    name: DRC_CITIES[i].name,
    lat: DRC_CITIES[i].lat,
    lng: DRC_CITIES[i].lng,
    precip: d.hourly.precipitation ?? [],
  }));
  return { hours, data };
}

// mm/h 映射到视觉参数
function rainStyle(mm: number) {
  if (mm <= 0) return { opacity: 0, color: "#60a5fa", size: 28, scale: 0.8 };
  if (mm < 0.5) return { opacity: 0.55, color: "#7dd3fc", size: 32, scale: 1 };
  if (mm < 2.5) return { opacity: 0.75, color: "#0ea5e9", size: 38, scale: 1.05 };
  if (mm < 7.5) return { opacity: 0.9, color: "#2563eb", size: 46, scale: 1.1 };
  return { opacity: 1, color: "#6d28d9", size: 54, scale: 1.15 };
}

function markerInnerHtml(name: string) {
  return `
    <div style="
      width:100%;height:100%;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:55%;line-height:1;color:#fff;
      transform:scale(0.8);
    ">
      <span style="font-size:1.4em">🌧️</span>
    </div>
    <div class="rm-label" style="
      position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);
      font-size:10px;line-height:1;
      background:rgba(255,255,255,0.9);
      color:#334155;padding:1px 5px;border-radius:999px;
      white-space:nowrap;font-weight:600;
      box-shadow:0 1px 2px rgba(0,0,0,.15);
    ">${name}</div>
  `;
}

function RainMarkers({ grid, frameIdx }: { grid: Grid; frameIdx: number }) {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  // 只创建一次，之后只更新
  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    grid.data.forEach((city) => {
      const icon = L.divIcon({
        className: "rain-marker",
        html: markerInnerHtml(city.name),
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      const marker = L.marker([city.lat, city.lng], {
        icon,
        interactive: false,
        opacity: 0,
      });
      marker.addTo(map);
      markersRef.current.push(marker);
    });
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [grid, map]);

  // 每帧只更新 opacity / size / 颜色
  useEffect(() => {
    grid.data.forEach((city, i) => {
      const marker = markersRef.current[i];
      if (!marker) return;
      const mm = city.precip[frameIdx] ?? 0;
      const s = rainStyle(mm);
      const el = marker.getElement() as HTMLElement | null;
      if (!el) return;
      el.style.opacity = String(s.opacity);
      el.style.width = `${s.size}px`;
      el.style.height = `${s.size}px`;
      el.style.marginLeft = `${-s.size / 2}px`;
      el.style.marginTop = `${-s.size / 2}px`;
      const inner = el.firstElementChild as HTMLElement | null;
      if (inner) {
        inner.style.background = s.color;
        inner.style.boxShadow =
          s.opacity > 0 ? `0 0 18px ${s.color}99` : "none";
        inner.style.transform = `scale(${s.scale})`;
      }
    });
  }, [frameIdx, grid]);

  return null;
}

export default function RainRadarMap() {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancel = false;
    fetchGrid()
      .then((g) => {
        if (cancel) return;
        setGrid(g);
        const nowMs = Date.now();
        const firstIdx = g.hours.findIndex(
          (t) => new Date(t).getTime() >= nowMs - 30 * 60_000
        );
        setFrameIdx(firstIdx >= 0 ? firstIdx : 0);
      })
      .catch(() => {
        if (!cancel) setErr(true);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const maxIdx = useMemo(() => {
    if (!grid) return 0;
    // 限定播放窗口：从 nowIdx 起的 24 帧
    const nowMs = Date.now();
    const start = grid.hours.findIndex(
      (t) => new Date(t).getTime() >= nowMs - 30 * 60_000
    );
    const s = start >= 0 ? start : 0;
    return Math.min(grid.hours.length - 1, s + 24);
  }, [grid]);

  const minIdx = useMemo(() => {
    if (!grid) return 0;
    const nowMs = Date.now();
    const start = grid.hours.findIndex(
      (t) => new Date(t).getTime() >= nowMs - 30 * 60_000
    );
    return start >= 0 ? start : 0;
  }, [grid]);

  useEffect(() => {
    if (!playing || !grid) return;
    const t = setInterval(() => {
      setFrameIdx((i) => (i >= maxIdx ? minIdx : i + 1));
    }, 900);
    return () => clearInterval(t);
  }, [playing, grid, minIdx, maxIdx]);

  if (err) return null;

  if (!mounted || !grid) {
    return (
      <section className="max-w-4xl mx-auto px-4 mt-4">
        <div className="h-[280px] md:h-[340px] bg-sky-100 rounded-2xl flex items-center justify-center text-sky-500 text-sm animate-pulse">
          🌦️ 雨云动态图加载中…
        </div>
      </section>
    );
  }

  const frameTime = new Date(grid.hours[frameIdx]);
  const now = Date.now();
  const deltaH = Math.round((frameTime.getTime() - now) / 3600_000);
  const deltaLabel =
    deltaH === 0
      ? "现在"
      : deltaH > 0
        ? `+${deltaH} 小时`
        : `${deltaH} 小时`;
  const frameLabel = frameTime.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const rainingCount = grid.data.filter(
    (d) => (d.precip[frameIdx] ?? 0) > 0
  ).length;

  return (
    <section className="max-w-4xl mx-auto px-4 mt-4">
      <div className="rounded-2xl overflow-hidden bg-white border border-sky-100 shadow-sm">
        {/* 标题 */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100">
          <CloudRain size={16} className="text-sky-500" />
          <span className="text-sm font-bold text-gray-800">雨云动态图</span>
          <span className="text-[11px] text-gray-500">刚果金 · 逐小时</span>
          <span className="ml-auto text-[11px] text-sky-600 font-semibold">
            {rainingCount > 0 ? `${rainingCount} 地有雨` : "全境无雨"}
          </span>
        </div>

        {/* 地图 */}
        <div className="relative bg-sky-50" style={{ height: 320 }}>
          <MapContainer
            center={CENTER}
            zoom={5}
            minZoom={4}
            maxZoom={8}
            scrollWheelZoom={false}
            zoomControl={false}
            attributionControl={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <RainMarkers grid={grid} frameIdx={frameIdx} />
          </MapContainer>
          <div className="absolute top-2 left-2 z-[500] px-2.5 py-1 bg-white/95 rounded-full text-[11px] font-bold text-sky-700 shadow">
            {deltaLabel}
          </div>
          <div className="absolute top-2 right-2 z-[500] px-2.5 py-1 bg-white/95 rounded-full text-[11px] text-gray-600 shadow font-mono">
            {frameLabel}
          </div>
        </div>

        {/* 时间轴控件 */}
        <div className="px-3 py-2.5 border-t border-sky-100 bg-white flex items-center gap-2">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0 active:bg-sky-600 shadow"
            aria-label={playing ? "暂停" : "播放"}
          >
            {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <input
            type="range"
            min={minIdx}
            max={maxIdx}
            value={frameIdx}
            onChange={(e) => {
              setFrameIdx(Number(e.target.value));
              setPlaying(false);
            }}
            className="flex-1 accent-sky-500"
            aria-label="时间轴"
          />
          <span className="text-[11px] text-gray-500 shrink-0 w-12 text-right font-mono">
            {String(frameTime.getHours()).padStart(2, "0")}:
            {String(frameTime.getMinutes()).padStart(2, "0")}
          </span>
        </div>

        {/* 图例 */}
        <div className="px-3 py-2 border-t border-sky-100 flex items-center gap-2 text-[10px] text-gray-500">
          <span>强度：</span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: "#7dd3fc", opacity: 0.55 }}
            />
            小雨
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: "#0ea5e9", opacity: 0.75 }}
            />
            中雨
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: "#2563eb", opacity: 0.9 }}
            />
            大雨
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: "#6d28d9", opacity: 1 }}
            />
            暴雨
          </span>
          <span className="ml-auto text-[10px] text-gray-400">Open-Meteo</span>
        </div>
      </div>
    </section>
  );
}
