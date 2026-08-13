# 打磨清单

改造已合并（merge commit `46e1687`）。以下是终审列出但当时未做的项，按性价比排序。
每项都写了**在哪、为什么、怎么改**，可以单独挑一条来做，互不依赖。

来源：`docs/superpowers/specs/` 与 `docs/superpowers/plans/` 下两轮的设计与计划文档，
以及第二轮全范围终审的结论。

---

## A. 值得先做

### A1. 社交链接三处渲染器各写一套，新字段只在一处生效

**在哪**
- `src/components/widgets/ProfileCard.astro:5-12` —— 数据驱动，渲染全部 6 个（github / gitee / 掘金 / CSDN / email / RSS）
- `src/components/Hero.astro:20-34` —— 手写 3 个（github / email / RSS）
- `src/components/Footer.astro:16-18` —— 手写 3 个（github / email / RSS）

**为什么**
`src/consts.ts` 里的 `gitee` / `juejin` / `csdn` 目前是空字符串，填上之后只会出现在侧栏头像卡，
**首页 Hero 这个更显眼的位置看不到**。第二轮 spec 第 4.2 节写的是「侧栏 ProfileCard 与首页 Hero
共用这些字段」，实际只做了一半。

另外 `src/consts.ts:9` 的注释说 `AUTHOR_ROLE`（定义在 `:10`）「显示在首页作者卡与侧栏头像卡上」，
但全仓库只有 `ProfileCard.astro` 一个消费方 —— 注释与事实不符。

**怎么改**
把链接列表抽成单一数据源（`consts.ts` 里导出一个数组，或新建 `src/lib/social.ts`），
三处渲染器都 map 同一份数据。Hero 需要图标、页脚和侧栏用文字，所以数据里带上 `key`，
由各渲染器决定呈现方式。顺手修掉 `consts.ts:9` 的注释。

注意 `ProfileCard.astro:22` 的 `l.key === 'email' ? undefined : '_blank'` 会让同源的 `/rss.xml`
也带上 `target="_blank"`，开新标签有点怪，重构时一并理顺。

---

### A2. `--dur` / `--ease` 只落实了一半

**在哪**（5 处仍硬编码，未用统一令牌）

| 文件 | 值 |
|---|---|
| `src/pages/categories/index.astro:34` | `transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease` |
| `src/styles/base.css:18` | `background 0.2s ease, color 0.2s ease`（body 主题切换） |
| `src/styles/base.css:131` | `transform 0.12s ease, filter 0.15s ease`（`.btn`） |
| `src/styles/layout.css:123` | `color 0.15s ease, background 0.15s ease, border-color 0.15s ease`（`.icon-btn`） |
| `src/components/Comments.astro:72` | `border-color 0.15s ease, background 0.15s ease` |

**为什么**
第二轮 spec 第 3 节要求「统一 `--ease` 与 220ms」。`categories/index.astro:34` 那条尤其扎眼 ——
它是改造前 `.post-card` 的原始三连，导致分类页的卡片是全站唯一还在用旧曲线的卡片类元素，
和首页/列表页的卡片手感不一致。

**怎么改**
逐条换成 `var(--dur) var(--ease)`。body 的主题切换（`base.css:18`）可以保留 0.2s，
它不是交互反馈而是全局换肤，快一点更好；其余四处统一。

---

### A3. 侧栏入场错峰只覆盖 5 个 widget 中的 2 个

**在哪** `src/styles/motion.css:29-37`

```css
.sidebar > .card { animation: fade-up 0.5s ease both; }
.sidebar > .card:nth-child(2) { animation-delay: 80ms; }
.sidebar > .card:nth-child(3) { animation-delay: 160ms; }
```

**为什么**
侧栏现在有 5 个 widget（头像卡 / 分类 / 标签 / 作者精选 / 随机推荐）。
第 4、5 个的 `animation-delay` 是默认的 `0ms`，和头像卡同时淡入，错峰效果断在第三个之后。

**怎么改**
补 `:nth-child(4)` 240ms、`:nth-child(5)` 320ms 是最省事的。
但下次加第 6 个 widget 又会漏 —— 更彻底的做法是让 `Sidebar.astro` 给每个 widget
写一个 inline `--n` 序号（`PostCard` 的 `--i` 已经是这个模式），然后
`animation-delay: calc(var(--n, 0) * 80ms)`，一次解决。

---

## B. 结构与整洁

### B1. `contrast.ts` 只有测试在用，位置名不副实

**在哪** `src/lib/contrast.ts`

**为什么**
`grep` 显示它只被 `src/styles/tokens.test.ts` 引用，**零生产调用方**。
`src/lib/` 的定位是数据层（`posts-core` 纯函数 / `posts` 适配 `astro:content` / `markdown` / `home`），
把测试支撑代码放进去会让 `README.md` 对 `lib/` 的描述持续失准。
运行时无害（Astro 不会打包它），但会误导人。

**怎么改** 挪到 `src/test-utils/contrast.ts`，更新 `tokens.test.ts` 的 import 与 README。

---

### B2. 两处纯逻辑写在 `.astro` frontmatter 里，Vitest 够不着

**在哪**
- `src/pages/archive.astro` 的 `md()` —— 月日零填充
- `src/components/PostCard.astro:17-18` 的标题色相哈希

**为什么**
`vitest.config.ts` 只收 `src/**/*.test.ts`，`.astro` 文件里的函数没法被单测覆盖。
两者都有边界情况（补零、取模区间、空标题、非 BMP 码位）。
第二轮 spec 第 6 节明确说过「不重复该错误」，新逻辑（`filterFeatured` / `uptimeSince`）
都确实进了 `src/lib/` 并带测试 —— 这两个是第一轮的遗留。

