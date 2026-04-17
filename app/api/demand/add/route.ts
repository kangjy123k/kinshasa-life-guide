import { NextRequest, NextResponse } from "next/server";
import { addProduct } from "@/lib/demand";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { name?: string };
    const name = typeof body.name === "string" ? body.name : "";
    const result = await addProduct(name);
    return NextResponse.json(result);
  } catch (e) {
    console.error("demand add error:", e);
    return NextResponse.json({ ok: false, reason: "server error" }, { status: 500 });
  }
}
