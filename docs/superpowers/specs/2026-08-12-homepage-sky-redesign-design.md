# 首页天空配色改造设计

日期：2026-08-12
分支：`redesign-blog-style`（延续上一轮改造）
参考站：https://liuyuyang.net/

## 背景

上一轮改造已完成（23 commits），采用 mars-coder 的金黄配色 + moewah 的结构。用户随后提出更喜欢 liuyuyang.net 的风格，希望**先改首页**。

对参考站的实测（Next.js + Tailwind v4，客户端渲染，配色写在 utility class 里而非 CSS 变量）：

| 手法 | 用量 | 说明 |
|---|---|---|
| `transition` | 217 处 | 极度动效导向 |
| `box-shadow` | 90 处 | 强层次与悬浮感 |
| `linear-gradient` | 55 处 | 大量渐变 |
| `backdrop-filter` | 25 处 | 真磨砂玻璃 |
| `aspect-ratio` / `line-clamp` | 5 / 8 | 固定比例封面图 + 文字截断 |

其首页自上而下：横幅图 → 站名 → 运行时间条 → 作者卡（头像/身份/多社交图标）→ 封面图文章卡列表 → 分页；侧栏为 最新评论 / 学习 / 随机推荐 / 作者精选。

**用户明确选择：要「天空的色调」以及参考站的手法**——不是照搬其冷石板灰蓝，而是天空系。

## 目标

1. 全站配色由暖金黄换为天空蓝，中性色由暖灰换回冷灰
2. 首页引入参考站的视觉手法：磨砂玻璃、渐变、强阴影、密集过渡
3. 首页新增运行时间条、升级作者卡、封面图为主的大卡片
4. 侧栏新增随机推荐与作者精选

## 非目标（明确不做，附原因）

- **最新评论 widget** —— 站点为纯静态，`COMMENTS.provider` 仍为 `'none'`，没有评论数据源。未来接 Giscus 后可另议。
- **阅读量** —— 静态站无法计数，需接统计服务。不为了视觉效果放假数字。
- **横幅背景图** —— 延续上一轮「零图片素材依赖」的约束，Hero 继续用纯 CSS 渐变。
- **分页** —— 只有 3 篇文章，YAGNI。
- 不改文章详情页、归档页、留言页、关于页的结构（配色会随 tokens 自动跟随）。

---

## 1. 配色系统

**天空蓝与金黄是同一类陷阱**：亮天蓝 `#38bdf8` 在白底上作文字仅 **2.14:1**。因此上一轮建立的三角色拆分必须保留，不是可选项。

以下全部为实测值（WCAG 2.1 相对亮度公式）：

| 变量 | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--brand` | `#38bdf8` | `#38bdf8` | **仅**背景、渐变、边框、徽章 |
| `--brand-strong` | `#0284c7` | `#0284c7` | 渐变末端，制造天空纵深 |
| `--brand-ink` | `#0b1b2b` | `#0b1b2b` | 覆盖在 `--brand` 之上的文字 |
| `--brand-soft` | `rgba(56,189,248,0.16)` | `rgba(56,189,248,0.14)` | 标签底、hover 底 |
| `--link` | `#0369a1` | `#38bdf8` | 链接与强调文字 |

冷中性色（由上一轮的暖灰换回）：

| 变量 | 亮色 | 暗色 |
|---|---|---|
| `--bg` | `#ffffff` | `#0b1220` |
| `--bg-soft` | `#f6f8fb` | `#131c2e` |
| `--card` | `#ffffff` | `#111a2b` |
| `--border` | `#e3e8ef` | `#1f2a3d` |
| `--text` | `#1f2328` | `#e2e8f0` |
| `--text-soft` | `#5b6b7f` | `#93a1b5` |
| `--code-bg` | `#f6f8fa` | `#131c2e` |

对比度验证：

| 组合 | 实测 | AA(4.5:1) |
|---|---|---|
| `--link` 亮 `#0369a1` on `#ffffff` | 5.93:1 | 通过 |
| `--link` 暗 `#38bdf8` on `#0b1220` | 8.74:1 | 通过 |
| `--brand-ink` on `--brand` | 8.13:1 | 通过 |
| `--text` 亮 on `--bg` | 15.8:1 | 通过 |
| `--text` 暗 `#e2e8f0` on `#0b1220` | 15.19:1 | 通过 |
| `--text-soft` 亮 `#5b6b7f` on `#ffffff` | 5.45:1 | 通过 |
| `--text-soft` 暗 `#93a1b5` on `#0b1220` | 7.14:1 | 通过 |

