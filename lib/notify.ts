/**
 * PushPlus 推送（微信模板消息）
 * 文档：https://www.pushplus.plus/doc/
 * 失败只 console.error，永远不抛 —— 调用方应该 fire-and-forget，不阻塞主流程。
 */

const ENDPOINT = "https://www.pushplus.plus/send";

export async function sendPushPlus(
  title: string,
  content: string,
  template: "html" | "txt" | "markdown" = "markdown",
): Promise<void> {
  const token = process.env.PUSHPLUS_TOKEN;
  if (!token) return; // 未配置就静默跳过，方便本地开发

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, title, content, template }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error("[pushplus] http", res.status, await res.text().catch(() => ""));
      return;
    }
    const j = (await res.json().catch(() => null)) as { code?: number; msg?: string } | null;
    if (j && j.code !== 200) {
      console.error("[pushplus] api error", j.code, j.msg);
    }
  } catch (e) {
    console.error("[pushplus] send failed:", e);
  }
}

const TYPE_LABEL: Record<string, string> = {
  merchant: "商家入驻",
  secondhand: "二手出售",
  purchase: "求购信息",
  survey: "问卷反馈",
  event: "活动报名",
};

/** 把用户提交数据格式化成 markdown 正文，只展示主要字段 */
export function formatSubmissionContent(
  type: string,
  data: Record<string, string>,
): { title: string; content: string } {
  const label = TYPE_LABEL[type] ?? type;
  const title = `🆕 新${label}提交`;

  // 选最常出现且有意义的字段，按顺序展示；其余塞进 "其他"
  const preferred = [
    "name",
    "title",
    "shopName",
    "contact",
    "phone",
    "wechat",
    "price",
    "address",
    "category",
    "desc",
    "description",
    "note",
  ];
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const k of preferred) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) {
      lines.push(`- **${k}**: ${v.trim().slice(0, 200)}`);
      seen.add(k);
    }
  }
  for (const [k, v] of Object.entries(data)) {
    if (seen.has(k)) continue;
    if (k === "updates") continue; // 商家动态 JSON，跳过
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    lines.push(`- ${k}: ${trimmed.slice(0, 120)}`);
  }

  const body = lines.length ? lines.join("\n") : "_(无详细字段)_";
  const site = process.env.SITE_URL?.replace(/\/+$/, "") || "";
  const adminLink = site
    ? `[${site}/admin](${site}/admin)`
    : "/admin";
  const content = `**类型**: ${label}\n\n${body}\n\n---\n审核入口：${adminLink}`;
  return { title, content };
}
