"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapBusiness {
  id: number;
  name: string;
  category: string;
  subcategory?: string;
  area: string;
  mainService: string;
  image: string;
  lat?: number;
  lng?: number;
}

export interface MapCategory {
  key: string;
  label: string;
  color: string; // hex
  emoji: string;
}

const KINSHASA_CENTER: [number, number] = [-4.3276, 15.3136];

function makeIcon(color: string, emoji: string, highlight = false) {
  const size = highlight ? 40 : 32;
  const ring = highlight ? "box-shadow:0 0 0 4px rgba(248,113,113,.55);" : "";
  const html = `
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};color:#fff;display:flex;align-items:center;justify-content:center;
      font-size:${size * 0.55}px;line-height:1;border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.25);${ring}
    ">${emoji}</div>`;
  return L.divIcon({
    className: "kin-marker",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function FocusController({
  lat,
  lng,
  zoom = 15,
}: {
  lat?: number;
  lng?: number;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (typeof lat === "number" && typeof lng === "number") {
      map.flyTo([lat, lng], zoom, { duration: 0.8 });
    }
  }, [lat, lng, zoom, map]);
  return null;
}

function MapResizer({ activated }: { activated: boolean }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 320);
    return () => clearTimeout(t);
  }, [activated, map]);
  return null;
}

export default function MapSection({
  businesses,
  categories,
  focusBusinessId,
  onOpenBusiness,
}: {
  businesses: MapBusiness[];
  categories: MapCategory[];
  focusBusinessId?: number | null;
  onOpenBusiness: (id: number) => void;
}) {
  const [activeKey, setActiveKey] = useState<string>("all");
  const [mounted, setMounted] = useState(false);
  const [activated, setActivated] = useState(false);
  const [mapKey, setMapKey] = useState(() => `map-${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    setMapKey(`map-${Math.random().toString(36).slice(2)}`);
    setMounted(true);
    return () => setMounted(false);
  }, []);
  // 全屏时锁住 body 滚动,避免双层滚动
  useEffect(() => {
    if (!activated) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [activated]);
  const catMap = useMemo(() => {
    const m = new Map<string, MapCategory>();
    categories.forEach((c) => m.set(c.key, c));
    return m;
  }, [categories]);

  const focused = useMemo(
    () => businesses.find((b) => b.id === focusBusinessId) ?? null,
    [businesses, focusBusinessId]
  );

  // 切到"全部"或 focused 所属分类才能显示它
  useEffect(() => {
    if (focused) {
      if (activeKey !== "all" && activeKey !== focused.category) {
        setActiveKey("all");
      }
      // 外部聚焦商家时直接激活地图
      setActivated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused?.id]);

  const markers = useMemo(() => {
    return businesses
      .filter((b) => typeof b.lat === "number" && typeof b.lng === "number")
      .filter((b) => activeKey === "all" || b.category === activeKey);
  }, [businesses, activeKey]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
      {/* 分类 chips */}
      <div className="border-b border-sky-100">
        <div className="flex overflow-x-auto scrollbar-hide gap-2 px-3 py-2.5">
          <CategoryChip
            label="全部"
            emoji="🗺️"
            color="#0ea5e9"
            active={activeKey === "all"}
            onClick={() => setActiveKey("all")}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.key}
              label={c.label}
              emoji={c.emoji}
              color={c.color}
              active={activeKey === c.key}
              onClick={() => setActiveKey(c.key)}
            />
          ))}
        </div>
      </div>

      <div className="h-[220px] md:h-[280px] w-full relative bg-sky-50/40">
        {activated && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-sky-600 bg-white/95 px-3 py-1.5 rounded-full shadow-sm ring-1 ring-sky-100">
              📍 地图已全屏 · 点"收起"返回
            </span>
          </div>
        )}
        <div
          className={
            activated
              ? "fixed inset-0 z-[9999] bg-white flex flex-col"
              : "absolute inset-0"
          }
        >
          {activated && (
            <div
              className="flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur shadow-sm border-b border-sky-100 shrink-0"
              style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
              <span className="text-sm font-semibold text-sky-700 inline-flex items-center gap-1.5">
                <span>📍</span>
                <span>商家地图</span>
                <span className="text-xs text-gray-400 font-normal">
                  · {markers.length} 家
                </span>
              </span>
              <button
                type="button"
                onClick={() => setActivated(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700 active:bg-sky-200"
              >
                <span>✕</span>
                <span>收起</span>
              </button>
            </div>
          )}
          <div className={activated ? "flex-1 relative" : "h-full w-full relative"}>
            {!mounted ? (
              <div className="h-full w-full flex items-center justify-center text-sky-400 text-sm">
                地图加载中…
              </div>
            ) : (
        <MapContainer
          key={mapKey}
          center={KINSHASA_CENTER}
          zoom={12}
          minZoom={10}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <MapResizer activated={activated} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {focused?.lat && focused?.lng && (
            <FocusController lat={focused.lat} lng={focused.lng} />
          )}
          {markers.map((b) => {
            const cat = catMap.get(b.category);
            const isFocus = focused?.id === b.id;
            return (
              <Marker
                key={b.id}
                position={[b.lat!, b.lng!]}
                icon={makeIcon(cat?.color ?? "#0ea5e9", cat?.emoji ?? "📍", isFocus)}
                zIndexOffset={isFocus ? 1000 : 0}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -16]}
                  opacity={0.95}
                  permanent
                  className="kin-name-tip"
                >
                  {b.name}
                </Tooltip>
                <Popup>
                  <div className="w-[220px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.image}
                      alt={b.name}
                      className="w-full h-24 object-cover rounded-md mb-2"
                    />
                    <p className="font-bold text-[15px] text-gray-900 leading-tight">
                      {b.name}
                    </p>
                    <p className="text-[11px] text-sky-600 mt-0.5">
                      {cat?.label}
                      {b.subcategory ? ` · ${b.subcategory}` : ""}
                    </p>
                    <p className="text-[12px] text-gray-600 mt-1">{b.area}</p>
                    <p className="text-[12px] text-gray-500 mt-1 line-clamp-2">
                      {b.mainService}
                    </p>
                    <button
                      onClick={() => onOpenBusiness(b.id)}
                      className="mt-2 w-full py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg"
                    >
                      查看详情
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        )
        }
            {mounted && !activated && (
              <button
                type="button"
                onClick={() => setActivated(true)}
                aria-label="点击全屏地图"
                className="absolute inset-0 z-[600] flex items-center justify-center bg-white/35 backdrop-blur-[3px] transition-opacity duration-200 active:bg-white/25 cursor-pointer"
              >
                <span className="flex items-center gap-2 bg-white/95 text-sky-700 px-4 py-2 rounded-full text-sm font-semibold shadow-lg ring-1 ring-sky-100">
                  <span className="text-base">👆</span>
                  <span>点击全屏看地图</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="px-3 py-2 text-xs text-gray-500 bg-sky-50/50 border-t border-sky-100">
        共 {markers.length} 家
        {activeKey !== "all"
          ? `「${catMap.get(activeKey)?.label ?? ""}」`
          : ""}
        商家标记 · 点击 marker 查看详情
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  emoji,
  color,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
        active
          ? "text-white shadow"
          : "bg-sky-50 text-gray-700 hover:bg-sky-100"
      }`}
      style={active ? { background: color } : undefined}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}
