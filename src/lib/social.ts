// 社交链接的单一数据源。
//
// 为什么抽出来：原本 ProfileCard / Hero / Footer 三处各自手写一遍要显示哪些链接，
// consts.ts 里新填一个 gitee / 掘金 / CSDN，只有侧栏头像卡会更新，
// 首页 Hero 与页脚永远看不到——这正是 polish-todo.md A1 记录的问题。
// 三处渲染器现在都消费同一份数组，新字段只在一处登记。
//
// 消费方式：
// - ProfileCard：带图标，按 key 选 SVG
// - Hero：带图标（与 ProfileCard 同一套），可选只取前 N 个
// - Footer：纯文字，直接 map label
//
// href 留空串的项会被 filterSocialLinks 剔除，consts.ts 里留空即隐藏。
// isExternalHref 统一「是否跳出站外」判断：http(s) 才开新标签页；
// mailto: 与同源 /rss.xml 原地打开（原先无条件 _blank 的怪行为随之理顺）。

export type SocialLink = {
  key: string;
  label: string;
  href: string;
};

const RAW_SOCIAL_LINKS: SocialLink[] = [
  { key: 'github', label: 'GitHub', href: 'https://github.com/zh-qdwl' },
  { key: 'gitee', label: 'Gitee', href: '' },
  { key: 'juejin', label: '掘金', href: '' },
  { key: 'csdn', label: 'CSDN', href: '' },
  { key: 'email', label: 'Email', href: 'mailto:1498690097@qq.com' },
  { key: 'rss', label: 'RSS', href: '/rss.xml' },
];

/** 剔除留空的项。加载 SOCIAL 配置后调用。 */
export function filterSocialLinks(links: SocialLink[]): SocialLink[] {
  return links.filter((l) => l.href && l.href.trim() !== '');
}

/** http(s) 才算站外链接，才开新标签页 + 带 rel=noopener。 */
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//.test(href);
}

export const SOCIAL_LINKS: SocialLink[] = filterSocialLinks(RAW_SOCIAL_LINKS);
