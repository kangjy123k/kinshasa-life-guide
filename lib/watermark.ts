/**
 * 展示 URL 与"下载 URL"分离：
 *   - wm(src)         → 原图，直接显示，无水印
 *   - wmDownload(src) → /api/wm?src=...，带水印 webp，给长按/右键保存用
 *
 * 使用方式见 components/ProtectedImg.tsx：视觉层是 wm() 原图，
 * 上面叠一张 opacity:0 的 wmDownload() 水印版，长按/右键菜单命中的
 * 是它 → 用户点"保存图片"时下载到的是水印版。
 *
 * 允许走水印代理的范围：
 *   - /api/media/*           用户提交的商家 / 二手 / 求购 / 活动图
 *   - /fwod/*                每日法语释义图
 *   - /images/businesses/*   站内内置商家图
 *
 * 明确不加水印（首页赞助位 / 混凝土广告 / 水印源本身）：
 *   - /images/sponsor-*
 *   - /images/concrete-plant-*
 *   - /images/watermark-tile.png
 */
function shouldWatermark(src: string): boolean {
  if (src.startsWith("/api/media/")) return true;
  if (src.startsWith("/fwod/")) return true;
  if (src.startsWith("/images/businesses/")) return true;
  return false;
}

export function wm(src: string | undefined | null): string {
  if (!src) return "";
  return src.trim();
}

export function wmDownload(src: string | undefined | null): string {
  if (!src) return "";
  const s = src.trim();
  if (!s) return "";
  if (s.startsWith("/api/wm")) return s;
  if (shouldWatermark(s)) return `/api/wm?src=${encodeURIComponent(s)}`;
  return s;
}
