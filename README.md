# ZH 的博客

一个用 [Astro](https://astro.build) 搭建的简洁现代博客，部署在 Cloudflare Pages 上。

## 本地开发

```bash
npm install      # 安装依赖（只需第一次）
npm run dev      # 启动本地预览，打开 http://localhost:4321
npm run build    # 生成静态站点到 dist/
npm run preview  # 预览构建结果
npm test         # 运行单元测试（纯数据层 lib/、样式变量 tokens.css 等）
```

## 目录结构

```
src/
├── consts.ts          # 站点标题、导航、社交链接（先改这里，含 SITE_START 建站日期、
                        # AUTHOR_ROLE 身份描述，gitee/juejin/csdn 等可选社交字段，
                        # 以及首页整屏 Hero 的 HERO_IMAGE / HERO_FOCUS / HERO_TAGLINES）
├── content/blog/      # 所有文章（Markdown），新增文章就放这里
├── content.config.ts  # 文章字段定义
├── components/        # 页头、页脚、文章卡片等组件
│   └── comments/      # 评论区：四档 provider 各一个组件 + 共用的联系方式链接
├── layouts/            # 页面骨架
├── lib/                # 数据层：读取/排序/分组文章供页面和搜索索引复用，
                        # 也含 contrast.ts 这类配色对比度计算的纯函数
├── pages/              # 路由页面，见下方「页面路由」
└── styles/             # tokens（配色变量）/ base（重置与排版）/ layout（网格与断点）
                        # / motion（入场动效）/ comments（三方评论 widget 的外观映射）
                        # global.css 只是汇总引入以上五个文件
public/               # 静态资源（favicon、首页整屏 Hero 的底图等）
astro.config.mjs      # 站点地址 site、集成配置
```

### 页面路由

- `/`、`/blog`、`/blog/[slug]` —— 首页、文章列表、文章详情
- `/tags`、`/tags/[tag]` —— 标签总览、单个标签下的文章
- `/categories`、`/categories/[category]` —— 分类总览、单个分类下的文章
- `/archive` —— 按年份归档
- `/guestbook` —— 留言（评论系统见下方「打开留言功能」）
- `/about` —— 关于
- `/rss.xml`、`/search.json` —— RSS 订阅、站内搜索用的数据接口
- `/404` —— 404 页

## 第一次使用要改的地方

1. `src/consts.ts` —— 站点标题、你的名字、GitHub / 邮箱链接
2. `astro.config.mjs` —— 把 `site` 改成你的正式网址
3. `src/content/blog/` —— 删掉示例文章，写你自己的

## 打开留言功能

`/guestbook` 与文章底部的评论区共用 `src/consts.ts` 的 `COMMENTS` 配置，四档：

| provider | 说明 |
|---|---|
| `'none'`（当前） | 渲染一张「发邮件 / 开 Issue」的静态卡片，不需要任何后端 |
| `'giscus'` | GitHub Discussions。零后端，但访客必须有 GitHub 账号 |
| `'twikoo'` | 需自建后端。推荐 Cloudflare Workers + D1，步骤见 `docs/comments-backend.md` |
| `'waline'` | 需自建后端。作为 Twikoo 换肤不理想时的退路 |

改 `provider` 一行就切换，对应那组配置填上即可——`npm test` 会检查启用的那档
必填字段没有留空（填一半的话构建不报错，页面上只是一块空白）。

文章页的评论区默认懒加载（滚到附近才拉三方脚本），由 `COMMENTS.lazyOnPosts`
控制；留言页始终立即加载。

## 换首页的整屏底图

把新图放进 `public/`，改 `src/consts.ts` 的 `HERO_IMAGE` 指向它即可。三点注意：

- **跟着改 `HERO_TONE`**。它决定 Hero 上用深字还是白字：浅色底图填 `'light'`，
  暗色底图填 `'dark'`。反了会直接掉到 2:1 以下，肉眼可见地读不出来。拿不准就量一下：
  ```bash
  node -e "require('sharp')('public/你的图.webp').stats().then(s=>console.log(s.channels.slice(0,3).map(c=>Math.round(c.mean)).join(',')))"
  ```
  三个值都偏高（>170）就选 `'light'`。

- **控制体积**。它是首页的 LCP 元素，建议 1920 宽、WebP、300KB 以内。仓库里装了 sharp
  （Astro 的依赖），可以直接压：
  ```bash
  node -e "require('sharp')('原图.jpg').resize({width:1920}).webp({quality:72}).toFile('public/hero.webp')"
  ```
- **必要时调 `HERO_FOCUS`**。竖屏会把宽图裁成一条窄带，默认居中常常正好切掉主体；
  这个值就是 CSS 的 `object-position`，改它把主体挪回可见区。

文字压在图上的可读性不依赖"这张图够暗/够亮"——`--hero-scrim` 遮罩负责兜底，
`tokens.test.ts` 按各自的最坏底图守着：白字那套算"底图纯白"，深字那套算"底图纯黑"。
所以只要 `HERO_TONE` 填对，换任何图都不会掉对比度。

## 写新文章

在 `src/content/blog/` 下新建 `.md` 文件即可，详见示例文章《如何写一篇新文章》。

## 部署

见随项目附带的《Cloudflare 部署教程》，或文章《把博客部署到 Cloudflare Pages》。
