# 博客视觉与结构改造设计

日期：2026-08-11
分支：`redesign-blog-style`

## 背景

现有博客是 Astro 5 起步模板：720px 单栏居中、GitHub 蓝强调色、纯边框文章列表、已有亮暗主题切换。骨架干净（CSS 变量集中、`data-theme` 切换已就位），但视觉上是默认样子。

用户指定两个参考站，它们的贡献不同：

- **blog.moewah.com**（Astro + Fuwari/Firefly 主题）贡献**结构**：顶部横幅、`[17.5rem | 1fr | 17.5rem]` 三列网格、卡片化列表、侧栏（头像卡/分类/标签）、文章页 TOC、错峰入场动画、搜索面板、归档时间线。
- **mars-coder.cn**（Vue SPA 导航站）贡献**配色气质**：金黄 `#fcd635` 主色、深墨前景 `#111827`、渐变按钮、高对比卡片。

## 目标

采用 moewah 的结构 + mars-coder 的金黄配色，同时不引入图片素材依赖、不引入前端框架、不牺牲无障碍对比度。

## 非目标（YAGNI）

- 不做 hue 色相滑块（moewah 有，但单人博客用不上，且会让配色失控）
- 不做三列布局（只有 3 篇文章，右侧栏会显得空）
- 不做真正的评论后端（本期只留接口）
- 不做 KaTeX、图片灯箱、友链页、赞助页

---

## 1. 色彩系统

`#fcd635` 亮度极高（相对亮度 0.690），当链接文字用对白底只有 **1.4:1**，远低于 WCAG AA 要求的 4.5:1。mars-coder 是把它当**按钮底色配深色文字**用的。因此拆成三个角色：

| 变量 | 亮色模式 | 暗色模式 | 用途 |
|---|---|---|---|
| `--brand` | `#fcd635` | `#fcd635` | 按钮底、标签底、hover 边框、置顶徽章、焦点轮廓 |
| `--brand-ink` | `#111827` | `#111827` | 覆盖在 `--brand` 之上的文字 |
| `--link` | `#8a6100` | `#fcd635` | 链接与强调文字 |

对比度验证（WCAG 2.1 相对亮度公式）：

| 组合 | 对比度 | AA 正文(4.5:1) |
|---|---|---|
| `--link` 亮色 `#8a6100` on `#ffffff` | 5.54:1 | 通过 |
| `--link` 暗色 `#fcd635` on `#14120e` | 13.2:1 | 通过 |
| `--brand-ink` on `--brand` | 12.5:1 | 通过 |
| `--text-soft` 亮色 `#6b6459` on `#ffffff` | 5.84:1 | 通过 |
| `--text-soft` 暗色 `#a8a096` on `#14120e` | 7.25:1 | 通过 |

中性色由冷灰（GitHub 蓝调）改为**暖灰**——暖中性配金黄才不显脏：

- 亮色：`--bg #ffffff`、`--bg-soft #faf9f5`、`--border #e8e4db`、`--text #1f2328`、`--text-soft #6b6459`
- 暗色：`--bg #14120e`、`--bg-soft #1c1913`、`--border #2b261d`、`--text #eae4d9`、`--text-soft #a8a096`

新增结构变量：`--radius-card: 16px`、`--maxw-page: 1200px`、`--maxw-prose: 720px`、`--sidebar-w: 260px`、`--toc-w: 240px`。

Shiki 主题保持 `github-light` / `github-dark` 不变（代码块换暖色主题会与正文抢注意力）。

## 2. 布局

`BaseLayout.astro` 增加 `layout` prop，三种模式共用一个文件：

| 模式 | 使用页面 | 结构 |
|---|---|---|
| `sidebar` | 首页、`/blog`、`/tags`、`/tags/[tag]`、`/categories*`、`/archive` | 总宽 1200px，`grid-template-columns: 260px 1fr`，gap 32px |
| `toc` | `/blog/[slug]` | `grid-template-columns: minmax(0,1fr) 240px`，正文限 `--maxw-prose` |
| `plain` | `/about`、`/guestbook`、`/404` | 居中 720px，无侧栏 |

响应式断点：

- `<1100px`：`toc` 模式的 TOC 隐藏（`display:none`），正文占满
- `<960px`：`sidebar` 模式转单列。侧栏内部用 `order` 重排——个人卡片移到内容**上方**，分类/标签卡片沉到内容**下方**
- `<640px`：Hero 高度降到 `240px`，导航链接收窄

## 3. Hero 横幅

零图片依赖，纯 CSS：

