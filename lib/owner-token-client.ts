/**
 * 轻量"身份"：发布用户 → 我的投稿
 *
 * 机制：
 *  - cookie `klg_owner` 由服务端 Set-Cookie（httpOnly:false）
 *  - 客户端把 cookie 值镜像到 localStorage 作为兜底
 *  - 每次调用 getOwnerToken() 会自动双写同步（防止微信 webview 偶发丢 cookie）
 *
 * 没有恢复码 / 手机号 / 查询码 —— 换设备或清缓存就找不回投稿（这是有意设计）。
 */

const COOKIE_KEY = "klg_owner";
const LS_KEY = "klg_owner";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)klg_owner=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(token: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(
    token
  )}; path=/; max-age=${TEN_YEARS}; samesite=lax`;
}

function readLS(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}

function writeLS(token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, token);
  } catch {
    /* 私密模式下可能抛 */
  }
}

/**
 * 返回当前设备的 owner token，如果 cookie / localStorage 都没有就返回 null。
 * 有一侧缺失会自动从另一侧补写，确保两处同值续期。
 */
export function getOwnerToken(): string | null {
  const c = readCookie();
  const l = readLS();
  const token = c || l || null;
  if (!token) return null;
  if (!c) writeCookie(token);
  if (!l) writeLS(token);
  return token;
}

/**
 * 提交成功后把服务端回传的 token 同步写入 cookie + localStorage。
 */
export function setOwnerToken(token: string) {
  if (!token) return;
  writeCookie(token);
  writeLS(token);
}
