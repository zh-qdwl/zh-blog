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
