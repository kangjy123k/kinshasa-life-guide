import { NextResponse } from "next/server";

export const runtime = "edge";
export const revalidate = 1800;

const KINSHASA_LAT = -4.3217;
const KINSHASA_LON = 15.3126;
const TZ = "Africa/Kinshasa";

interface Slot15 {
  time: string;
  precipProbability: number;
  precipMm: number;
}

interface AlertData {
  rainSoon: boolean;
  minutesToRain: number | null;
  peakProbability: number;
  source: "open-meteo" | "tomorrow.io" | "none";
}

async function fetchOpenMeteo() {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${KINSHASA_LAT}` +
    `&longitude=${KINSHASA_LON}` +
    `&hourly=temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,relative_humidity_2m` +
    `&minutely_15=precipitation,precipitation_probability` +
    `&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m` +
    `&timezone=${encodeURIComponent(TZ)}` +
    `&forecast_hours=24` +
    `&forecast_minutely_15=8`; // 2 小时 = 8 个 15min 格子

  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  return (await res.json()) as {
    current?: {
      time?: string;
      temperature_2m?: number;
      weather_code?: number;
      relative_humidity_2m?: number;
      wind_speed_10m?: number;
    };
    hourly?: {
      time: string[];
      temperature_2m: number[];
      precipitation: number[];
      precipitation_probability: number[];
      weather_code: number[];
      wind_speed_10m: number[];
      relative_humidity_2m: number[];
    };
    minutely_15?: {
      time: string[];
      precipitation: number[];
      precipitation_probability: number[];
    };
  };
}

async function fetchTomorrowIo(): Promise<Slot15[] | null> {
  const key = process.env.TOMORROW_API_KEY;
  if (!key) return null;
  const url =
    `https://api.tomorrow.io/v4/timelines` +
    `?location=${KINSHASA_LAT},${KINSHASA_LON}` +
    `&fields=precipitationIntensity,precipitationProbability` +
    `&timesteps=15m` +
    `&startTime=now` +
    `&endTime=nowPlus2h` +
    `&units=metric` +
    `&timezone=${encodeURIComponent(TZ)}` +
    `&apikey=${key}`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) {
      console.error("tomorrow.io failed:", res.status);
      return null;
    }
    const data = (await res.json()) as {
      data?: {
        timelines?: Array<{
          intervals: Array<{
            startTime: string;
            values: {
              precipitationIntensity?: number;
              precipitationProbability?: number;
            };
          }>;
        }>;
      };
    };
    const intervals = data.data?.timelines?.[0]?.intervals ?? [];
    return intervals.map((i) => ({
      time: i.startTime,
      precipProbability: i.values.precipitationProbability ?? 0,
      precipMm: i.values.precipitationIntensity ?? 0,
    }));
  } catch (e) {
    console.error("tomorrow.io fetch error:", e);
    return null;
  }
}

function computeAlert(
  slots: Slot15[],
  source: "open-meteo" | "tomorrow.io"
): AlertData {
  // 阈值：降水概率 >= 60%，或降水量 >= 0.3mm
  const THRESHOLD_PROB = 60;
  const THRESHOLD_MM = 0.3;
  let peakProb = 0;
  let firstRainIdx: number | null = null;
  slots.forEach((s, idx) => {
    if (s.precipProbability > peakProb) peakProb = s.precipProbability;
    const hit =
      s.precipProbability >= THRESHOLD_PROB || s.precipMm >= THRESHOLD_MM;
    if (hit && firstRainIdx == null) firstRainIdx = idx;
  });
  return {
    rainSoon: firstRainIdx != null,
    minutesToRain: firstRainIdx != null ? firstRainIdx * 15 : null,
    peakProbability: peakProb,
    source,
  };
}

export async function GET() {
  try {
    const om = await fetchOpenMeteo();

    const h = om.hourly;
    const hours = h
      ? h.time.map((t, i) => ({
          time: t,
          temp: h.temperature_2m[i],
          precip: h.precipitation_probability[i] ?? 0,
          precipMm: h.precipitation[i] ?? 0,
          code: h.weather_code[i] ?? 0,
          wind: h.wind_speed_10m[i] ?? 0,
          humidity: h.relative_humidity_2m[i] ?? 0,
        }))
      : [];

    // minutely 预警：优先 Tomorrow.io（雷达+ML），否则回落 Open-Meteo minutely_15
    const tiSlots = await fetchTomorrowIo();
    let alert: AlertData;
    let minutely15: Slot15[];

    if (tiSlots && tiSlots.length > 0) {
      minutely15 = tiSlots;
      alert = computeAlert(tiSlots, "tomorrow.io");
    } else if (om.minutely_15) {
      minutely15 = om.minutely_15.time.map((t, i) => ({
        time: t,
        precipProbability: om.minutely_15!.precipitation_probability[i] ?? 0,
        precipMm: om.minutely_15!.precipitation[i] ?? 0,
      }));
      alert = computeAlert(minutely15, "open-meteo");
    } else {
      minutely15 = [];
      alert = {
        rainSoon: false,
        minutesToRain: null,
        peakProbability: 0,
        source: "none",
      };
    }

    return NextResponse.json(
      {
        city: "Kinshasa",
        tz: TZ,
        current: om.current ?? null,
        hours,
        minutely15,
        alert,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      }
    );
  } catch (e) {
    console.error("weather fetch error:", e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
