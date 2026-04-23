/**
 * 给展示图片 URL 套上水印代理。服务端会拉源图、叠上"@刚果金华人生活服务指南"
 * 斜向平铺水印，再以 webp 返回。用户长按/右键另存拿到的就是带水印版本。
 *
 * 加水印的范围：
 *   - /api/media/*   用户提交的商家 / 二手 / 求购 / 活动图
 *   - /fwod/*        每日法语释义图
 *   - /images/businesses/*   站内内置商家图
 *
 * 明确不加水印（首页赞助位 / 混凝土广告等）：
 *   - /images/sponsor-*
 *   - /images/concrete-plant-*
 *   - /images/watermark-tile.png（水印源本身）
 */
function shouldWatermark(src: string): boolean {
  if (src.startsWith("/api/media/")) return true;
  if (src.startsWith("/fwod/")) return true;
  if (src.startsWith("/images/businesses/")) return true;
  return false;
}

export function wm(src: string | undefined | null): string {
  if (!src) return "";
  const s = src.trim();
  if (!s) return "";
  if (s.startsWith("/api/wm")) return s;
  if (shouldWatermark(s)) return `/api/wm?src=${encodeURIComponent(s)}`;
  return s;
}