- 底：`linear-gradient(135deg, #fcd635, #f0a92e)` 金黄→琥珀
- 叠加：`repeating-linear-gradient` 细网格纹理（低透明度）+ 一层 `radial-gradient` 光晕
- 高度：`clamp(240px, 42vh, 400px)`。**刻意低于 moewah 的 65vh** ——文章少时满屏横幅会把列表推出首屏
- 内容：头像、站名、一句简介、社交图标、统计数字（文章数 / 标签数）
- 文字用 `--brand-ink`（12.5:1）
- 只在首页渲染

Hero 与侧栏的关系：Hero 是**通栏**元素，渲染在 `sidebar` 网格**之上**（不占网格列），因此它横跨整个视口宽度，下方才是 `260px | 1fr` 的两列区。实现上由 `BaseLayout` 提供一个 `hero` 命名 slot，位置在 `.page-grid` 之前。

头像：生成 `public/avatar.svg` 占位（字母 + 金色渐变底），`consts.ts` 加 `AVATAR = '/avatar.svg'` 常量，用户可随时替换为真实照片。

## 4. 内容 schema 扩展

`src/content.config.ts` 在现有字段（`title`/`description`/`pubDate`/`updatedDate`/`tags`/`draft`）之上新增：

```ts
category: z.string().default('未分类'),
cover:    z.string().optional(),
pinned:   z.boolean().default(false),
```

`cover` 可选是关键决策：有 `cover` 就渲染图片卡片，没有就用**按标题哈希取色的渐变色块**兜底，保证列表视觉整齐且不要求用户为每篇文章找图。

现有 3 篇文章补 `category`：`deploy-on-cloudflare.md` → 部署，`hello-world.md` → 随笔，`how-to-write-posts.md` → 教程。

## 5. 数据层：`src/lib/posts.ts`

现状问题：`index.astro`、`blog/index.astro`、`blog/[...slug].astro` 各自重复 `getCollection('blog', ({data}) => !data.draft)` 加排序。新增 6 个页面后这个重复会失控（例如某处忘了过滤 `draft`）。抽成单一模块：

```ts
getPublishedPosts()   // 过滤 draft + 按 pubDate 倒序，唯一数据入口
getSortedPosts()      // 置顶优先，其余按日期倒序（列表页用）
getCategories()       // [{ name, count }]，按 count 倒序
getTags()             // [{ name, count }]，按 count 倒序
getArchive()          // [{ year, posts[] }]，按年倒序
getStats()            // { postCount, tagCount, categoryCount }
```

所有页面只经由这个模块取数据，不再直接调 `getCollection`。

## 6. 组件

新增：

| 文件 | 职责 | 依赖 |
|---|---|---|
| `components/Hero.astro` | 首页渐变横幅 | `consts`、`getStats()` |
| `components/PostCard.astro` | 卡片式文章项，封面可选、置顶徽章 | props: post、index（用于动画错峰） |
| `components/Sidebar.astro` | 侧栏容器，组合下列 widget | 下列 widget |
| `components/widgets/ProfileCard.astro` | 头像 + 站名 + 简介 + 社交 | `consts` |
| `components/widgets/CategoryList.astro` | 分类及文章数，链到分类页 | `getCategories()` |
| `components/widgets/TagCloud.astro` | 标签云，链到标签页 | `getTags()` |
| `components/Toc.astro` | 目录 + 滚动高亮 + 回到顶部 | props: headings |
| `components/SearchPanel.astro` | 搜索弹层 | `/search.json` |
| `components/Comments.astro` | 评论区（本期为静态交流块） | `consts.COMMENTS` |

改造：`BaseLayout.astro`（加 `layout` prop）、`Header.astro`（新导航 + 搜索按钮）、`Footer.astro`（加归档/分类文字入口）。

## 7. 页面

导航栏（用户指定）：**首页 / 文章 / 标签 / 留言 / 关于** + 搜索图标 + 主题切换。

| 路由 | 说明 | 布局 |
|---|---|---|
| `/` | Hero + 置顶/最新文章卡片 | `sidebar` |
| `/blog` | 全部文章卡片 | `sidebar` |
| `/blog/[slug]` | 文章正文 + TOC + 评论区 | `toc` |
| `/tags` | 标签索引 | `sidebar` |
| `/tags/[tag]` | 该标签下文章 | `sidebar` |
| `/categories` | 分类索引 | `sidebar` |
| `/categories/[category]` | 该分类下文章 | `sidebar` |
| `/archive` | 按年份时间线 | `sidebar` |
| `/guestbook` | 留言页（静态交流块） | `plain` |
| `/about` | 关于（已存在，套新样式） | `plain` |
| `/404` | 已存在，套新样式 | `plain` |
| `/search.json` | 搜索索引端点 | — |

归档页与分类页**不进导航**，入口为：侧栏分类卡片直接点进分类页；侧栏统计的文章数点进归档页；页脚补一组文字链接兜底。

`[tag]` 与 `[category]` 路由需对中文做 `encodeURIComponent`，且 `getStaticPaths` 返回原始名称作为 param（Astro 自动处理编码）。

