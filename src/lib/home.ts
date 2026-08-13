// 首页专用的纯逻辑。不 import astro:content，可直接单测。
// 随机推荐的洗牌不在这里——它必须每次访问都变，只能由客户端脚本做，
// 而 is:inline 脚本无法 import 模块，故那段逻辑内联在 RandomPosts.astro 里。

export type Uptime = { days: number; hours: number; minutes: number; seconds: number };

/** 从建站日期算到 now 的运行时长。起点晚于 now 时归零。 */
export function uptimeSince(startISO: string, now: Date): Uptime {
  const ms = now.getTime() - new Date(startISO).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  // 全部从总秒数取模算，避免逐级相减时的中间量写错
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor(total / 3_600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
  };
}

/**
 * 给 UptimeBar 用的展示值：时分秒补两位。
 *
 * 补零不只是好看——秒数每秒都在变，9→10 时如果宽度跟着跳，整条胶囊会左右抽动。
 * 配合 .uptime strong 上的 font-variant-numeric: tabular-nums，宽度才真正固定。
 * 天数不补：它没有上限，补零反而奇怪。
 */
export function formatUptime(startISO: string, now: Date): Record<keyof Uptime, string> {
  const t = uptimeSince(startISO, now);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return {
    days: String(t.days),
    hours: pad2(t.hours),
    minutes: pad2(t.minutes),
    seconds: pad2(t.seconds),
  };
}