对照：`--brand` 直接当白底文字 2.14:1（故禁用），`sky-600 #0284c7` 当文字 4.1:1（差 0.4，故不选作 `--link`）。

**范围说明**：颜色集中在 `src/styles/tokens.css`，改一处整站跟随。因此「只改首页」对配色不适用——这是集中管理的必然结果，改动小但范围骗不了人。

## 2. 令牌测试改为断言不变量

上一轮的 `src/styles/tokens.test.ts` 断言 25 个**字面十六进制值**。全分支终审已指出这是「变更检测器」：它把 `tokens.css` 抄了第二遍，任何有意的调色都会以「值不对」失败，而真正的红线（对比度 ≥ 4.5:1）没有任何自动化保障。

本次换色恰好证实了这一点——25 条断言全部需要重写。

**改法**：解析 tokens 值后断言**计算出的 WCAG 对比度**，而非字面值：

- `contrast(--link, --bg) >= 4.5`（亮、暗两套）
- `contrast(--brand-ink, --brand) >= 4.5`
- `contrast(--text, --bg) >= 4.5`（亮、暗）
- `contrast(--text-soft, --bg) >= 4.5`（亮、暗）
- `contrast(--text-soft, --card) >= 4.5`（亮、暗）
- 保留两条字面断言锁住角色契约本身（而非具体色值）：亮暗两个块都必须声明 `--brand`、`--brand-ink`、`--link` 三个变量，缺任何一个即失败
- 保留并沿用已扩面的守卫：递归扫描 `src/` 下所有 `.css`/`.astro`，禁止 `color: var(--brand)`

这样以后调整天空色相不必改测试，且测试会因正确的理由失败。相对亮度换算逻辑抽到 `src/lib/contrast.ts`（纯函数，可单测）。

## 3. 视觉手法

新增令牌，供磨砂与层次使用：

- `--glass-bg`：亮 `rgba(255,255,255,0.62)` / 暗 `rgba(17,26,43,0.58)`
- `--glass-border`：亮 `rgba(255,255,255,0.7)` / 暗 `rgba(255,255,255,0.08)`
- `--blur`：`14px`
- `--shadow-glass`：柔和大扩散阴影
- `--ease`：`cubic-bezier(0.22, 1, 0.36, 0.18)` 统一过渡曲线

手法约定：

- **磨砂玻璃**用于首页大卡片与作者卡：`background: var(--glass-bg)` + `backdrop-filter: blur(var(--blur))` + 1px 亮边。必须提供 `@supports not (backdrop-filter: blur(1px))` 回退为实色 `--card`。
- **渐变**：页面顶部一层天空渐变光晕（`--brand` → 透明），卡片 hover 时边框渐变加亮。
- **阴影**：静态 `--shadow`，hover 升为 `--shadow-glass`。
- **过渡**：统一 `--ease` 与 220ms；全部受既有 `prefers-reduced-motion` 降级覆盖（`motion.css` 已有 `*` 规则，无需新增）。

**约束**：`--brand` 仍只作背景；磨砂层上的文字必须验证对比度（磨砂是半透明，实测取其在最坏背景下的等效值）。

## 4. 首页区块

### 4.1 运行时间条
`consts.ts` 新增 `SITE_START = '2026-08-09'`。渲染「本站已运行 X 天 Y 小时」，客户端 `is:inline` 脚本每分钟刷新一次。位置：Hero 下方，通栏细条，磨砂底。

### 4.2 作者卡升级
`consts.ts` 新增 `AUTHOR_ROLE`（一句身份描述）。`SOCIAL` 已有 github/repo/email/rss；新增可选 `gitee`、`juejin`、`csdn`，留空自动隐藏。侧栏 `ProfileCard` 与首页 Hero 共用这些字段。

### 4.3 封面图为主的大卡片
`PostCard.astro` 新增 `variant?: 'compact' | 'feature'`，默认 `'compact'`（现有横向卡，`/blog`、标签页、分类页继续用）。**仅首页**传 `variant="feature"`：

