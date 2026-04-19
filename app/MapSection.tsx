"use client";

import { useEffect, useMemo, useState } from "react";
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
  color: string;
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

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);
  return null;
}

export default function MapSection({
  businesses,
  categories,
  activeKey,
  focusBusinessId,
  onOpenBusiness,
}: {
  businesses: MapBusiness[];
  categories: MapCategory[];
  activeKey: string;
  focusBusinessId?: number | null;
  onOpenBusiness: (id: number) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [mapKey, setMapKey] = useState(() => `map-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    setMapKey(`map-${Math.random().toString(36).slice(2)}`);
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 全屏时锁 body 滚动
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const catMap = useMemo(() => {
    const m = new Map<string, MapCategory>();
    categories.forEach((c) => m.set(c.key, c));
    return m;
  }, [categories]);

  const focused = useMemo(
    () => businesses.find((b) => b.id === focusBusinessId) ?? null,
    [businesses, focusBusinessId]
  );

  const markers = useMemo(() => {
    return businesses
      .filter((b) => typeof b.lat === "number" && typeof b.lng === "number")
      .filter((b) => activeKey === "all" || b.category === activeKey);
  }, [businesses, activeKey]);

  if (!mounted) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sky-400 text-sm">
        地图加载中…
      </div>
    );
  }

  return (
    <MapContainer
      key={mapKey}
      center={KINSHASA_CENTER}
      zoom={12}
      minZoom={10}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <MapResizer />
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
  );
}