**怎么改** 挪到 `src/lib/`（比如 `format.ts`），补测试。
`md()` 顺手把 B3 的时区问题一起修掉。

---

### B3. 日期用本地时区取值，而 `pubDate` 被解析为 UTC 午夜

**在哪** `src/lib/posts-core.ts` 的 `groupByYear`、`archive.astro` 的 `md()`、`src/components/FormattedDate.astro`

**为什么**
`z.coerce.date()` 把 `pubDate: 2026-01-01` 解析成 **UTC** 午夜，
但 `getFullYear()` / `getMonth()` / `getDate()` 读的是**本地**时区。
在负时区的构建机上，1 月 1 日的文章会被归到上一年的归档里，且显示为 `12-31`，
而它自己的 `datetime` 属性仍是 `2026-01-01` —— 自相矛盾。

今天不会触发（Cloudflare CI 是 UTC，你在 UTC+8），但这是真实的正确性缺口。

**怎么改** 换成 `getUTCFullYear()` / `getUTCMonth()` / `getUTCDate()`。
`posts-core.ts` 有测试，改完跑一遍就知道有没有破坏现有断言。

---

### B4. `getFeaturedPosts()` 无上限

**在哪** `src/lib/posts.ts` 的 `getFeaturedPosts()`

**为什么**
标记 30 篇 `featured`，侧栏就会长出 30 行编号列表，而侧栏出现在约 14 个页面上。
`RandomPosts` 已经加了 `slice(0, 12)` 上限，这个还没有。

**怎么改** 同样 `.slice(0, N)`，N 取 5 左右比较合理（「精选」本来就该少）。

---

## C. 可以不做

- ~~**兜底渐变第二档是 `hue + 14`**~~ —— 已随「无封面时的渐变兜底块」一起删除。
- ~~**`PostCard.astro` 的 `?? '·'` 兜底不可达**~~ —— 同上，水印逻辑已删除。
  （顺带解决了 B2 里「标题色相哈希写在 `.astro` frontmatter 里、Vitest 够不着」那半条。）
- **`rel="noopener"` 无条件加在 `mailto:` 与同源 `/rss.xml` 上** —— 惰性无害，
  会随 A1 的重构一起理顺。
- **卡片列表的 h1→h3 跳级** —— `PostCard` 固定用 `<h3>`，列表页从 `<h1>` 直接跳到 `<h3>`。
  改造前就存在。若要修，给 `PostCard` 加个 `headingLevel` prop。
- **无「跳至主内容」链接** —— 键盘用户到 `main` 要过 5 个导航链接 + 2 个按钮。
- **`giscus` 分支未接主题跟随** —— spec 说过「主题跟随 `data-theme`」但没实现。
  `COMMENTS.provider` 还是 `'none'`，等真要接 Giscus 时再补。
- **spec 第 3 节的「页面顶部天空渐变光晕」没做** —— 全仓库只有 `.hero` 内一处
  `radial-gradient`，没有页面级光晕。要么补上，要么从 spec 里划掉。

---

## D. 两条流程教训（值得记住）

### D1. 不要用 `opacity` 衰减文字

第二轮终审抓到的 Critical 就是这么来的：Hero 的 `.hero-stats a` 是链接，
`color: var(--brand-ink)` 配 `opacity: 0.8`，压在渐变暗端上实测只有 **3.34:1**，
远低于 4.5 红线。

漏网原因是三层叠加：
1. spec 的对比度表从没收录渐变端点 `--brand-strong`
2. `tokens.test.ts` 的配对表有 `[--brand-ink, --brand]` 却没有 `[--brand-ink, --brand-strong]`
3. 浏览器验证读的是 CSS **变量** —— 变量天生看不见渐变端点，也看不见 `opacity` 衰减后的合成色

**`opacity` 后的实际前景是浏览器合成出来的颜色，令牌系统、对比度测试、代码评审三层全都看不见它。**
改用不透明令牌（`--brand-ink-soft`）后，测试自动就守住了。

**规则：文字一律用不透明色值；任何渐变的每个端点都要进对比度配对表。**

### D2. 断言不要写在渲染出的 HTML 字面量上

这一轮有三处断言因此假失败：

| 断言写法 | 为什么失败 |
|---|---|
| `data-uptime-days>(\d+)<` | Astro 在有 `<style>` 的组件元素上注入 `data-astro-cid-*`，标签内不止一个属性 |
| `indexOf('post-card')` | 命中的是被内联进 `<head>` 的 CSS 选择器文本，不是真的 `<article>` |
| `<li><article` 紧邻 | `<li>` 上同样被注入了 `data-astro-cid-*` |

还有一处不是假失败而是**预测错了**：计划断定两个新 widget 在移动端会落在内容之后，
实测落在之前 —— `order` 相同时按 DOM 顺序排，而 `Sidebar` 渲染于 `.page-main` 之前。
这个只有真跑浏览器量几何才能发现。

**规则：断言行为（计算样式、几何位置、选择器计数），不要断言框架会重写的 HTML 子串。
断言 HTML 时先切到 `</head>` 之后，或用带引号的完整属性形式。**

---

## E. 一个可选的基建改进

`package.json` 没有类型检查步骤。`featured` 字段这轮需要手工同步到两处
（`src/content.config.ts` 的 schema 和 `src/lib/posts-core.ts` 的 `PostLike` 类型），
这种重复正是类型检查该管的事。

```bash
npm i -D @astrojs/check typescript
```

然后加 `"check": "astro check"`。**别加进 `build`** —— 类型错误不该阻塞部署。
