// 格式化工具的纯函数集合。放这里的两个原因：
// 1. Vitest 只收 src/**/*.test.ts，.astro frontmatter 里的函数测不到（polish-todo B2）
// 2. 日期统一用 UTC 取值（polish-todo B3）：z.coerce.date() 把 '2026-01-01' 解析成
//    UTC 午夜，本地时区取 getMonth() 在负时区机器上会归错年/错日，
//    UTC 取值则与 datetime 属性的 toISOString() 完全一致。

/** 月-日两位数字，如 '03-05'。用 UTC 分量，与 pubDate 的解析时区一致。 */
export function monthDayUTC(date: Date): string {
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/** 估算阅读时长（分钟）。按中文约 300 字/分钟、代码块按字符数折半计。
 *  纯函数，入参为 Markdown 原文。 */
export function estimateReadMinutes(markdown: string): number {
  if (!markdown) return 1;
  // 去掉代码块（阅读耗时远低于 prose）
  const prose = markdown.replace(/```[\s\S]*?```/g, '').trim();
  // 中文字符按 300 字/分钟，其余按英文 200 词/分钟的近似
  const cjkCount = (prose.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const nonCjk = prose.replace(/[\u4e00-\u9fff]/g, ' ').trim();
  const wordCount = nonCjk ? nonCjk.split(/\s+/).length : 0;
  const minutes = cjkCount / 300 + wordCount / 200;
  // 至少 1 分钟
  return Math.max(1, Math.round(minutes));
}
