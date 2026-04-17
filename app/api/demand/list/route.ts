import { NextResponse } from "next/server";
import { listProducts } from "@/lib/demand";

export const runtime = "nodejs";

export async function GET() {
  try {
    const products = await listProducts();
    return NextResponse.json(
      { ok: true, products },
      {
        headers: {
          // 投票是实时行为，绝不能让 CDN 返回 stale → 会覆盖用户刚投的票
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (e) {
    console.error("demand list error:", e);
    return NextResponse.json({ ok: false, products: [] }, { status: 500 });
  }
}
