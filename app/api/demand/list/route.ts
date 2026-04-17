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
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60",
        },
      }
    );
  } catch (e) {
    console.error("demand list error:", e);
    return NextResponse.json({ ok: false, products: [] }, { status: 500 });
  }
}
