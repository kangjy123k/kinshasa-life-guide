import { listFwod } from "@/lib/fwod-store";
import type { FrenchDailyEntry } from "@/lib/french-word-of-the-day";
import FrenchWordClient from "./FrenchWordClient";

// 每次都取最新（每天换词、动态条目可能后台新增）
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function FrenchWordPage() {
  let entries: FrenchDailyEntry[] = [];
  try {
    entries = await listFwod();
  } catch (e) {
    // DB 不可用就退到纯静态 BANK（客户端 useEffect 也会再尝试一次）
    console.error("[fwod page] listFwod failed, falling back to BANK only:", e);
  }
  return <FrenchWordClient initialEntries={entries} />;
}
