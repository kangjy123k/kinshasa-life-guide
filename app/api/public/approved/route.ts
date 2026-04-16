import { NextResponse } from "next/server";
import { listSubmissions } from "@/lib/submissions";

export const runtime = "edge";

export async function GET() {
  try {
    const all = await listSubmissions();
    const approved = all.filter((r) => r.status === "approved");
    return NextResponse.json(
      { ok: true, records: approved },
      {
        headers: {
          // 边缘 CDN 缓存 60s；过期后仍可用 10 分钟旧数据，后台再刷新
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=600",
        },
      }
    );
  } catch (e: unknown) {
    console.error("public approved error:", e);
    return NextResponse.json({ ok: false, records: [] }, { status: 500 });
  }
}
