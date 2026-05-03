import type { BizCardData, BizCardLang } from "./bizcard-types";

const W = 1100;
const H = 660;
const SCALE = 2;

const LABELS: Record<BizCardLang, { phone: string; email: string; wechat: string; address: string }> = {
  zh: { phone: "电话", email: "邮箱", wechat: "微信", address: "地址" },
  en: { phone: "Phone", email: "E-mail", wechat: "WeChat", address: "Address" },
  fr: { phone: "Téléphone", email: "E-mail", wechat: "Wechat", address: "Adresse" },
};

type BizField = "company" | "business" | "name" | "address";

export function pickLang(
  data: BizCardData,
  field: BizField,
  lang: BizCardLang,
): string {
  if (lang === "fr") {
    const key = `${field}Fr` as keyof BizCardData;
    const v = data[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  if (lang === "en") {
    const key = `${field}En` as keyof BizCardData;
    const v = data[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return data[field] || "";
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const r = Math.min(w / img.width, h / img.height);
  const dw = img.width * r;
  const dh = img.height * r;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  const words = text.split(/(\s+|，|,)/).filter(Boolean);
  let cur = "";
  for (const w of words) {
    const next = cur + w;
    if (ctx.measureText(next).width > maxWidth && cur) {
      lines.push(cur.trim());
      cur = w.trimStart();
    } else {
      cur = next;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  // 兜底：单行还是太长就按字符切
  const out: string[] = [];
  for (const l of lines) {
    if (ctx.measureText(l).width <= maxWidth) {
      out.push(l);
      continue;
    }
    let buf = "";
    for (const ch of l) {
      if (ctx.measureText(buf + ch).width > maxWidth && buf) {
        out.push(buf);
        buf = ch;
      } else {
        buf += ch;
      }
    }
    if (buf) out.push(buf);
  }
  return out;
}

export async function renderBizCardImage(
  data: BizCardData,
  lang: BizCardLang,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context not available");
  ctx.scale(SCALE, SCALE);

  // 1. 纸张底纹（失败兜底为米白）
  try {
    const paper = await loadImg("/images/bizcard-paper.jpg");
    ctx.drawImage(paper, 0, 0, W, H);
  } catch {
    ctx.fillStyle = "#f6f3ec";
    ctx.fillRect(0, 0, W, H);
  }

  // 2. 92% 白罩，淡化原图文字、保留纸张纤维感
  ctx.fillStyle = "rgba(255,255,255,0.93)";
  ctx.fillRect(0, 0, W, H);

  // 3. 边缘极淡阴影
  ctx.strokeStyle = "rgba(0,0,0,0.05)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  // 4. logo
  const logoBox = { x: 60, y: 180, w: 300, h: 300 };
  if (data.logo) {
    try {
      const logo = await loadImg(data.logo);
      drawContain(ctx, logo, logoBox.x, logoBox.y, logoBox.w, logoBox.h);
    } catch {
      // 忽略 logo 加载失败
    }
  }

  // 5. 文本区域：右侧
  const rx = 420;
  const rw = W - rx - 40;

  ctx.textBaseline = "top";

  // 公司名（顶部）
  const company = pickLang(data, "company", lang);
  if (company) {
    ctx.fillStyle = "#1f2937";
    ctx.font = "600 22px system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
    const lines = wrapText(ctx, company, rw);
    let y = 90;
    for (const line of lines.slice(0, 2)) {
      ctx.fillText(line, rx, y);
      y += 28;
    }
  }

  // 大名字
  const name = pickLang(data, "name", lang);
  if (name) {
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "800 50px system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillText(name, rx, 200);
  }

  // 副标题（主营业务/职位）
  const business = pickLang(data, "business", lang);
  if (business) {
    ctx.fillStyle = "#374151";
    ctx.font = "600 22px system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
    const lines = wrapText(ctx, business, rw);
    let y = 270;
    for (const line of lines.slice(0, 2)) {
      ctx.fillText(line, rx, y);
      y += 28;
    }
  }

  // 联系信息行
  const labels = LABELS[lang];
  const showWechat = data.showWechat !== false && !!data.wechat?.trim();
  const rows: Array<[string, string]> = [];
  if (data.phone?.trim()) rows.push([labels.phone, data.phone]);
  if (data.email?.trim()) rows.push([labels.email, data.email]);
  if (showWechat) rows.push([labels.wechat, data.wechat]);
  const address = pickLang(data, "address", lang);
  if (address) rows.push([labels.address, address]);

  let cy = 370;
  const labelX = rx;
  const valueX = rx + 130;
  const labelFont = "500 18px system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const valueFont = "600 18px system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";

  for (const [label, value] of rows) {
    ctx.fillStyle = "#6b7280";
    ctx.font = labelFont;
    ctx.fillText(`${label}：`, labelX, cy);
    ctx.fillStyle = "#111827";
    ctx.font = valueFont;
    const lines = wrapText(ctx, value, W - valueX - 40);
    let lyy = cy;
    for (const line of lines.slice(0, 2)) {
      ctx.fillText(line, valueX, lyy);
      lyy += 28;
    }
    cy = Math.max(cy + 32, lyy + 4);
    if (cy > H - 30) break;
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}
