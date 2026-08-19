// 站点全局配置：改这里就能改博客的标题、简介、导航、社交链接
// 用于浏览器标签页标题、RSS 订阅源名称、og:title——即「文档意义上的站名」
export const SITE_TITLE = '昊的博客';

// 左上角显示的品牌名，只影响视觉，不影响标签页标题和 RSS。
// 想让站名全站统一，把上面的 SITE_TITLE 也改成同一个值即可
//（注意 RSS 订阅源改名，已订阅的读者那边会看到源名变化）。
export const SITE_BRAND = 'HOWARD';
// 站点简介。只用于 <meta description>、og:description 与 RSS 源描述，
// 页面上不再渲染它（侧栏头像卡原本显示这句，现已改为只显示 AUTHOR_ROLE）。
export const SITE_DESCRIPTION = '记录编程、技术与思考。';

// 作者名。消费方：侧栏头像卡、页脚版权、关于页正文。
export const AUTHOR = '昊';

// 头像。换成自己的照片时把文件放进 public/ 再改这里。
// 侧栏按 72px 显示，给到 3 倍图就够，别直接丢原图进来。
export const AVATAR = '/touxiang.webp';

// 一句身份描述，显示在侧栏头像卡的名字下方（全站唯一消费方就是它）
export const AUTHOR_ROLE = '期待未来';

// 建站日期（ISO），用于首页「本站已运行 X 天」。改成你真实的起点。
export const SITE_START = '2026-08-09';

// 顶部导航。顶级只留三项，其余收进下拉。
//
// 带 children 的项，自己的 href 仍然是可点的（指向该板块的索引页），
// 下拉只是把下面几个页面提上来——所以触屏上点父项也不会走进死路。
//
// 「归档」必须留在这棵树里：首页 Hero 改成整屏后原来的统计数字被移除，
// 而那三个数字是 /archive 在全站唯一的入口。由 consts.test.ts 守着（含 children）。
// icon 对应 src/lib/nav-icons.ts 里的图形，漏配或写错同样由 consts.test.ts 拦下。
export const NAV_LINKS = [
  { href: '/', label: '首页', icon: 'home' },
  {
    href: '/blog',
    label: '文章',
    icon: 'post',
    children: [
      { href: '/blog', label: '全部文章' },
      { href: '/categories', label: '分类' },
      { href: '/tags', label: '标签' },
      { href: '/archive', label: '归档' },
    ],
  },
  {
    href: '/about',
    label: '关于',
    icon: 'about',
    children: [
      { href: '/about', label: '关于我' },
      { href: '/guestbook', label: '留言' },
    ],
  },
];

// ===== 首页整屏 Hero =====

// 底图。换图只需把新文件放进 public/ 再改这一行。
// 它是首页的 LCP 元素，建议 1920 宽、WebP、300KB 以内——当前这张是 1920×1407 / 128KB。
export const HERO_IMAGE = '/labixiaoxin2.webp';

// 底图焦点，直接写进 CSS 的 object-position。
// 视口比图更扁（或竖屏更窄）时，cover 会裁掉溢出的部分，默认居中常常正好切掉主体。
// 当前这张接近 4:3，桌面上纵向只裁掉约 15%，略微上移即可让人物完整在框内；
// 竖屏会横向裁掉约六成，只剩中间的广志与小白——这是宽图放进窄屏的固有代价。
export const HERO_FOCUS = '50% 45%';

// 底图是亮是暗，决定 Hero 上用深字还是白字（对应 tokens.css 的两套 --hero-* 令牌）。
// 'light' = 浅色底图 → 深色文字 + 浅色遮罩；'dark' = 暗色底图 → 白色文字 + 深色遮罩。
// 换图后**一定要跟着改这一行**：配色跟底图反了会直接掉到 2:1 以下，肉眼可见地读不出来。
// 拿不准就用 sharp 量一下底图的平均亮度：mean RGB 三个值都偏高（>170）就选 'light'。
export const HERO_TONE: 'light' | 'dark' = 'light';

// 整屏上循环打字的文案。第一句会被服务端渲染进 HTML，
// 所以没有 JS、爬虫抓取、首帧渲染时都能看到它，脚本只是接管而不是产生它。
// 数组不可为空、不可有空串，由 consts.test.ts 守着。
// 长度上限约两行：375px 屏一行放得下约 20 个汉字，Hero 给窄屏预留了两行高度，
// 再长就会挤到第三行、在打字过程中把整块文字顶动。
export const HERO_TAGLINES = [
  'Welcome to Howard Blog...',
  '把想清楚的事写下来，把写下来的事做出来。',
  '慢一点也没关系，只要还在往前走。',
];

// 社交/联系方式链接（留空的会自动隐藏）
export const SOCIAL = {
  // github 是个人主页，用于页脚和头像卡的社交图标
  github: 'https://github.com/zh-qdwl',
  // repo 是本博客的仓库地址，用于生成「开 Issue」链接。
  // 注意别和上面的个人主页搞混：主页拼 /issues 是打不开的。
  repo: 'https://github.com/zh-qdwl/zh-blog',
  email: '1498690097@qq.com',
  rss: '/rss.xml',
  // 下面三个留空则不显示
  gitee: '',
  juejin: '',
  csdn: '',
};

// 侧栏「我的小程序」入口。name 留空则整个 widget 不渲染。
//
// 刻意只放一句话 + 一个指向介绍文章的链接，**不放小程序码**：
// 码只在那篇文章里维护一处，换码时不用改两个地方；侧栏也不至于因为多出一张
// 二维码而变成广告位——它旁边还有 5 张内容卡片。
export const MINI_PROGRAM = {
  name: '昊玉工具箱',
  tagline: '六个高频小工具，打开即用、用完带走',
  /** 指向站内介绍文章，不是小程序本身（Web 页面无法直接唤起小程序） */
  href: '/blog/pocket-tools/',
};

// 评论系统。四档，改 provider 一行就切换，其余配置可以先留空。
//
//   'none'   → 文章底部与留言页渲染静态「交流」卡（当前）
//   'giscus' → GitHub Discussions。零后端，但访客必须有 GitHub 账号
//   'twikoo' → 需自建后端。倾向方案：Cloudflare Workers + D1 + R2，
//              步骤见 docs/comments-backend.md
//   'waline' → 需自建后端。作为 Twikoo 换肤不理想时的退路
//
// 必填字段由 consts.test.ts 守着：provider 不为 'none' 时对应那组不能留空。
// 少了这道守卫，填一半就上线只会在页面上留一块空白，构建不报错。
export type CommentProvider = 'none' | 'giscus' | 'twikoo' | 'waline';

export const COMMENTS = {
  provider: 'none' as CommentProvider,

  /** 文章页评论区懒加载：滚到附近才拉三方脚本。
      留言页不受它影响——评论区就是那一页的主体，永远立即加载。 */
  lazyOnPosts: true,

  giscus: {
    repo: '',
    repoId: '',
    category: '',
    categoryId: '',
  },

  twikoo: {
    /** 后端地址（Vercel / Cloudflare Worker）或腾讯云环境 ID */
    envId: '',
    /** 仅腾讯云需要填，Vercel / Cloudflare 一律留空 */
    region: '',
  },

  waline: {
    /** 后端地址，例如 https://xxx.vercel.app */
    serverURL: '',
  },
};
