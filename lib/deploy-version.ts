// 向 /api/version 单次拉取当前部署版本号（Vercel 提供的 git sha 前 7 位）。
// 被 VersionStamp 和 ShareFab 共用：
//   - VersionStamp: 进站后把 ?v=<sha> 贴到地址栏，方便用户从地址栏复制分享
//   - ShareFab:     "复制分享链接"按钮里拼 URL
// 同一页面生命周期内共享一个 Promise，避免并发重复请求；sessionStorage 做跨页
// 保底缓存（同一 tab 内点到别的路由再回来，不用再打一次接口）。

const SESSION_KEY = "klg-deploy-v";
let inflight: Promise<string | null> | null = null;

export async function getDeployVersion(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) return cached;
  } catch {
    /* storage 不可用就走网络 */
  }
  if (!inflight) {
    inflight = (async () => {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        if (!r.ok) return null;
        const d = (await r.json()) as { v?: string };
        // 本地 dev 环境 v === "dev"，对外分享没意义，当作"没拿到版本号"处理
        const raw = d.v;
        const v = raw && raw !== "dev" ? raw.slice(0, 7) : null;
        if (v) {
          try {
            sessionStorage.setItem(SESSION_KEY, v);
          } catch {
            /* ignore */
          }
        }
        return v;
      } catch {
        return null;
      } finally {
        // 拿到结果后释放 promise，下次调用如果走了 sessionStorage 直接命中
        // 如果 sessionStorage 不可用，再下次会重新请求
        inflight = null;
      }
    })();
  }
  return inflight;
}