## 8. 评论：接口先行

用户选择了「不接评论系统」但同时选择了「文章底部也加评论区」——两者直接冲突。解决方式是**接口先行**：

`consts.ts` 新增配置：

```ts
export const COMMENTS = {
  provider: 'none',   // 'none' | 'giscus'
  giscus: { repo: '', repoId: '', category: '', categoryId: '' },
};
```

`Comments.astro` 按 provider 分支：

- `'none'`（本期）：渲染静态「交流」区块——邮箱链接 + GitHub Issues 链接 + 一句引导文案
- `'giscus'`（未来）：注入 giscus script，主题跟随 `data-theme`

同一组件同时用于文章页底部和 `/guestbook`。用户未来只需填配置即可点亮两处，无返工。

## 9. 搜索

零依赖，不加任何包。

- `src/pages/search.json.ts`：构建时输出数组，每项 `{ title, description, tags, category, url, text }`。`text` 为正文剥离 Markdown 语法（代码块、链接、标记符号）后的前 500 字
- 前端：`⌘K` / `Ctrl+K` 或点击导航放大镜唤起弹层
- **索引懒加载**：首次打开面板才 `fetch('/search.json')`，结果缓存在内存，不影响首屏
- 打分：标题命中 ×10，标签 ×5，简介 ×3，正文 ×1；子串匹配（中文无需分词），按总分倒序取前 10 条
- 交互：`↑`/`↓` 移动选中、`Enter` 跳转、`Esc` 关闭、点击遮罩关闭

3 篇文章时搜索意义有限，用户明确要求且代码量小，故本期实现以备后用。

## 10. 动效

- **入场**：卡片 `fade-up`（`translateY(12px)` → `0`，`opacity` 0 → 1），用 `animation-delay: calc(var(--i) * 60ms)` 按序号错峰，`--i` 由 `PostCard` 的 `index` prop 写入 inline style
- **hover**：卡片 `translateY(-2px)` + 边框变 `--brand` + 阴影加深
- **按下**：按钮 `transform: scale(0.97)`
- **降级**：默认写动效，末尾用一条 `@media (prefers-reduced-motion: reduce)` 规则统一将 `animation-duration`、`transition-duration` 置为 `0.01ms` 且 `animation-iteration-count: 1`（不用 `none`，避免依赖动画结束事件的元素卡在初始态）

## 11. 无障碍与性能

- 链接色分亮暗模式，对比度已在第 1 节逐项验证
- `:focus-visible` 统一金色轮廓（`outline: 2px solid var(--brand)`，`outline-offset: 2px`）
- 搜索弹层：`role="dialog"`、`aria-modal="true"`、打开时焦点移入输入框、关闭后焦点还原到触发按钮、`Esc` 关闭
- TOC 用 `<nav aria-label="目录">`，当前项 `aria-current="true"`
- 主题切换按钮保留现有 `aria-label`
- 零前端框架。JS 仅：主题切换（已存在）、搜索面板、TOC 滚动高亮。均为 `is:inline` 小脚本
- 保持纯静态输出，Cloudflare 部署方式不变

## 12. 测试与验收

本项目无测试框架，验收方式为构建 + 人工核对：

1. `npm run build` 零报错、零警告
2. 路由模板齐全：第 7 节表格中 11 条路由全部产出（其中动态路由按实际内容展开——3 篇文章、5 个标签、3 个分类），外加 `search.json`、`rss.xml`、`sitemap-index.xml`
3. `npm run preview` 后逐项核对：
   - 亮/暗模式切换无闪烁、无对比度过低文字
   - 首页 Hero 渐变正常、统计数字正确
   - 无 `cover` 的文章卡片显示渐变兜底色块
   - 侧栏分类/标签数量与实际文章一致
   - 中文标签页、分类页 URL 可正常访问
   - 文章页 TOC 滚动高亮跟随
   - `⌘K` 唤起搜索，能搜到 3 篇文章
   - 960px / 640px 断点下无横向滚动、侧栏重排正确
4. RSS 与 sitemap 仍然有效

## 实施顺序

1. 色彩系统与结构变量（`global.css`）
2. `content.config.ts` schema 扩展 + 3 篇文章补 `category`
3. `lib/posts.ts` 数据层
4. `BaseLayout` 三种布局模式 + `Header`/`Footer` 改造
5. `PostCard` + Hero + 侧栏 widget
6. 首页、`/blog` 套用新组件
7. 文章页 + `Toc` + `Comments`
8. `/tags`、`/categories`、`/archive`
9. `/guestbook`、`/about`、`/404` 样式对齐
10. `search.json` + `SearchPanel`
11. 动效与 `prefers-reduced-motion` 降级
12. 构建验收
