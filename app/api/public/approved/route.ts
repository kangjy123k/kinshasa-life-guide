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
          // 撤回 / 审核变更必须立刻可见,不走 CDN 缓存
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: unknown) {
    console.error("public approved error:", e);
    return NextResponse.json({ ok: false, records: [] }, { status: 500 });
  }
}
