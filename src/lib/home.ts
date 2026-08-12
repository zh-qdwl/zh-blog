// 首页专用的纯逻辑。不 import astro:content，可直接单测。
// 随机推荐的洗牌不在这里——它必须每次访问都变，只能由客户端脚本做，
// 而 is:inline 脚本无法 import 模块，故那段逻辑内联在 RandomPosts.astro 里。

/** 从建站日期算到 now 的运行时长。起点晚于 now 时归零。 */
export function uptimeSince(startISO: string, now: Date): { days: number; hours: number } {
  const ms = now.getTime() - new Date(startISO).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return { days: 0, hours: 0 };
  const totalHours = Math.floor(ms / 3_600_000);
  return { days: Math.floor(totalHours / 24), hours: totalHours % 24 };
}
