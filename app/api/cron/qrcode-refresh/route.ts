import { NextRequest, NextResponse } from "next/server";
import { refreshFromSource } from "@/lib/qrcode";

export const runtime = "nodejs";

/**
 * Vercel Cron 每周触发一次，从 admin 配置的 source_url 拉最新二维码写回 Turso。
 * Vercel Cron 自动附带 Authorization: Bearer <CRON_SECRET>。
 * 手动触发也可以：curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/qrcode-refresh
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }
  const result = await refreshFromSource({ force: false });
  return NextResponse.json({ ok: true, result });
}
