"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const KINSHASA_CENTER: [number, number] = [-4.3276, 15.3136];

// 用 divIcon 避开 Leaflet 默认图标静态资源路径问题
const pinIcon = L.divIcon({
  className: "klg-loc-pin",
  html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#f97316;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

function Clickable({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  value,
  onChange,
}: {
  value: { lat?: number; lng?: number };
  onChange: (lat: number, lng: number) => void;
}) {
  const hasValue = typeof value.lat === "number" && typeof value.lng === "number";
  const pos: [number, number] | null = hasValue
    ? [value.lat as number, value.lng as number]
    : null;

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={pos ?? KINSHASA_CENTER}
        zoom={pos ? 16 : 13}
        style={{ height: 200, width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <Clickable onPick={onChange} />
        {pos && <Marker position={pos} icon={pinIcon} />}
      </MapContainer>
      <div className="absolute top-2 left-2 right-2 pointer-events-none">
        <div className="inline-block bg-black/70 text-white text-[11px] px-2 py-0.5 rounded">
          {pos ? `已选定位 ${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}` : "点击地图放置大头钉"}
        </div>
      </div>
    </div>
  );
}
