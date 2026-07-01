// 学习反馈音效 —— 用 Web Audio 现场合成，不依赖任何音频文件
// 好处：离线也能响、零网络、零 Blob 消耗、延迟极低。
// iOS 要求 AudioContext 在用户手势里创建 / resume —— 都由"点按钮"触发，天然满足。

type AC = AudioContext;

let ctx: AC | null = null;

function getCtx(): AC | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** 在给定时间点奏一个短音（带柔和的起落包络） */
function tone(
  c: AC,
  freq: number,
  startOffset: number,
  dur: number,
  peak: number,
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle"; // 三角波比正弦更"清脆"一点，接近 App 提示音
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(c.destination);

  const t = c.currentTime + startOffset;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

/** 学会一句：清脆的上行两音「叮—叮」 */
export function playLearnedChime() {
  const c = getCtx();
  if (!c) return;
  tone(c, 659.25, 0, 0.16, 0.28); // E5
  tone(c, 987.77, 0.09, 0.22, 0.26); // B5
}

/** 里程碑：更长的上行琶音「叮叮叮叮」，像小小的欢呼 */
export function playMilestoneChime() {
  const c = getCtx();
  if (!c) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => tone(c, f, i * 0.1, 0.3, 0.24));
}
