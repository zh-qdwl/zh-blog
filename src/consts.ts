// 站点全局配置：改这里就能改博客的标题、简介、导航、社交链接
export const SITE_TITLE = 'ZH 的博客';
export const SITE_DESCRIPTION = '记录编程、技术与思考。';
export const AUTHOR = 'ZH';

// 头像。默认是自动生成的字母占位图，换成自己的照片时把文件放进 public/ 再改这里。
export const AVATAR = '/avatar.svg';

// 顶部导航
export const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/blog', label: '文章' },
  { href: '/tags', label: '标签' },
  { href: '/guestbook', label: '留言' },
  { href: '/about', label: '关于' },
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
};

// 评论系统。
// provider = 'none'  → 文章底部和留言页渲染静态「交流」区块（当前）
// provider = 'giscus' → 接 GitHub Discussions，需先把仓库设为 public、
//                       开启 Discussions、安装 giscus app，然后填下面四项
export const COMMENTS = {
  provider: 'none' as 'none' | 'giscus',
  giscus: {
    repo: '',
    repoId: '',
    category: '',
    categoryId: '',
  },
};
