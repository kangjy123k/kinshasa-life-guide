import { NextResponse } from "next/server";
import { getAnalytics } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getAnalytics();
    return NextResponse.json(data);
  } catch (e) {
    console.error("stats error:", e);
    return NextResponse.json({ totalVisits: 0, visits: [] }, { status: 500 });
  }
}
