// 评论线的路径键。
//
// 为什么不让 widget 自己读 location.pathname：全站链接统一写成 /blog/xxx/，
// 但未配置 trailingSlash、Astro 默认 build.format: 'directory'，产出的是
// /blog/xxx/index.html——带不带尾斜杠都能打开。访客从外链、手输网址、搜索结果
// 进来时 location.pathname 形态不定，而 Twikoo 明确把带斜杠与不带斜杠当成两条
// 独立评论线（见 twikoo-cloudflare README 的已知限制），同一篇文章的评论就会被
// 拆成两半、互相看不见。
//
// 所以调用方要传构建期的 Astro.url.pathname，经这里归一后渲染进 init() 的 path。
// 构建期的值对每个访客都一样，与他怎么进来无关。

/** 统一带尾斜杠，与全站链接写法一致 */
export function normalizeCommentPath(pathname: string): string {
  if (!pathname) return '/';
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

/** 各档 provider 的必填字段。这是全站唯一一份，consts.test.ts 不再自己抄一遍。 */
const REQUIRED_FIELDS: Record<string, string[]> = {
  giscus: ['repo', 'repoId', 'category', 'categoryId'],
  twikoo: ['envId'],
  waline: ['serverURL'],
};

/** COMMENTS 的最小结构约束。写得松是刻意的——测试要能传造出来的残缺配置进来。 */
export type CommentsConfigLike = {
  provider: string;
  [group: string]: unknown;
};

/**
 * 返回当前启用的 provider 缺失的必填字段名。
 * provider='none'、或该档全部填齐时返回空数组。
 *
 * 只看启用的那一档：未启用的 provider 允许留空，否则想切换就得先把三档全填上。
 * 空白字符按缺失处理——复制粘贴很容易留个空格，视觉上「填了」但实际是空的。
 */
export function missingCommentFields(cfg: CommentsConfigLike): string[] {
  const required = REQUIRED_FIELDS[cfg.provider];
  if (!required) return []; // 'none'，或将来新增但还没登记必填字段的档
  const group = (cfg[cfg.provider] ?? {}) as Record<string, unknown>;
  return required.filter((key) => {
    const value = group[key];
    return typeof value !== 'string' || value.trim() === '';
  });
}