- 封面区 `aspect-ratio: 16 / 9`，圆角，位于文字上方（纵向堆叠）
- 标题 1 行 `line-clamp`，摘要 2 行 `line-clamp`
- 元信息：日期 · 分类 · 标签
- 磨砂卡体 + hover 抬升
- 有 `cover` 用图，无 `cover` 走升级后的兜底（见 4.5）

### 4.4 侧栏新增两个 widget
- **随机推荐**：服务端渲染全部候选（当前 3 篇，量极小），客户端脚本在加载时随机抽**至多 3 条**显示。这样每次访问都不同，而非每次部署才变一次。
  坦白讲，现在总共只有 3 篇文章，「随机抽至多 3 条」实际等于打乱顺序，widget 意义有限——与搜索同理，先按用户要求实现，文章变多后自然有用。
- **作者精选**：`content.config.ts` 新增 `featured: z.boolean().default(false)`。列出 `featured` 的文章，带序号。若无任何文章标记，整个 widget 不渲染（不留空壳）。

### 4.5 封面兜底升级
现状是按标题哈希取琥珀色渐变（色相 28–58）。改为：天空色系渐变（色相锁定在 190–215 的天蓝区间，与主色同族）+ 叠加分类名首字大字水印 + 细网格纹理。目标是无图也成立，用户后续补 `cover` 即自动切换为图片，无需改代码。

**注意此项是全站生效的**：兜底色相写在 `PostCard.astro` 里，`compact` 与 `feature` 两种变体共用，因此 `/blog`、标签页、分类页的无图卡片也会一并从琥珀变天蓝。这是必要的——留着琥珀兜底配天空主色会直接打架。

## 5. 内容 schema

`src/content.config.ts` 新增一个字段：

```ts
featured: z.boolean().default(false),
```

现有 3 篇文章无需改动（有默认值）。为验证 4.4 的精选 widget，将 `deploy-on-cloudflare.md` 标记 `featured: true`。

## 6. 不改动的部分

`posts-core.ts` / `posts.ts` 的现有函数、`BaseLayout` 的三种布局、Header、Footer、`/blog`、标签页、分类页、归档页、留言页、关于页、404、搜索、TOC、评论组件——结构一律不动，仅随 tokens 变色。

新增的纯逻辑（随机抽取、精选筛选、运行时长计算）放入 `src/lib/`，不写在 `.astro` frontmatter 里——终审已指出 `archive.astro` 的 `md()` 与 `PostCard` 的色相哈希因位于 frontmatter 而无法被 Vitest 覆盖，本次不重复该错误。

## 7. 验收

1. `npm run build` 零报错，仍 19 页
2. `npm test` 全绿，且**新增的对比度不变量测试确实会因低对比度而失败**（用临时改坏一个值来证明其有效性）
3. 浏览器实测（沿用上一轮方法，读计算样式而非截图，因面板不合成帧）：
   - 亮/暗两套所有文字对比度 ≥ 4.5:1
   - 磨砂回退在 `@supports` 不支持时为实色
   - 1280 / 900 / 375px 三档无横向溢出，侧栏重排仍正确
   - 首页大卡 `aspect-ratio` 与 `line-clamp` 生效
   - 运行时间条数字正确、随机推荐每次刷新不同、精选 widget 列出 `featured` 文章
4. `--brand` 未被用作任何 `color:` 值（既有守卫覆盖 `src/` 全部 `.css`/`.astro`）

## 实施顺序

1. `src/lib/contrast.ts` + 单测；`tokens.test.ts` 改为断言对比度不变量（先立好护栏，再换色）
2. `tokens.css` 换天空配色与冷中性色 + 新增磨砂/过渡令牌
3. schema 加 `featured`，标记一篇；`consts.ts` 加 `SITE_START`/`AUTHOR_ROLE`/可选社交
4. `src/lib/home.ts`（随机抽取、精选筛选、运行时长）+ 单测
5. 封面兜底升级（`PostCard` 的渐变改天空色系 + 分类水印）
6. `PostCard` 加 `variant="feature"`，首页启用
7. 运行时间条 + 作者卡升级
8. 侧栏随机推荐 + 作者精选 widget
9. 磨砂/渐变/阴影/过渡的手法落地
10. 构建与浏览器验收
