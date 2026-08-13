# 博客视觉与结构改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有 Astro 起步模板改造成 blog.moewah.com 式结构（横幅 + 侧栏 + 卡片 + TOC + 归档 + 搜索）配 mars-coder.cn 式金黄配色，全程不引入前端框架、不引入图片素材依赖。

**Architecture:** 数据查询收口到 `src/lib/`，其中纯计算函数抽到不依赖 `astro:content` 的 `posts-core.ts` 以便单元测试；布局由 `BaseLayout` 的 `layout` prop 驱动三种网格模式；共享样式放 `src/styles/` 三个文件，组件私有样式用 Astro 的 scoped `<style>` 与组件同文件。

**Tech Stack:** Astro 5.13 · TypeScript · 原生 CSS（CSS 变量 + Grid）· Vitest（仅 devDependency，用于纯函数）· 零运行时依赖

## Global Constraints

- **不新增任何运行时依赖。** Vitest 只进 `devDependencies`，不得出现在构建产物里。
- **不引入前端框架**（React/Vue/Svelte 一律不装）。交互只用 `is:inline` 原生脚本。
- **不引入图片素材依赖。** Hero 用纯 CSS 渐变；文章封面 `cover` 为可选，缺失时用 CSS 渐变兜底。
- **对比度红线：** 正文与链接文字对背景不低于 **4.5:1**。`#fcd635` 只能作背景色，其上文字必须用 `--brand-ink`。
- **保持纯静态输出**，不改 `astro.config.mjs` 的部署形态。
- **中文优先**：所有面向用户的文案、注释用简体中文。
- 颜色值一律引用 `var(--*)`，禁止在组件里写死十六进制色值（Hero 的渐变除外，它引用 `--brand`/`--brand-strong`）。
- 每个任务结束必须 `npm run build` 通过（零报错）才能提交。

## 对 spec 的一处细化

Spec 第 5 节规划了单个 `src/lib/posts.ts`。实施时拆为两个文件：

- `src/lib/posts-core.ts` — 纯函数，**不 import `astro:content`**，因此可用 Vitest 直接测
- `src/lib/posts.ts` — 薄封装，import `astro:content` 后调用 core

原因：`astro:content` 是 Astro 构建期虚拟模块，在 Vitest 里不可用。不拆开则数据层（排序、分组、计数——最容易出 bug 的部分）完全无法自动化测试。对外 API 与 spec 一致。

## File Structure

| 文件 | 状态 | 职责 |
|---|---|---|
| `package.json` | 改 | 加 vitest devDep + `test` 脚本 |
| `vitest.config.ts` | 新 | 只跑 `src/**/*.test.ts` |
| `src/lib/posts-core.ts` | 新 | 纯计算：过滤/排序/分组/计数 |
| `src/lib/posts-core.test.ts` | 新 | 上者的单元测试 |
| `src/lib/posts.ts` | 新 | `astro:content` 薄封装 |
| `src/lib/markdown.ts` | 新 | 纯函数：剥离 Markdown 语法、截断 |
| `src/lib/markdown.test.ts` | 新 | 上者的单元测试 |
| `src/consts.ts` | 改 | 加 `AVATAR`、`COMMENTS`、改 `NAV_LINKS` |
| `src/content.config.ts` | 改 | schema 加 `category`/`cover`/`pinned` |
| `src/content/blog/*.md` (3 个) | 改 | 补 `category` |
| `public/avatar.svg` | 新 | 字母头像占位 |
| `src/styles/tokens.css` | 新 | 全部 CSS 变量（亮+暗） |
| `src/styles/base.css` | 新 | 重置、排版、`.prose`、`.tag`、focus |
| `src/styles/layout.css` | 新 | `.page`、`.page-grid`、header、footer、断点 |
| `src/styles/motion.css` | 新 | 入场动画 + `prefers-reduced-motion` 降级 |
| `src/styles/global.css` | 改 | 退化为 4 条 `@import` |
| `src/layouts/BaseLayout.astro` | 改 | `layout` prop 三模式 + `hero`/`toc` 命名 slot |
| `src/components/Header.astro` | 改 | 新导航 + 搜索按钮 |
| `src/components/Footer.astro` | 改 | 加归档/分类文字入口 |
| `src/components/Hero.astro` | 新 | 通栏渐变横幅 |
| `src/components/PostCard.astro` | 新 | 文章卡片（封面可选、置顶徽章） |
| `src/components/Sidebar.astro` | 新 | 侧栏容器 |
| `src/components/widgets/ProfileCard.astro` | 新 | 头像卡 |
| `src/components/widgets/CategoryList.astro` | 新 | 分类 + 计数 |
| `src/components/widgets/TagCloud.astro` | 新 | 标签云 |
| `src/components/Toc.astro` | 新 | 目录 + 滚动高亮 + 回顶 |
| `src/components/SearchPanel.astro` | 新 | ⌘K 搜索弹层 |
| `src/components/Comments.astro` | 新 | 评论区（本期静态） |
| `src/pages/index.astro` | 改 | Hero + 卡片 |
| `src/pages/blog/index.astro` | 改 | 卡片列表 |
| `src/pages/blog/[...slug].astro` | 改 | TOC + 评论 |
| `src/pages/tags/index.astro` | 新 | 标签索引 |
| `src/pages/tags/[tag].astro` | 新 | 标签归类 |
| `src/pages/categories/index.astro` | 新 | 分类索引 |
| `src/pages/categories/[category].astro` | 新 | 分类归类 |
| `src/pages/archive.astro` | 新 | 年份时间线 |
| `src/pages/guestbook.astro` | 新 | 留言页 |
| `src/pages/about.astro` | 改 | 套新布局 |
| `src/pages/404.astro` | 改 | 套新布局 |
| `src/pages/search.json.ts` | 新 | 搜索索引端点 |
| `src/pages/rss.xml.js` | 改 | 改用 `getPublishedPosts()` |

---

### Task 1: 测试基建与纯数据层

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/posts-core.ts`
- Test: `src/lib/posts-core.test.ts`

**Interfaces:**
- Consumes: 无（首个任务）
- Produces: 类型 `PostLike`、`Counted = {name:string;count:number}`、`ArchiveGroup<T> = {year:number;posts:T[]}`、`Stats = {postCount:number;tagCount:number;categoryCount:number}`；函数 `filterPublished`、`sortByDate`、`sortPinnedFirst`、`groupByCategory`、`groupByTag`、`groupByYear`、`computeStats`

- [ ] **Step 1: 装 Vitest 并加脚本**

Run:
```bash
npm install -D vitest@^3.2.4
```

然后把 `package.json` 的 `scripts` 改成（新增最后一行 `test`）：

```json
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "test": "vitest run"
  },
```

- [ ] **Step 2: 写 vitest 配置**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

// 只跑纯 TS 单元测试。.astro 组件不在这里测，靠 npm run build + 产物断言验证。
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: 写失败的测试**

Create `src/lib/posts-core.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  filterPublished,
  sortByDate,
  sortPinnedFirst,
  groupByCategory,
  groupByTag,
  groupByYear,
  computeStats,
  type PostLike,
} from './posts-core';

function post(over: Partial<PostLike['data']> & { title: string }): PostLike {
  return {
    id: over.title,
    data: {
      description: '描述',
      pubDate: new Date('2026-01-01'),
      tags: [],
      category: '未分类',
      pinned: false,
      draft: false,
      ...over,
    },
  };
}

describe('filterPublished', () => {
  it('剔除草稿', () => {
    const posts = [post({ title: 'A' }), post({ title: 'B', draft: true })];
    expect(filterPublished(posts).map((p) => p.data.title)).toEqual(['A']);
  });
});

describe('sortByDate', () => {
  it('按发布日期倒序', () => {
    const posts = [
      post({ title: '旧', pubDate: new Date('2026-01-01') }),
      post({ title: '新', pubDate: new Date('2026-08-01') }),
    ];
    expect(sortByDate(posts).map((p) => p.data.title)).toEqual(['新', '旧']);
  });

  it('不修改入参数组', () => {
    const posts = [
      post({ title: '旧', pubDate: new Date('2026-01-01') }),
      post({ title: '新', pubDate: new Date('2026-08-01') }),
    ];
    sortByDate(posts);
    expect(posts.map((p) => p.data.title)).toEqual(['旧', '新']);
  });
});

describe('sortPinnedFirst', () => {
  it('置顶优先，组内按日期倒序', () => {
    const posts = [
      post({ title: '普通新', pubDate: new Date('2026-08-01') }),
      post({ title: '置顶旧', pubDate: new Date('2026-01-01'), pinned: true }),
      post({ title: '置顶新', pubDate: new Date('2026-06-01'), pinned: true }),
    ];
    expect(sortPinnedFirst(posts).map((p) => p.data.title)).toEqual([
      '置顶新',
      '置顶旧',
      '普通新',
    ]);
  });
});

describe('groupByCategory', () => {
  it('按文章数倒序统计分类', () => {
    const posts = [
      post({ title: 'A', category: '教程' }),
      post({ title: 'B', category: '教程' }),
      post({ title: 'C', category: '随笔' }),
    ];
    expect(groupByCategory(posts)).toEqual([
      { name: '教程', count: 2 },
      { name: '随笔', count: 1 },
    ]);
  });
});

describe('groupByTag', () => {
  it('展开并统计标签', () => {
    const posts = [
      post({ title: 'A', tags: ['部署', 'Cloudflare'] }),
      post({ title: 'B', tags: ['部署'] }),
    ];
    expect(groupByTag(posts)).toEqual([
      { name: '部署', count: 2 },
      { name: 'Cloudflare', count: 1 },
    ]);
  });

  it('无标签文章不产生条目', () => {
    expect(groupByTag([post({ title: 'A' })])).toEqual([]);
  });
});

describe('groupByYear', () => {
  it('按年份倒序分组，组内按日期倒序', () => {
    const posts = [
      post({ title: '2025', pubDate: new Date('2025-05-01') }),
      post({ title: '2026-01', pubDate: new Date('2026-01-01') }),
      post({ title: '2026-08', pubDate: new Date('2026-08-01') }),
    ];
    const groups = groupByYear(posts);
    expect(groups.map((g) => g.year)).toEqual([2026, 2025]);
    expect(groups[0].posts.map((p) => p.data.title)).toEqual(['2026-08', '2026-01']);
  });
});

describe('computeStats', () => {
  it('统计文章数、标签数、分类数（去重）', () => {
    const posts = [
      post({ title: 'A', tags: ['x', 'y'], category: '教程' }),
      post({ title: 'B', tags: ['x'], category: '随笔' }),
    ];
    expect(computeStats(posts)).toEqual({
      postCount: 2,
      tagCount: 2,
      categoryCount: 2,
    });
  });
});
```

- [ ] **Step 4: 运行测试确认失败**

Run: `npm test`
Expected: FAIL — 报错 `Failed to resolve import "./posts-core"`（文件还不存在）

- [ ] **Step 5: 实现 posts-core.ts**

Create `src/lib/posts-core.ts`:

```ts
// 纯计算函数：不 import astro:content，因此可以被 Vitest 直接测试。
// 需要读取内容集合的封装在 ./posts.ts。

/** 结构上兼容 CollectionEntry<'blog'> 的最小形状 */
export type PostLike = {
  id: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    updatedDate?: Date;
    tags: string[];
    category: string;
    cover?: string;
    pinned: boolean;
    draft: boolean;
  };
};

export type Counted = { name: string; count: number };
export type ArchiveGroup<T> = { year: number; posts: T[] };
export type Stats = { postCount: number; tagCount: number; categoryCount: number };

/** 剔除草稿 */
export function filterPublished<T extends PostLike>(posts: T[]): T[] {
  return posts.filter((p) => !p.data.draft);
}

/** 按发布日期倒序（返回新数组，不改入参） */
export function sortByDate<T extends PostLike>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** 置顶优先，其余按日期倒序 */
export function sortPinnedFirst<T extends PostLike>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  });
}

/** 计数并按 count 倒序；count 相同按名称的中文排序 */
function countBy(names: string[]): Counted[] {
  const map = new Map<string, number>();
  for (const name of names) map.set(name, (map.get(name) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
}

export function groupByCategory(posts: PostLike[]): Counted[] {
  return countBy(posts.map((p) => p.data.category));
}

export function groupByTag(posts: PostLike[]): Counted[] {
  return countBy(posts.flatMap((p) => p.data.tags));
}

/** 按年份倒序分组，组内按日期倒序 */
export function groupByYear<T extends PostLike>(posts: T[]): ArchiveGroup<T>[] {
  const map = new Map<number, T[]>();
  for (const p of sortByDate(posts)) {
    const year = p.data.pubDate.getFullYear();
    const bucket = map.get(year);
    if (bucket) bucket.push(p);
    else map.set(year, [p]);
  }
  return [...map.entries()]
    .map(([year, posts]) => ({ year, posts }))
    .sort((a, b) => b.year - a.year);
}

export function computeStats(posts: PostLike[]): Stats {
  return {
    postCount: posts.length,
    tagCount: groupByTag(posts).length,
    categoryCount: groupByCategory(posts).length,
  };
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npm test`
Expected: PASS — 9 个测试全绿

- [ ] **Step 7: 确认 vitest 没进运行时依赖**

Run:
```bash
node -e "const p=require('./package.json'); if(p.dependencies && p.dependencies.vitest){console.error('FAIL: vitest 进了 dependencies');process.exit(1)} if(!p.devDependencies || !p.devDependencies.vitest){console.error('FAIL: vitest 不在 devDependencies');process.exit(1)} console.log('PASS')"
```
Expected: `PASS`

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/posts-core.ts src/lib/posts-core.test.ts
git commit -m "feat: 加入 Vitest 与纯数据层 posts-core"
```

---

### Task 2: 内容 schema 扩展与站点配置

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/content/blog/deploy-on-cloudflare.md:1-6`
- Modify: `src/content/blog/hello-world.md:1-6`
- Modify: `src/content/blog/how-to-write-posts.md:1-6`
- Modify: `src/consts.ts`
- Create: `src/lib/posts.ts`
- Create: `public/avatar.svg`
- Modify: `src/pages/rss.xml.js`

**Interfaces:**
- Consumes: Task 1 的 `filterPublished`、`sortByDate`、`sortPinnedFirst`、`groupByCategory`、`groupByTag`、`groupByYear`、`computeStats`
- Produces:
  - `src/lib/posts.ts` 导出 `type Post = CollectionEntry<'blog'>`，以及 async 函数 `getPublishedPosts(): Promise<Post[]>`、`getSortedPosts(): Promise<Post[]>`、`getCategories(): Promise<Counted[]>`、`getTags(): Promise<Counted[]>`、`getArchive(): Promise<ArchiveGroup<Post>[]>`、`getStats(): Promise<Stats>`
  - `src/consts.ts` 导出 `AVATAR: string`、`COMMENTS: { provider: 'none' | 'giscus'; giscus: {...} }`，`NAV_LINKS` 变为 5 项
  - frontmatter 新增可用字段 `category`、`cover`、`pinned`

- [ ] **Step 1: 扩展 content schema**

Modify `src/content.config.ts` — 把 `schema` 换成：

```ts
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    // 分类：一篇文章只属于一个分类，缺省归入「未分类」
    category: z.string().default('未分类'),
    // 封面图可选。缺省时列表卡片用 CSS 渐变兜底，不强制每篇配图。
    cover: z.string().optional(),
    // 置顶：列表页排在最前
    pinned: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
```

- [ ] **Step 2: 给 3 篇现有文章补 category**

`src/content/blog/deploy-on-cloudflare.md` 的 frontmatter 改为：

```yaml
---
title: 把博客部署到 Cloudflare Pages
description: GitHub 连接 Cloudflare Pages，推送即自动上线，全程免费。
pubDate: 2026-08-09
category: 部署
tags: ['部署', 'Cloudflare']
---
```

`src/content/blog/hello-world.md` 的 frontmatter 改为：

```yaml
---
title: 你好，世界 —— 我的第一篇博客
description: 用这篇文章测试博客的排版效果，也顺便记录一下开始写博客的初衷。
pubDate: 2026-08-11
category: 随笔
tags: ['随笔']
pinned: true
---
```

`src/content/blog/how-to-write-posts.md` 的 frontmatter 改为：

```yaml
---
title: 如何写一篇新文章
description: 三步搞定：新建 Markdown 文件、填写文章信息、写正文。
pubDate: 2026-08-10
category: 教程
tags: ['教程', '指南']
---
```

（`hello-world` 设为置顶，用于验证置顶徽章与排序确实生效。）

- [ ] **Step 3: 更新站点配置**

Modify `src/consts.ts` — 整个文件替换为：

```ts
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
  github: 'https://github.com/zh-qdwl',
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
```

注意 `SOCIAL.email` 现在是裸邮箱，页脚原本直接 `href={SOCIAL.email}` 是坏链接。后续 Task 4 会改为 `mailto:` 前缀。

- [ ] **Step 4: 写 astro:content 封装层**

Create `src/lib/posts.ts`:

```ts
import { getCollection, type CollectionEntry } from 'astro:content';
import {
  filterPublished,
  sortByDate,
  sortPinnedFirst,
  groupByCategory,
  groupByTag,
  groupByYear,
  computeStats,
  type ArchiveGroup,
  type Counted,
  type Stats,
} from './posts-core';

export type Post = CollectionEntry<'blog'>;

/** 全站唯一的文章数据入口：已剔除草稿，按日期倒序 */
export async function getPublishedPosts(): Promise<Post[]> {
  return sortByDate(filterPublished(await getCollection('blog')));
}

/** 列表页用：置顶优先，其余按日期倒序 */
export async function getSortedPosts(): Promise<Post[]> {
  return sortPinnedFirst(filterPublished(await getCollection('blog')));
}

export async function getCategories(): Promise<Counted[]> {
  return groupByCategory(await getPublishedPosts());
}

export async function getTags(): Promise<Counted[]> {
  return groupByTag(await getPublishedPosts());
}

export async function getArchive(): Promise<ArchiveGroup<Post>[]> {
  return groupByYear(await getPublishedPosts());
}

export async function getStats(): Promise<Stats> {
  return computeStats(await getPublishedPosts());
}
```

- [ ] **Step 5: 生成头像占位图**

Create `public/avatar.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="头像">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fcd635"/>
      <stop offset="1" stop-color="#f0a92e"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="64" fill="url(#g)"/>
  <text x="64" y="64" fill="#111827" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="700" text-anchor="middle" dominant-baseline="central">ZH</text>
</svg>
```

- [ ] **Step 6: RSS 改用统一数据层**

Modify `src/pages/rss.xml.js` — 整个文件替换为：

```js
import rss from '@astrojs/rss';
import { getPublishedPosts } from '../lib/posts';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

export async function GET(context) {
  const posts = await getPublishedPosts();
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
    })),
  });
}
```

- [ ] **Step 7: 构建验证**

Run: `npm run build`
Expected: 构建成功，无 schema 校验错误

- [ ] **Step 8: 断言 schema 与头像生效**

Run:
```bash
node -e "
const fs=require('fs');
const rss=fs.readFileSync('dist/rss.xml','utf8');
if(!rss.includes('如何写一篇新文章')){console.error('FAIL: RSS 缺文章');process.exit(1)}
if(!fs.existsSync('dist/avatar.svg')){console.error('FAIL: 头像未产出');process.exit(1)}
console.log('PASS');
"
```
Expected: `PASS`

- [ ] **Step 9: 单元测试仍通过**

Run: `npm test`
Expected: PASS — 9 个测试全绿（本任务未改 posts-core）

- [ ] **Step 10: Commit**

```bash
git add src/content.config.ts src/content/blog src/consts.ts src/lib/posts.ts public/avatar.svg src/pages/rss.xml.js
git commit -m "feat: schema 加 category/cover/pinned，数据层与站点配置就位"
```

---

### Task 3: 设计令牌与基础样式

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: 无
- Produces: CSS 变量 `--brand`、`--brand-strong`、`--brand-ink`、`--brand-soft`、`--link`、`--bg`、`--bg-soft`、`--card`、`--border`、`--text`、`--text-soft`、`--code-bg`、`--shadow`、`--shadow-lift`、`--radius`、`--radius-card`、`--maxw-page`、`--maxw-prose`、`--sidebar-w`、`--toc-w`、`--font-sans`、`--font-mono`；工具类 `.tag`、`.tag-lg`、`.btn`、`.card`、`.section-title`、`.prose`

- [ ] **Step 1: 写设计令牌**

Create `src/styles/tokens.css`:

```css
/* ===== 设计令牌：改这里就能改整站视觉 ===== */
:root {
  /* 品牌色：金黄取自 mars-coder.cn。
     注意 --brand 亮度极高（对白底仅 1.4:1），只能作背景，
     其上文字必须用 --brand-ink。文字/链接用 --link。 */
  --brand: #fcd635;
  --brand-strong: #f0a92e;
  --brand-ink: #111827;
  --brand-soft: rgba(252, 214, 53, 0.18);

  /* 链接色：亮色模式用深琥珀（对白底 5.54:1，过 WCAG AA） */
  --link: #8a6100;

  /* 暖中性色：暖灰配金黄才不显脏 */
  --bg: #ffffff;
  --bg-soft: #faf9f5;
  --card: #ffffff;
  --border: #e8e4db;
  --text: #1f2328;
  --text-soft: #6b6459;
  --code-bg: #f6f8fa;

  --shadow: 0 1px 3px rgba(31, 35, 40, 0.06), 0 1px 2px rgba(31, 35, 40, 0.04);
  --shadow-lift: 0 8px 24px rgba(31, 35, 40, 0.1);

  /* 结构 */
  --radius: 12px;
  --radius-card: 16px;
  --maxw-page: 1200px;
  --maxw-prose: 720px;
  --sidebar-w: 260px;
  --toc-w: 240px;

  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', Roboto, Helvetica, Arial, sans-serif;
  --font-mono: 'SFMono-Regular', 'JetBrains Mono', Menlo, Consolas, monospace;
}

:root[data-theme='dark'] {
  /* 暗色模式下亮黄对暖炭灰底 13.2:1，可以直接当链接色 */
  --link: #fcd635;
  --brand-soft: rgba(252, 214, 53, 0.14);

  --bg: #14120e;
  --bg-soft: #1c1913;
  --card: #1a1712;
  --border: #2b261d;
  --text: #eae4d9;
  --text-soft: #a8a096;
  --code-bg: #1c1913;

  --shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  --shadow-lift: 0 8px 24px rgba(0, 0, 0, 0.55);
}
```

- [ ] **Step 2: 写基础样式**

Create `src/styles/base.css`:

```css
/* ===== 重置 ===== */
* {
  box-sizing: border-box;
}
html {
  scroll-behavior: smooth;
  /* 锚点跳转时给固定头部留位置 */
  scroll-padding-top: 76px;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
  transition: background 0.2s ease, color 0.2s ease;
}

a {
  color: var(--link);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

h1, h2, h3, h4 {
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: -0.01em;
}

img {
  max-width: 100%;
  height: auto;
}

hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2rem 0;
}

/* 键盘焦点统一金色轮廓 */
:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
  border-radius: 4px;
}

/* ===== 工具类 ===== */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow);
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--link);
  font-size: 0.78rem;
  line-height: 1.6;
}
a.tag:hover {
  background: var(--brand);
  color: var(--brand-ink);
  text-decoration: none;
}

/* 索引页用的大号标签 */
.tag-lg {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 0.95rem;
}
.tag-lg:hover {
  background: var(--brand);
  border-color: var(--brand);
  color: var(--brand-ink);
  text-decoration: none;
}
.tag-lg .count {
  color: var(--text-soft);
  font-size: 0.8rem;
}
.tag-lg:hover .count {
  color: var(--brand-ink);
  opacity: 0.7;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 999px;
  background: var(--brand);
  color: var(--brand-ink);
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.12s ease, filter 0.15s ease;
}
.btn:hover {
  filter: brightness(1.05);
  text-decoration: none;
}
.btn:active {
  transform: scale(0.97);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-soft);
  margin: 0 0 16px;
}
/* 标题左侧的金色短杠 */
.section-title::before {
  content: '';
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--brand);
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--text-soft);
}

/* ===== 文章正文 ===== */
.prose {
  font-size: 1.02rem;
}
.prose h2 {
  margin-top: 2em;
  font-size: 1.5rem;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border);
}
.prose h3 {
  margin-top: 1.6em;
  font-size: 1.2rem;
}
.prose p,
.prose ul,
.prose ol {
  margin: 1em 0;
}
.prose img {
  border-radius: var(--radius);
}
.prose code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--code-bg);
  padding: 0.15em 0.4em;
  border-radius: 5px;
}
.prose pre {
  padding: 16px;
  border-radius: var(--radius);
  overflow-x: auto;
  border: 1px solid var(--border);
  font-size: 0.88rem;
}
.prose pre code {
  background: transparent;
  padding: 0;
}
/* Shiki 双主题：暗色模式下切到 github-dark */
:root[data-theme='dark'] .astro-code,
:root[data-theme='dark'] .astro-code span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}
.prose blockquote {
  margin: 1.2em 0;
  padding: 0.4em 1.2em;
  border-left: 3px solid var(--brand);
  color: var(--text-soft);
  background: var(--bg-soft);
  border-radius: 0 8px 8px 0;
}
.prose table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.2em 0;
  font-size: 0.92rem;
}
.prose th,
.prose td {
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
}
.prose th {
  background: var(--bg-soft);
}
/* 正文里的标题锚点：给 TOC 滚动定位留出头部高度 */
.prose :is(h2, h3, h4) {
  scroll-margin-top: 76px;
}
```

- [ ] **Step 3: global.css 退化为入口**

Modify `src/styles/global.css` — 整个文件替换为：

```css
/* 样式入口。具体规则按职责拆到下面几个文件：
   tokens  = CSS 变量（配色、尺寸、字体）
   base    = 重置、排版、工具类、.prose
   layout  = 页面网格、头部、页脚、响应式断点
   motion  = 入场动画与 prefers-reduced-motion 降级
   组件私有样式写在各自 .astro 的 <style> 里（Astro 自动 scoped）。 */
@import './tokens.css';
@import './base.css';
@import './layout.css';
@import './motion.css';
```

⚠️ 此时 `layout.css` 与 `motion.css` 还不存在，构建会失败。同一任务的下一步先建占位，Task 4 与 Task 12 再填内容。

- [ ] **Step 4: 建 layout.css 与 motion.css 占位**

Create `src/styles/layout.css`:

```css
/* 页面网格、头部、页脚、响应式断点。内容在 Task 4 填入。 */
```

Create `src/styles/motion.css`:

```css
/* 入场动画与 prefers-reduced-motion 降级。内容在 Task 12 填入。 */
```

- [ ] **Step 5: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 6: 断言令牌已进产物**

Run:
```bash
node -e "
const fs=require('fs');
const dir='dist/_astro';
const css=fs.readdirSync(dir).filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(dir+'/'+f,'utf8')).join('');
for (const token of ['--brand:#fcd635','--link:#8a6100','--maxw-page:1200px']) {
  if(!css.replace(/\s/g,'').includes(token)){console.error('FAIL: 缺少 '+token);process.exit(1)}
}
console.log('PASS');
"
```
Expected: `PASS`

- [ ] **Step 7: Commit**

```bash
git add src/styles
git commit -m "feat: 金黄配色令牌与基础样式，CSS 按职责拆分"
```

---

### Task 4: 布局骨架（三模式 + 头部 + 页脚）

**Files:**
- Modify: `src/styles/layout.css`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/Header.astro`
- Modify: `src/components/Footer.astro`
- Create: `src/components/Sidebar.astro`

**Interfaces:**
- Consumes: Task 2 的 `NAV_LINKS`、`SOCIAL`、`SITE_TITLE`；Task 3 的全部 CSS 变量
- Produces:
  - `BaseLayout` 接受 props `{ title?: string; description?: string; layout?: 'sidebar' | 'toc' | 'plain' }`（默认 `'plain'`），并提供命名 slot `hero` 与 `toc`
  - `Sidebar.astro` 无 props，内部渲染 widget（本任务先渲染空容器，Task 5 填内容）
  - CSS 类 `.page`、`.page-grid`、`.layout-sidebar`、`.layout-toc`、`.layout-plain`、`.page-main`、`.sidebar`、`.site-header`、`.site-footer`

- [ ] **Step 1: 写布局样式**

Modify `src/styles/layout.css` — 整个文件替换为：

```css
/* ===== 页面容器与网格 ===== */
.page {
  max-width: var(--maxw-page);
  margin: 0 auto;
  padding: 0 20px;
}

main {
  min-height: calc(100vh - 60px - 140px);
  padding: 32px 0 64px;
}

.page-grid {
  display: grid;
  gap: 32px;
  align-items: start;
}
.layout-sidebar {
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
}
.layout-toc {
  grid-template-columns: minmax(0, 1fr) var(--toc-w);
}
.layout-plain {
  grid-template-columns: minmax(0, 1fr);
  max-width: var(--maxw-prose);
  margin: 0 auto;
}
.page-main {
  min-width: 0; /* 防止长代码块把网格撑破 */
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 76px;
}

/* ===== 顶部导航 ===== */
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: saturate(180%) blur(12px);
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  border-bottom: 1px solid var(--border);
}
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  gap: 16px;
}
.nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--text);
  white-space: nowrap;
}
.nav-brand:hover {
  text-decoration: none;
  color: var(--link);
}
/* 品牌名前的金色方块 */
.nav-brand::before {
  content: '';
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.nav-links::-webkit-scrollbar {
  display: none;
}
.nav-links a {
  color: var(--text-soft);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.95rem;
  white-space: nowrap;
}
.nav-links a:hover {
  color: var(--text);
  background: var(--bg-soft);
  text-decoration: none;
}
.nav-links a[aria-current='page'] {
  color: var(--text);
  font-weight: 600;
  background: var(--brand-soft);
}
.nav-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}
.icon-btn:hover {
  color: var(--text);
  background: var(--bg-soft);
  border-color: var(--brand);
}

/* ===== 页脚 ===== */
.site-footer {
  border-top: 1px solid var(--border);
  padding: 32px 0;
  color: var(--text-soft);
  font-size: 0.88rem;
}
.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.footer-links,
.footer-social {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.footer-links a,
.footer-social a {
  color: var(--text-soft);
}
.footer-links a:hover,
.footer-social a:hover {
  color: var(--link);
  text-decoration: none;
}

/* ===== 响应式 ===== */
/* TOC 空间不足时隐藏，正文占满 */
@media (max-width: 1100px) {
  .layout-toc {
    grid-template-columns: minmax(0, 1fr);
  }
  .toc {
    display: none;
  }
}

/* 侧栏转单列：display:contents 让 widget 变成网格直接子项，
   再用 order 把个人卡片提到内容上方、分类标签压到内容下方 */
@media (max-width: 960px) {
  .layout-sidebar {
    grid-template-columns: minmax(0, 1fr);
  }
  .sidebar {
    display: contents;
  }
  .page-main {
    order: 0;
  }
  .sidebar > .widget-profile {
    order: -1;
  }
  .sidebar > .widget-category,
  .sidebar > .widget-tags {
    order: 1;
  }
}

@media (max-width: 640px) {
  .page {
    padding: 0 16px;
  }
  main {
    padding: 20px 0 48px;
  }
  .nav-links a {
    padding: 6px 8px;
    font-size: 0.9rem;
  }
  .footer-inner {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

- [ ] **Step 2: 改造 BaseLayout**

Modify `src/layouts/BaseLayout.astro` — 整个文件替换为：

```astro
---
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import Sidebar from '../components/Sidebar.astro';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';
import '../styles/global.css';

interface Props {
  title?: string;
  description?: string;
  /** sidebar = 左侧栏 + 内容；toc = 内容 + 右目录；plain = 居中单栏 */
  layout?: 'sidebar' | 'toc' | 'plain';
}
const { title, description, layout = 'plain' } = Astro.props;
const pageTitle = title ? `${title} · ${SITE_TITLE}` : SITE_TITLE;
const pageDesc = description ?? SITE_DESCRIPTION;
const canonical = new URL(Astro.url.pathname, Astro.site);
---

<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{pageTitle}</title>
    <meta name="description" content={pageDesc} />
    <link rel="canonical" href={canonical} />
    <link rel="alternate" type="application/rss+xml" title={SITE_TITLE} href="/rss.xml" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={pageDesc} />
    <meta name="generator" content={Astro.generator} />
    <!-- 进入页面前先设置主题，避免深浅色闪烁 -->
    <script is:inline>
      const t = localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', t);
    </script>
  </head>
  <body>
    <Header />
    <main>
      <div class="page">
        <!-- Hero 是通栏元素，渲染在网格之上，不占网格列 -->
        <slot name="hero" />
        <div class={`page-grid layout-${layout}`}>
          {layout === 'sidebar' && <Sidebar />}
          <div class="page-main"><slot /></div>
          {layout === 'toc' && <slot name="toc" />}
        </div>
      </div>
    </main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 3: 建侧栏容器**

Create `src/components/Sidebar.astro`:

```astro
---
// 侧栏容器。widget 在 Task 5 接入。
---

<aside class="sidebar">
  <slot />
</aside>
```

- [ ] **Step 4: 改造头部导航**

Modify `src/components/Header.astro` — 整个文件替换为：

```astro
---
import { SITE_TITLE, NAV_LINKS } from '../consts';

// 高亮当前页：/blog/xxx 也要点亮「文章」，所以用前缀匹配（首页除外）
const path = Astro.url.pathname;
function isCurrent(href: string): boolean {
  if (href === '/') return path === '/';
  return path === href || path.startsWith(`${href}/`);
}
---

<header class="site-header">
  <div class="page nav">
    <a href="/" class="nav-brand">{SITE_TITLE}</a>
    <nav class="nav-links" aria-label="主导航">
      {NAV_LINKS.map((link) => (
        <a href={link.href} aria-current={isCurrent(link.href) ? 'page' : undefined}>
          {link.label}
        </a>
      ))}
    </nav>
    <div class="nav-actions">
      <button id="search-open" class="icon-btn" aria-label="搜索文章">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
      </button>
      <button id="theme-toggle" class="icon-btn" aria-label="切换深浅色">
        <svg id="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
        <svg id="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
      </button>
    </div>
  </div>
</header>

<script is:inline>
  const toggle = document.getElementById('theme-toggle');
  const sun = document.getElementById('icon-sun');
  const moon = document.getElementById('icon-moon');
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (sun && moon) {
      sun.style.display = theme === 'dark' ? 'none' : 'block';
      moon.style.display = theme === 'dark' ? 'block' : 'none';
    }
  }
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  apply(stored || (prefersDark ? 'dark' : 'light'));
  toggle?.addEventListener('click', () => {
    const next =
      document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'light'
        : 'dark';
    localStorage.setItem('theme', next);
    apply(next);
  });
</script>
```

注：`#search-open` 按钮此刻还没有绑定行为，Task 11 接入 `SearchPanel` 后生效。

- [ ] **Step 5: 改造页脚**

Modify `src/components/Footer.astro` — 整个文件替换为：

```astro
---
import { AUTHOR, SOCIAL } from '../consts';
const year = new Date().getFullYear();
---

<footer class="site-footer">
  <div class="page footer-inner">
    <span>© {year} {AUTHOR}. Built with Astro.</span>
    <!-- 归档与分类不进导航，这里做文字入口兜底 -->
    <div class="footer-links">
      <a href="/archive">归档</a>
      <a href="/categories">分类</a>
      <a href="/tags">标签</a>
    </div>
    <div class="footer-social">
      {SOCIAL.github && <a href={SOCIAL.github} target="_blank" rel="noopener">GitHub</a>}
      {SOCIAL.email && <a href={`mailto:${SOCIAL.email}`}>Email</a>}
      {SOCIAL.rss && <a href={SOCIAL.rss}>RSS</a>}
    </div>
  </div>
</footer>
```

- [ ] **Step 6: 让现有页面用上新布局**

Modify `src/pages/about.astro` — 把第 6 行的 `<BaseLayout title="关于" description="关于我">` 改为：

```astro
<BaseLayout title="关于" description="关于我" layout="plain">
```

Modify `src/pages/404.astro` — 把第 5 行的 `<BaseLayout title="页面走丢了">` 改为：

```astro
<BaseLayout title="页面走丢了" layout="plain">
```

Modify `src/pages/blog/index.astro` — 把 `<BaseLayout title="全部文章" description="所有博客文章列表">` 改为：

```astro
<BaseLayout title="全部文章" description="所有博客文章列表" layout="sidebar">
```

（首页与文章页在 Task 7、8 整体重写，此处不动。）

- [ ] **Step 7: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 8: 断言布局与导航生效**

Run:
```bash
node -e "
const fs=require('fs');
const blog=fs.readFileSync('dist/blog/index.html','utf8');
if(!blog.includes('page-grid layout-sidebar')){console.error('FAIL: blog 页缺 layout-sidebar');process.exit(1)}
if(!blog.includes('class=\"sidebar\"')){console.error('FAIL: blog 页缺侧栏');process.exit(1)}
if(!blog.includes('aria-current=\"page\"')){console.error('FAIL: 导航未高亮当前页');process.exit(1)}
if(!blog.includes('href=\"/archive\"')){console.error('FAIL: 页脚缺归档入口');process.exit(1)}
if(!blog.includes('mailto:')){console.error('FAIL: 页脚邮箱未加 mailto');process.exit(1)}
if(!blog.includes('id=\"search-open\"')){console.error('FAIL: 缺搜索按钮');process.exit(1)}
const about=fs.readFileSync('dist/about/index.html','utf8');
if(!about.includes('page-grid layout-plain')){console.error('FAIL: about 页缺 layout-plain');process.exit(1)}
console.log('PASS');
"
```
Expected: `PASS`

- [ ] **Step 9: Commit**

```bash
git add src/styles/layout.css src/layouts/BaseLayout.astro src/components src/pages/about.astro src/pages/404.astro src/pages/blog/index.astro
git commit -m "feat: BaseLayout 三种布局模式，头部导航与页脚改造"
```

---

### Task 5: Hero 横幅与侧栏 widget

**Files:**
- Create: `src/components/Hero.astro`
- Create: `src/components/widgets/ProfileCard.astro`
- Create: `src/components/widgets/CategoryList.astro`
- Create: `src/components/widgets/TagCloud.astro`
- Modify: `src/components/Sidebar.astro`

**Interfaces:**
- Consumes: Task 2 的 `getStats`、`getCategories`、`getTags`、`AVATAR`、`SITE_TITLE`、`SITE_DESCRIPTION`、`AUTHOR`、`SOCIAL`
- Produces: `<Hero />`（无 props，只在首页用，须放进 `slot="hero"`）；`<Sidebar />` 内部固定渲染 ProfileCard + CategoryList + TagCloud，外层类名分别为 `.widget-profile`、`.widget-category`、`.widget-tags`（供 960px 断点重排）

- [ ] **Step 1: 写 Hero**

Create `src/components/Hero.astro`:

```astro
---
import { SITE_TITLE, SITE_DESCRIPTION, AVATAR, SOCIAL } from '../consts';
import { getStats } from '../lib/posts';

const stats = await getStats();
---

<section class="hero">
  <div class="hero-inner">
    <img class="hero-avatar" src={AVATAR} alt="头像" width="88" height="88" loading="eager" />
    <div class="hero-text">
      <h1>{SITE_TITLE}</h1>
      <p class="hero-desc">{SITE_DESCRIPTION}</p>
      <div class="hero-stats">
        <a href="/archive"><strong>{stats.postCount}</strong> 篇文章</a>
        <a href="/categories"><strong>{stats.categoryCount}</strong> 个分类</a>
        <a href="/tags"><strong>{stats.tagCount}</strong> 个标签</a>
      </div>
      <div class="hero-social">
        {SOCIAL.github && (
          <a href={SOCIAL.github} target="_blank" rel="noopener" aria-label="GitHub">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49v-1.9c-2.78.62-3.37-1.2-3.37-1.2-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.57 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.4 9.4 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9v2.82c0 .27.18.59.69.49A10.06 10.06 0 0 0 22 12.25C22 6.58 17.52 2 12 2z"></path></svg>
          </a>
        )}
        {SOCIAL.email && (
          <a href={`mailto:${SOCIAL.email}`} aria-label="Email">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"></rect><path d="M3 6.5l9 6 9-6"></path></svg>
          </a>
        )}
        {SOCIAL.rss && (
          <a href={SOCIAL.rss} aria-label="RSS">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1.5" fill="currentColor"></circle></svg>
          </a>
        )}
      </div>
    </div>
  </div>
</section>

<style>
  /* 纯 CSS 渐变横幅，零图片依赖 */
  .hero {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-card);
    margin-bottom: 32px;
    min-height: clamp(240px, 42vh, 400px);
    display: flex;
    align-items: center;
    color: var(--brand-ink);
    background:
      radial-gradient(120% 130% at 12% 18%, rgba(255, 255, 255, 0.5), transparent 58%),
      linear-gradient(135deg, var(--brand), var(--brand-strong));
  }
  /* 细网格纹理 */
  .hero::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      repeating-linear-gradient(0deg, rgba(17, 24, 39, 0.05) 0 1px, transparent 1px 32px),
      repeating-linear-gradient(90deg, rgba(17, 24, 39, 0.05) 0 1px, transparent 1px 32px);
  }
  .hero-inner {
    position: relative;
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 40px 36px;
    flex-wrap: wrap;
  }
  .hero-avatar {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.7);
    box-shadow: 0 4px 16px rgba(17, 24, 39, 0.18);
    flex-shrink: 0;
  }
  .hero-text {
    min-width: 0;
  }
  .hero h1 {
    margin: 0 0 8px;
    font-size: clamp(1.7rem, 4vw, 2.5rem);
  }
  .hero-desc {
    margin: 0 0 16px;
    font-size: 1.05rem;
    opacity: 0.85;
  }
  .hero-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    font-size: 0.9rem;
    margin-bottom: 16px;
  }
  .hero-stats a {
    color: var(--brand-ink);
    opacity: 0.8;
  }
  .hero-stats a:hover {
    opacity: 1;
    text-decoration: none;
  }
  .hero-stats strong {
    font-size: 1.15rem;
  }
  .hero-social {
    display: flex;
    gap: 12px;
  }
  .hero-social a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(17, 24, 39, 0.08);
    color: var(--brand-ink);
    transition: background 0.15s ease, transform 0.15s ease;
  }
  .hero-social a:hover {
    background: rgba(17, 24, 39, 0.16);
    transform: translateY(-2px);
  }

  @media (max-width: 640px) {
    .hero {
      min-height: 240px;
    }
    .hero-inner {
      padding: 28px 22px;
      gap: 16px;
    }
    .hero-avatar {
      width: 64px;
      height: 64px;
    }
  }
</style>
```

- [ ] **Step 2: 写头像卡 widget**

Create `src/components/widgets/ProfileCard.astro`:

```astro
---
import { AUTHOR, SITE_DESCRIPTION, AVATAR, SOCIAL } from '../../consts';
---

<div class="card widget widget-profile">
  <img class="avatar" src={AVATAR} alt="头像" width="72" height="72" loading="lazy" />
  <p class="name">{AUTHOR}</p>
  <p class="bio">{SITE_DESCRIPTION}</p>
  <div class="links">
    {SOCIAL.github && <a href={SOCIAL.github} target="_blank" rel="noopener">GitHub</a>}
    {SOCIAL.email && <a href={`mailto:${SOCIAL.email}`}>Email</a>}
    {SOCIAL.rss && <a href={SOCIAL.rss}>RSS</a>}
  </div>
</div>

<style>
  .widget-profile {
    padding: 24px 20px;
    text-align: center;
  }
  .avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    border: 2px solid var(--brand);
  }
  .name {
    margin: 12px 0 4px;
    font-weight: 700;
    font-size: 1.05rem;
  }
  .bio {
    margin: 0 0 16px;
    color: var(--text-soft);
    font-size: 0.88rem;
  }
  .links {
    display: flex;
    justify-content: center;
    gap: 14px;
    font-size: 0.85rem;
  }
</style>
```

- [ ] **Step 3: 写分类 widget**

Create `src/components/widgets/CategoryList.astro`:

```astro
---
import { getCategories } from '../../lib/posts';
const categories = await getCategories();
---

<div class="card widget widget-category">
  <p class="widget-title">分类</p>
  <ul>
    {categories.map((c) => (
      <li>
        <a href={`/categories/${encodeURIComponent(c.name)}/`}>
          <span class="name">{c.name}</span>
          <span class="count">{c.count}</span>
        </a>
      </li>
    ))}
  </ul>
</div>

<style>
  .widget-category {
    padding: 20px;
  }
  .widget-title {
    margin: 0 0 12px;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--text-soft);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  li a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 8px;
    color: var(--text);
    font-size: 0.92rem;
  }
  li a:hover {
    background: var(--brand-soft);
    text-decoration: none;
  }
  .count {
    flex-shrink: 0;
    min-width: 22px;
    text-align: center;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--bg-soft);
    color: var(--text-soft);
    font-size: 0.75rem;
  }
</style>
```

- [ ] **Step 4: 写标签云 widget**

Create `src/components/widgets/TagCloud.astro`:

```astro
---
import { getTags } from '../../lib/posts';
const tags = await getTags();
---

<div class="card widget widget-tags">
  <p class="widget-title">标签</p>
  <div class="cloud">
    {tags.map((t) => (
      <a class="tag" href={`/tags/${encodeURIComponent(t.name)}/`}>{t.name}</a>
    ))}
  </div>
</div>

<style>
  .widget-tags {
    padding: 20px;
  }
  .widget-title {
    margin: 0 0 12px;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--text-soft);
  }
  .cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
```

- [ ] **Step 5: 侧栏接入 widget**

Modify `src/components/Sidebar.astro` — 整个文件替换为：

```astro
---
import ProfileCard from './widgets/ProfileCard.astro';
import CategoryList from './widgets/CategoryList.astro';
import TagCloud from './widgets/TagCloud.astro';
---

<aside class="sidebar">
  <ProfileCard />
  <CategoryList />
  <TagCloud />
</aside>
```

- [ ] **Step 6: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 7: 断言侧栏统计正确**

现有 3 篇文章应产出 3 个分类（部署/随笔/教程）和 5 个标签（部署/Cloudflare/随笔/教程/指南）。

Run:
```bash
node -e "
const fs=require('fs');
const h=fs.readFileSync('dist/blog/index.html','utf8');
for (const cls of ['widget-profile','widget-category','widget-tags']) {
  if(!h.includes(cls)){console.error('FAIL: 缺 '+cls);process.exit(1)}
}
for (const name of ['部署','随笔','教程','Cloudflare','指南']) {
  if(!h.includes(name)){console.error('FAIL: 侧栏缺 '+name);process.exit(1)}
}
const catLinks=(h.match(/href=\"\/categories\/[^\"]+\/\"/g)||[]).length;
if(catLinks!==3){console.error('FAIL: 分类链接数应为 3，实际 '+catLinks);process.exit(1)}
const tagLinks=(h.match(/href=\"\/tags\/[^\"]+\/\"/g)||[]).length;
if(tagLinks!==5){console.error('FAIL: 标签链接数应为 5，实际 '+tagLinks);process.exit(1)}
console.log('PASS');
"
```
Expected: `PASS`

- [ ] **Step 8: Commit**

```bash
git add src/components/Hero.astro src/components/widgets src/components/Sidebar.astro
git commit -m "feat: CSS 渐变 Hero 横幅与侧栏 widget"
```

---

### Task 6: 文章卡片

**Files:**
- Create: `src/components/PostCard.astro`

**Interfaces:**
- Consumes: Task 2 的 `type Post`；`FormattedDate.astro`（已存在）
- Produces: `<PostCard post={post} index={i} />`，props 类型 `{ post: Post; index?: number }`。`index` 用于入场动画错峰（写成 inline `--i`），缺省 0。

- [ ] **Step 1: 写 PostCard**

Create `src/components/PostCard.astro`:

```astro
---
import type { Post } from '../lib/posts';
import FormattedDate from './FormattedDate.astro';

interface Props {
  post: Post;
  /** 列表中的序号，用于入场动画错峰 */
  index?: number;
}
const { post, index = 0 } = Astro.props;
const { title, description, pubDate, tags, category, cover, pinned } = post.data;

// 无封面时用标题算一个色相做渐变兜底。
// 刻意压在 28–58 的琥珀区间内，避免随机色相与金黄主色打架。
const hash = [...title].reduce((acc, ch) => (acc * 31 + ch.codePointAt(0)!) % 997, 7);
const hue = 28 + (hash % 31);
---

<article class="card post-card" style={`--i:${index}; --cover-hue:${hue};`}>
  <a class="cover" href={`/blog/${post.id}/`} aria-hidden="true" tabindex="-1">
    {cover ? (
      <img src={cover} alt="" loading="lazy" />
    ) : (
      <span class="cover-fallback"></span>
    )}
  </a>
  <div class="body">
    <div class="head">
      {pinned && <span class="pinned">置顶</span>}
      <a class="category" href={`/categories/${encodeURIComponent(category)}/`}>{category}</a>
    </div>
    <h3><a href={`/blog/${post.id}/`}>{title}</a></h3>
    <p class="desc">{description}</p>
    <div class="post-meta">
      <FormattedDate date={pubDate} />
      {tags.map((tag) => (
        <a class="tag" href={`/tags/${encodeURIComponent(tag)}/`}>{tag}</a>
      ))}
    </div>
  </div>
</article>

<style>
  .post-card {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr);
    overflow: hidden;
    transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .post-card:hover {
    transform: translateY(-2px);
    border-color: var(--brand);
    box-shadow: var(--shadow-lift);
  }

  .cover {
    display: block;
    position: relative;
    min-height: 150px;
    background: var(--bg-soft);
  }
  .cover img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* 无封面兜底：琥珀区间渐变 + 网格纹理，与 Hero 同语言 */
  .cover-fallback {
    position: absolute;
    inset: 0;
    background:
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.08) 0 2px, transparent 2px 12px),
      linear-gradient(
        135deg,
        hsl(var(--cover-hue) 85% 62%),
        hsl(calc(var(--cover-hue) - 14) 75% 48%)
      );
  }

  .body {
    padding: 20px 22px;
    min-width: 0;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .pinned {
    padding: 1px 8px;
    border-radius: 999px;
    background: var(--brand);
    color: var(--brand-ink);
    font-size: 0.72rem;
    font-weight: 700;
  }
  .category {
    color: var(--text-soft);
    font-size: 0.8rem;
  }
  .category:hover {
    color: var(--link);
    text-decoration: none;
  }
  h3 {
    margin: 0 0 6px;
    font-size: 1.18rem;
  }
  h3 a {
    color: var(--text);
  }
  .post-card:hover h3 a {
    color: var(--link);
    text-decoration: none;
  }
  .desc {
    margin: 0 0 12px;
    color: var(--text-soft);
    font-size: 0.93rem;
    /* 最多两行，超出省略 */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (max-width: 720px) {
    .post-card {
      grid-template-columns: minmax(0, 1fr);
    }
    .cover {
      min-height: 140px;
    }
    .body {
      padding: 18px;
    }
  }
</style>
```

- [ ] **Step 2: 构建验证**

Run: `npm run build`
Expected: 构建成功（此时还没有页面用到 PostCard，仅验证组件本身能编译）

- [ ] **Step 3: Commit**

```bash
git add src/components/PostCard.astro
git commit -m "feat: 文章卡片组件，封面可选并用渐变兜底"
```

---

### Task 7: 首页与文章列表页

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/blog/index.astro`

**Interfaces:**
- Consumes: Task 2 的 `getSortedPosts`；Task 5 的 `<Hero />`；Task 6 的 `<PostCard post index />`
- Produces: 无（页面为终端消费者）

- [ ] **Step 1: 重写首页**

Modify `src/pages/index.astro` — 整个文件替换为：

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from '../components/Hero.astro';
import PostCard from '../components/PostCard.astro';
import { getSortedPosts } from '../lib/posts';

const posts = (await getSortedPosts()).slice(0, 5);
---

<BaseLayout layout="sidebar">
  <Hero slot="hero" />

  <p class="section-title">最新文章</p>
  <div class="post-list">
    {posts.map((post, i) => <PostCard post={post} index={i} />)}
  </div>

  <p class="more">
    <a class="btn" href="/blog">查看全部文章 →</a>
  </p>
</BaseLayout>

<style>
  .post-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .more {
    margin: 28px 0 0;
  }
</style>
```

- [ ] **Step 2: 重写文章列表页**

Modify `src/pages/blog/index.astro` — 整个文件替换为：

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import { getSortedPosts } from '../../lib/posts';

const posts = await getSortedPosts();
---

<BaseLayout title="全部文章" description="所有博客文章列表" layout="sidebar">
  <h1 class="page-title">全部文章 <span class="count">{posts.length}</span></h1>
  <div class="post-list">
    {posts.map((post, i) => <PostCard post={post} index={i} />)}
  </div>
</BaseLayout>

<style>
  .page-title {
    margin: 0 0 24px;
    font-size: 1.9rem;
  }
  .count {
    color: var(--text-soft);
    font-size: 1rem;
    font-weight: 400;
  }
  .post-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
```

- [ ] **Step 3: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 4: 断言首页 Hero、卡片、置顶排序**

`hello-world` 被设为置顶且是最新（2026-08-11），置顶排序下它必须是第一张卡片。

Run:
```bash
node -e "
const fs=require('fs');
const h=fs.readFileSync('dist/index.html','utf8');
if(!h.includes('class=\"hero\"')){console.error('FAIL: 首页缺 Hero');process.exit(1)}
if(!h.includes('hero-stats')){console.error('FAIL: Hero 缺统计');process.exit(1)}
if(!h.includes('cover-fallback')){console.error('FAIL: 无封面文章未用渐变兜底');process.exit(1)}
if(!h.includes('置顶')){console.error('FAIL: 置顶徽章未渲染');process.exit(1)}
const cards=(h.match(/class=\"card post-card\"/g)||[]).length;
if(cards!==3){console.error('FAIL: 首页卡片数应为 3，实际 '+cards);process.exit(1)}
// 置顶文章必须排第一
const first=h.indexOf('post-card');
const pin=h.indexOf('置顶');
const second=h.indexOf('post-card', first+10);
if(!(pin>first && pin<second)){console.error('FAIL: 置顶文章未排在第一位');process.exit(1)}
console.log('PASS');
"
```
Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro src/pages/blog/index.astro
git commit -m "feat: 首页 Hero 与卡片式文章列表"
```

---

### Task 8: 文章详情页、TOC 与评论区

**Files:**
- Create: `src/components/Toc.astro`
- Create: `src/components/Comments.astro`
- Modify: `src/pages/blog/[...slug].astro`

**Interfaces:**
- Consumes: Task 2 的 `COMMENTS`、`SOCIAL`；Astro `render()` 返回的 `headings`
- Produces:
  - `<Toc headings={headings} />`，props 类型 `{ headings: { depth: number; slug: string; text: string }[] }`。只渲染 depth 2–3。
  - `<Comments />` 无 props；`COMMENTS.provider === 'none'` 时渲染静态交流区块。

- [ ] **Step 1: 写 TOC**

Create `src/components/Toc.astro`:

```astro
---
interface Heading {
  depth: number;
  slug: string;
  text: string;
}
interface Props {
  headings: Heading[];
}
const { headings } = Astro.props;
// 只取 h2/h3，h4 以下过于零碎
const items = headings.filter((h) => h.depth >= 2 && h.depth <= 3);
---

{items.length > 0 && (
  <nav class="toc" aria-label="目录">
    <p class="toc-title">目录</p>
    <ul>
      {items.map((h) => (
        <li class={`depth-${h.depth}`}>
          <a href={`#${h.slug}`} data-toc-link={h.slug}>{h.text}</a>
        </li>
      ))}
    </ul>
    <button class="to-top" type="button" aria-label="回到顶部">↑ 回到顶部</button>
  </nav>
)}

<style>
  .toc {
    position: sticky;
    top: 76px;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
    padding: 18px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    font-size: 0.88rem;
  }
  .toc-title {
    margin: 0 0 10px;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-soft);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li a {
    display: block;
    padding: 5px 10px;
    border-left: 2px solid var(--border);
    color: var(--text-soft);
    line-height: 1.5;
  }
  li a:hover {
    color: var(--text);
    text-decoration: none;
  }
  /* 滚动高亮当前章节 */
  li a[aria-current='true'] {
    color: var(--link);
    border-left-color: var(--brand);
    background: var(--brand-soft);
    font-weight: 600;
  }
  .depth-3 a {
    padding-left: 24px;
    font-size: 0.84rem;
  }
  .to-top {
    margin-top: 12px;
    width: 100%;
    padding: 7px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: transparent;
    color: var(--text-soft);
    font-size: 0.82rem;
    cursor: pointer;
  }
  .to-top:hover {
    color: var(--text);
    background: var(--bg-soft);
    border-color: var(--brand);
  }
</style>

<script is:inline>
  (function () {
    const links = document.querySelectorAll('[data-toc-link]');
    if (!links.length) return;

    const targets = [...links]
      .map((a) => document.getElementById(a.dataset.tocLink))
      .filter(Boolean);

    function setCurrent(slug) {
      links.forEach((a) => {
        if (a.dataset.tocLink === slug) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }

    // 取当前视口内最靠上的标题作为高亮项
    const observer = new IntersectionObserver(
      () => {
        let current = null;
        for (const el of targets) {
          if (el.getBoundingClientRect().top <= 90) current = el;
          else break;
        }
        setCurrent(current ? current.id : targets[0].id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );
    targets.forEach((el) => observer.observe(el));

    document.querySelector('.to-top')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();
</script>
```

- [ ] **Step 2: 写评论区组件**

Create `src/components/Comments.astro`:

```astro
---
import { COMMENTS, SOCIAL } from '../consts';

// 从 GitHub 仓库地址推出 issues 地址；没配 GitHub 就只留邮箱
const issuesUrl = SOCIAL.github ? `${SOCIAL.github.replace(/\/$/, '')}/issues` : '';
---

{COMMENTS.provider === 'giscus' ? (
  <section class="comments" aria-label="评论">
    <script
      src="https://giscus.app/client.js"
      data-repo={COMMENTS.giscus.repo}
      data-repo-id={COMMENTS.giscus.repoId}
      data-category={COMMENTS.giscus.category}
      data-category-id={COMMENTS.giscus.categoryId}
      data-mapping="pathname"
      data-reactions-enabled="1"
      data-emit-metadata="0"
      data-input-position="top"
      data-lang="zh-CN"
      crossorigin="anonymous"
      async
    ></script>
  </section>
) : (
  <section class="comments card" aria-label="交流">
    <p class="title">想聊两句？</p>
    <p class="hint">
      这个博客是纯静态站点，暂时没接评论系统。有问题、有想法，或者发现文章里的错误，欢迎直接找我：
    </p>
    <div class="actions">
      {SOCIAL.email && <a class="btn" href={`mailto:${SOCIAL.email}`}>发邮件</a>}
      {issuesUrl && (
        <a class="btn-ghost" href={issuesUrl} target="_blank" rel="noopener">
          在 GitHub 上开 Issue
        </a>
      )}
    </div>
  </section>
)}

<style>
  .comments {
    margin-top: 48px;
    padding: 24px;
  }
  .title {
    margin: 0 0 8px;
    font-weight: 700;
    font-size: 1.1rem;
  }
  .hint {
    margin: 0 0 18px;
    color: var(--text-soft);
    font-size: 0.93rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .btn-ghost {
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text);
    font-size: 0.92rem;
    font-weight: 600;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .btn-ghost:hover {
    border-color: var(--brand);
    background: var(--bg-soft);
    text-decoration: none;
  }
</style>
```

- [ ] **Step 3: 重写文章详情页**

Modify `src/pages/blog/[...slug].astro` — 整个文件替换为：

```astro
---
import { render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import FormattedDate from '../../components/FormattedDate.astro';
import Toc from '../../components/Toc.astro';
import Comments from '../../components/Comments.astro';
import { getPublishedPosts, type Post } from '../../lib/posts';

export async function getStaticPaths() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({
    params: { slug: post.id },
    props: post,
  }));
}

const post = Astro.props as Post;
const { Content, headings } = await render(post);
const { title, description, pubDate, updatedDate, tags, category } = post.data;
---

<BaseLayout title={title} description={description} layout="toc">
  <Toc slot="toc" headings={headings} />

  <article class="article-body">
    <a href="/blog" class="back-link">← 返回文章列表</a>
    <header class="article-header">
      <a class="category" href={`/categories/${encodeURIComponent(category)}/`}>{category}</a>
      <h1>{title}</h1>
      <div class="post-meta">
        <FormattedDate date={pubDate} />
        {updatedDate && (
          <span>· 更新于 <FormattedDate date={updatedDate} /></span>
        )}
        {tags.map((tag) => (
          <a class="tag" href={`/tags/${encodeURIComponent(tag)}/`}>{tag}</a>
        ))}
      </div>
    </header>
    <div class="prose">
      <Content />
    </div>
    <Comments />
  </article>
</BaseLayout>

<style>
  .article-body {
    max-width: var(--maxw-prose);
  }
  .back-link {
    display: inline-block;
    margin-bottom: 20px;
    color: var(--text-soft);
    font-size: 0.9rem;
  }
  .article-header {
    margin-bottom: 32px;
  }
  .category {
    font-size: 0.85rem;
    color: var(--link);
  }
  .article-header h1 {
    font-size: clamp(1.6rem, 3.5vw, 2.1rem);
    margin: 8px 0 12px;
  }

  @media (max-width: 640px) {
    .article-header {
      margin-bottom: 24px;
    }
  }
</style>
```

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 构建成功，产出 3 个文章页

- [ ] **Step 5: 断言 TOC 与评论区**

其中 `font-weight:700` 那条断言是为了兜住 CSS 漏分号——漏分号不会让构建失败，只会静默吞掉下一条声明，必须靠产物断言才能发现。

Run:
```bash
node -e "
const fs=require('fs');
const h=fs.readFileSync('dist/blog/how-to-write-posts/index.html','utf8');
if(!h.includes('page-grid layout-toc')){console.error('FAIL: 文章页未用 layout-toc');process.exit(1)}
if(!h.includes('aria-label=\"目录\"')){console.error('FAIL: 缺 TOC');process.exit(1)}
if(!h.includes('data-toc-link')){console.error('FAIL: TOC 缺锚点链接');process.exit(1)}
if(!h.includes('第一步：新建文件')){console.error('FAIL: TOC 未收录 h2');process.exit(1)}
if(!h.includes('想聊两句？')){console.error('FAIL: 缺静态评论区');process.exit(1)}
if(h.includes('giscus.app')){console.error('FAIL: provider=none 却注入了 giscus');process.exit(1)}
if(!h.includes('font-weight:700')){console.error('FAIL: Toc 样式漏分号导致 font-weight 被吞');process.exit(1)}
console.log('PASS');
"
```
Expected: `PASS`

- [ ] **Step 6: Commit**

```bash
git add src/components/Toc.astro src/components/Comments.astro src/pages/blog/[...slug].astro
git commit -m "feat: 文章页加右侧 TOC 与评论区接口"
```

---

### Task 9: 标签、分类与归档页

**Files:**
- Create: `src/pages/tags/index.astro`
- Create: `src/pages/tags/[tag].astro`
- Create: `src/pages/categories/index.astro`
- Create: `src/pages/categories/[category].astro`
- Create: `src/pages/archive.astro`

**Interfaces:**
- Consumes: Task 2 的 `getTags`、`getCategories`、`getPublishedPosts`、`getArchive`、`type Post`；Task 6 的 `<PostCard>`
- Produces: 路由 `/tags/`、`/tags/<tag>/`、`/categories/`、`/categories/<category>/`、`/archive/`

- [ ] **Step 1: 标签索引页**

Create `src/pages/tags/index.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getTags } from '../../lib/posts';

const tags = await getTags();
---

<BaseLayout title="标签" description="按标签浏览全部文章" layout="sidebar">
  <h1 class="page-title">标签 <span class="count">{tags.length}</span></h1>
  <div class="cloud">
    {tags.map((t) => (
      <a class="tag-lg" href={`/tags/${encodeURIComponent(t.name)}/`}>
        {t.name}<span class="count">{t.count}</span>
      </a>
    ))}
  </div>
</BaseLayout>

<style>
  .page-title {
    margin: 0 0 24px;
    font-size: 1.9rem;
  }
  .page-title .count {
    color: var(--text-soft);
    font-size: 1rem;
    font-weight: 400;
  }
  .cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
</style>
```

- [ ] **Step 2: 标签归类页**

Create `src/pages/tags/[tag].astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import { getPublishedPosts, getTags, type Post } from '../../lib/posts';

export async function getStaticPaths() {
  const posts = await getPublishedPosts();
  const tags = await getTags();
  return tags.map((t) => ({
    // 传原始中文名，Astro 会自动做 URL 编码
    params: { tag: t.name },
    props: { tag: t.name, posts: posts.filter((p) => p.data.tags.includes(t.name)) },
  }));
}

const { tag, posts } = Astro.props as { tag: string; posts: Post[] };
---

<BaseLayout title={`标签：${tag}`} description={`标签「${tag}」下的全部文章`} layout="sidebar">
  <p class="crumb"><a href="/tags">标签</a> /</p>
  <h1 class="page-title">{tag} <span class="count">{posts.length} 篇</span></h1>
  <div class="post-list">
    {posts.map((post, i) => <PostCard post={post} index={i} />)}
  </div>
</BaseLayout>

<style>
  .crumb {
    margin: 0 0 4px;
    font-size: 0.88rem;
    color: var(--text-soft);
  }
  .page-title {
    margin: 0 0 24px;
    font-size: 1.9rem;
  }
  .count {
    color: var(--text-soft);
    font-size: 1rem;
    font-weight: 400;
  }
  .post-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
```

- [ ] **Step 3: 分类索引页**

Create `src/pages/categories/index.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getCategories } from '../../lib/posts';

const categories = await getCategories();
---

<BaseLayout title="分类" description="按分类浏览全部文章" layout="sidebar">
  <h1 class="page-title">分类 <span class="count">{categories.length}</span></h1>
  <div class="grid">
    {categories.map((c) => (
      <a class="card cat" href={`/categories/${encodeURIComponent(c.name)}/`}>
        <span class="name">{c.name}</span>
        <span class="num">{c.count} 篇</span>
      </a>
    ))}
  </div>
</BaseLayout>

<style>
  .page-title {
    margin: 0 0 24px;
    font-size: 1.9rem;
  }
  .page-title .count {
    color: var(--text-soft);
    font-size: 1rem;
    font-weight: 400;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
  }
  .cat {
    padding: 22px;
    color: var(--text);
    transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .cat:hover {
    transform: translateY(-2px);
    border-color: var(--brand);
    box-shadow: var(--shadow-lift);
    text-decoration: none;
  }
  .name {
    display: block;
    font-weight: 700;
    font-size: 1.1rem;
    margin-bottom: 4px;
  }
  .num {
    color: var(--text-soft);
    font-size: 0.85rem;
  }
</style>
```

- [ ] **Step 4: 分类归类页**

Create `src/pages/categories/[category].astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import { getPublishedPosts, getCategories, type Post } from '../../lib/posts';

export async function getStaticPaths() {
  const posts = await getPublishedPosts();
  const categories = await getCategories();
  return categories.map((c) => ({
    params: { category: c.name },
    props: { category: c.name, posts: posts.filter((p) => p.data.category === c.name) },
  }));
}

const { category, posts } = Astro.props as { category: string; posts: Post[] };
---

<BaseLayout
  title={`分类：${category}`}
  description={`分类「${category}」下的全部文章`}
  layout="sidebar"
>
  <p class="crumb"><a href="/categories">分类</a> /</p>
  <h1 class="page-title">{category} <span class="count">{posts.length} 篇</span></h1>
  <div class="post-list">
    {posts.map((post, i) => <PostCard post={post} index={i} />)}
  </div>
</BaseLayout>

<style>
  .crumb {
    margin: 0 0 4px;
    font-size: 0.88rem;
    color: var(--text-soft);
  }
  .page-title {
    margin: 0 0 24px;
    font-size: 1.9rem;
  }
  .count {
    color: var(--text-soft);
    font-size: 1rem;
    font-weight: 400;
  }
  .post-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
```

- [ ] **Step 5: 归档页**

Create `src/pages/archive.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getArchive } from '../lib/posts';

const groups = await getArchive();
const total = groups.reduce((n, g) => n + g.posts.length, 0);

function md(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
---

<BaseLayout title="归档" description="按年份浏览全部文章" layout="sidebar">
  <h1 class="page-title">归档 <span class="count">{total} 篇</span></h1>

  {groups.map((group) => (
    <section class="year-group">
      <h2 class="year">{group.year}</h2>
      <ul class="timeline">
        {group.posts.map((post) => (
          <li>
            <a href={`/blog/${post.id}/`}>
              <time datetime={post.data.pubDate.toISOString()}>{md(post.data.pubDate)}</time>
              <span class="title">{post.data.title}</span>
              <span class="cat">{post.data.category}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  ))}
</BaseLayout>

<style>
  .page-title {
    margin: 0 0 28px;
    font-size: 1.9rem;
  }
  .count {
    color: var(--text-soft);
    font-size: 1rem;
    font-weight: 400;
  }
  .year-group {
    margin-bottom: 32px;
  }
  .year {
    margin: 0 0 8px;
    font-size: 1.3rem;
    color: var(--text-soft);
  }
  .timeline {
    list-style: none;
    margin: 0;
    padding: 0 0 0 16px;
    border-left: 2px solid var(--border);
  }
  .timeline li a {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 9px 12px;
    border-radius: 8px;
    color: var(--text);
    position: relative;
  }
  /* 时间线上的圆点 */
  .timeline li a::before {
    content: '';
    position: absolute;
    left: -21px;
    top: 17px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border);
  }
  .timeline li a:hover {
    background: var(--bg-soft);
    text-decoration: none;
  }
  .timeline li a:hover::before {
    background: var(--brand);
  }
  .timeline time {
    flex-shrink: 0;
    color: var(--text-soft);
    font-size: 0.85rem;
    font-family: var(--font-mono);
  }
  .title {
    flex: 1;
    min-width: 0;
  }
  .timeline li a:hover .title {
    color: var(--link);
  }
  .cat {
    flex-shrink: 0;
    color: var(--text-soft);
    font-size: 0.8rem;
  }

  @media (max-width: 560px) {
    .cat {
      display: none;
    }
  }
</style>
```

- [ ] **Step 6: 构建验证**

Run: `npm run build`
Expected: 构建成功。产出 5 个标签页、3 个分类页、1 个归档页

- [ ] **Step 7: 断言路由与中文 URL**

Run:
```bash
node -e "
const fs=require('fs');
function ok(p){ if(!fs.existsSync(p)){console.error('FAIL: 缺 '+p);process.exit(1)} }
ok('dist/tags/index.html');
ok('dist/categories/index.html');
ok('dist/archive/index.html');
// 中文目录名以解码形式落盘
ok('dist/tags/部署/index.html');
ok('dist/tags/Cloudflare/index.html');
ok('dist/categories/教程/index.html');
const tagDirs=fs.readdirSync('dist/tags').filter(f=>fs.statSync('dist/tags/'+f).isDirectory());
if(tagDirs.length!==5){console.error('FAIL: 标签页应 5 个，实际 '+tagDirs.length);process.exit(1)}
const catDirs=fs.readdirSync('dist/categories').filter(f=>fs.statSync('dist/categories/'+f).isDirectory());
if(catDirs.length!==3){console.error('FAIL: 分类页应 3 个，实际 '+catDirs.length);process.exit(1)}
const ar=fs.readFileSync('dist/archive/index.html','utf8');
if(!ar.includes('2026')){console.error('FAIL: 归档缺年份分组');process.exit(1)}
const tp=fs.readFileSync('dist/tags/部署/index.html','utf8');
if(!tp.includes('把博客部署到 Cloudflare Pages')){console.error('FAIL: 标签页未列出对应文章');process.exit(1)}
console.log('PASS');
"
```
Expected: `PASS`

- [ ] **Step 8: Commit**

```bash
git add src/pages/tags src/pages/categories src/pages/archive.astro
git commit -m "feat: 标签、分类与归档页"
```

---

### Task 10: 留言页与既有页面样式对齐

**Files:**
- Create: `src/pages/guestbook.astro`
- Modify: `src/pages/about.astro`
- Modify: `src/pages/404.astro`

**Interfaces:**
- Consumes: Task 8 的 `<Comments />`；Task 2 的 `AUTHOR`
- Produces: 路由 `/guestbook/`

- [ ] **Step 1: 留言页**

Create `src/pages/guestbook.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Comments from '../components/Comments.astro';
---

<BaseLayout title="留言" description="留言与交流" layout="plain">
  <article>
    <header class="article-header">
      <h1>留言</h1>
      <p class="lead">路过留个脚印，或者聊聊你在折腾什么。</p>
    </header>
    <Comments />
  </article>
</BaseLayout>

<style>
  .article-header {
    margin-bottom: 8px;
  }
  .article-header h1 {
    font-size: 2rem;
    margin: 0 0 8px;
  }
  .lead {
    margin: 0;
    color: var(--text-soft);
  }
</style>
```

- [ ] **Step 2: 关于页对齐新样式**

Modify `src/pages/about.astro` — 整个文件替换为：

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { AUTHOR } from '../consts';
---

<BaseLayout title="关于" description="关于我" layout="plain">
  <article>
    <header class="article-header">
      <h1>关于</h1>
    </header>
    <div class="prose">
      <p>你好，我是 {AUTHOR}。这里是我的个人博客，用来记录编程、技术学习与日常思考。</p>
      <p>这个博客用 <a href="https://astro.build" target="_blank" rel="noopener">Astro</a> 构建，全站静态、访问飞快。</p>
      <h2>联系我</h2>
      <p>可以在 GitHub 上找到我，或者通过邮件联系。也欢迎去 <a href="/guestbook">留言页</a> 找我。</p>
    </div>
  </article>
</BaseLayout>

<style>
  .article-header h1 {
    font-size: 2rem;
    margin: 0 0 24px;
  }
</style>
```

- [ ] **Step 3: 404 页对齐新样式**

Modify `src/pages/404.astro` — 整个文件替换为：

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="页面走丢了" layout="plain">
  <div class="notfound">
    <p class="code">404</p>
    <p class="hint">这个页面不存在，或者已经被移走了。</p>
    <a class="btn" href="/">← 回到首页</a>
  </div>
</BaseLayout>

<style>
  .notfound {
    text-align: center;
    padding: 60px 0;
  }
  .code {
    margin: 0;
    font-size: clamp(3.5rem, 12vw, 6rem);
    font-weight: 800;
    line-height: 1;
    /* 金黄渐变数字 */
    background: linear-gradient(135deg, var(--brand), var(--brand-strong));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .hint {
    color: var(--text-soft);
    margin: 12px 0 24px;
  }
</style>
```

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 5: 断言页面产出**

Run:
```bash
node -e "
const fs=require('fs');
const g=fs.readFileSync('dist/guestbook/index.html','utf8');
if(!g.includes('想聊两句？')){console.error('FAIL: 留言页缺交流区块');process.exit(1)}
if(!g.includes('page-grid layout-plain')){console.error('FAIL: 留言页布局不对');process.exit(1)}
const a=fs.readFileSync('dist/about/index.html','utf8');
if(!a.includes('href=\"/guestbook\"')){console.error('FAIL: 关于页缺留言页链接');process.exit(1)}
const n=fs.readFileSync('dist/404.html','utf8');
if(!n.includes('404')){console.error('FAIL: 404 页内容异常');process.exit(1)}
console.log('PASS');
"
```
Expected: `PASS`

- [ ] **Step 6: Commit**

```bash
git add src/pages/guestbook.astro src/pages/about.astro src/pages/404.astro
git commit -m "feat: 留言页，关于页与 404 页对齐新样式"
```

---

### Task 11: 搜索

**Files:**
- Create: `src/lib/markdown.ts`
- Test: `src/lib/markdown.test.ts`
- Create: `src/pages/search.json.ts`
- Create: `src/components/SearchPanel.astro`
- Modify: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Consumes: Task 2 的 `getPublishedPosts`；Task 4 的 `#search-open` 按钮
- Produces:
  - `src/lib/markdown.ts` 导出 `stripMarkdown(md: string): string`、`excerpt(text: string, max?: number): string`（`max` 默认 500）
  - `/search.json` 返回 `{ title, description, tags, category, url, text }[]`
  - `<SearchPanel />` 无 props，挂在 `BaseLayout` 的 `</body>` 前

- [ ] **Step 1: 写失败的测试**

Create `src/lib/markdown.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { stripMarkdown, excerpt } from './markdown';

describe('stripMarkdown', () => {
  it('剥离 frontmatter', () => {
    expect(stripMarkdown('---\ntitle: A\n---\n正文')).toBe('正文');
  });

  it('剥离围栏代码块', () => {
    expect(stripMarkdown('前\n```js\nconst a = 1;\n```\n后')).toBe('前 后');
  });

  it('剥离行内代码但保留文字', () => {
    expect(stripMarkdown('运行 `npm run build` 命令')).toBe('运行 命令');
  });

  it('链接保留文字，图片整体移除', () => {
    expect(stripMarkdown('看 [Astro](https://astro.build) 官网')).toBe('看 Astro 官网');
    expect(stripMarkdown('图：![截图](/a.png) 结束')).toBe('图： 结束');
  });

  it('剥离标题、引用与列表符号', () => {
    expect(stripMarkdown('## 第一步\n> 提示\n- 甲\n1. 乙')).toBe('第一步 提示 甲 乙');
  });

  it('剥离强调符号', () => {
    expect(stripMarkdown('**很重要**的事')).toBe('很重要的事');
  });

  it('压缩连续空白', () => {
    expect(stripMarkdown('甲\n\n\n乙   丙')).toBe('甲 乙 丙');
  });
});

describe('excerpt', () => {
  it('短文本原样返回', () => {
    expect(excerpt('短', 10)).toBe('短');
  });

  it('超长按 max 截断', () => {
    expect(excerpt('一二三四五', 3)).toBe('一二三');
  });

  it('默认上限 500', () => {
    expect(excerpt('字'.repeat(600))).toHaveLength(500);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./markdown"`

- [ ] **Step 3: 实现 markdown.ts**

Create `src/lib/markdown.ts`:

```ts
// 纯文本处理，供搜索索引使用。不 import astro:content，可直接单测。

/** 把 Markdown 压成用于检索的纯文本 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, ' ') // frontmatter
    .replace(/```[\s\S]*?```/g, ' ') // 围栏代码块
    .replace(/`[^`\n]*`/g, ' ') // 行内代码
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接保留文字
    .replace(/^\s{0,3}#{1,6}\s+/gm, ' ') // 标题符号
    .replace(/^\s{0,3}>\s?/gm, ' ') // 引用
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, ' ') // 列表符号
    .replace(/[*_~]/g, '') // 强调符号
    .replace(/\s+/g, ' ') // 压缩空白
    .trim();
}

/** 截断到 max 个字符（搜索索引不需要全文） */
export function excerpt(text: string, max = 500): string {
  return text.length <= max ? text : text.slice(0, max);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test`
Expected: PASS — 共 19 个测试全绿（Task 1 的 9 个 + 本任务 10 个）

- [ ] **Step 5: 写搜索索引端点**

Create `src/pages/search.json.ts`:

```ts
import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/posts';
import { excerpt, stripMarkdown } from '../lib/markdown';

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const index = posts.map((post) => ({
    title: post.data.title,
    description: post.data.description,
    tags: post.data.tags,
    category: post.data.category,
    url: `/blog/${post.id}/`,
    text: excerpt(stripMarkdown(post.body ?? '')),
  }));
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
```

- [ ] **Step 6: 写搜索面板**

Create `src/components/SearchPanel.astro`:

```astro
---
// 零依赖搜索。索引在首次打开面板时才拉取，不影响首屏。
---

<div id="search-overlay" class="overlay" hidden>
  <div
    class="panel"
    role="dialog"
    aria-modal="true"
    aria-label="搜索文章"
  >
    <div class="field">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
      <input
        id="search-input"
        type="search"
        placeholder="搜索标题、标签或正文…"
        autocomplete="off"
        aria-label="搜索关键词"
      />
      <kbd>Esc</kbd>
    </div>
    <ul id="search-results" class="results"></ul>
    <p id="search-empty" class="empty" hidden>没有匹配的文章。</p>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 12vh 20px 20px;
    background: rgba(17, 24, 39, 0.45);
    backdrop-filter: blur(3px);
  }
  .overlay[hidden] {
    display: none;
  }
  .panel {
    width: 100%;
    max-width: 560px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-lift);
    overflow: hidden;
  }
  .field {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    color: var(--text-soft);
  }
  .field input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: var(--text);
    font-size: 1rem;
    font-family: inherit;
    outline: none;
  }
  kbd {
    padding: 2px 6px;
    border: 1px solid var(--border);
    border-radius: 5px;
    background: var(--bg-soft);
    font-size: 0.72rem;
    font-family: var(--font-mono);
  }
  .results {
    list-style: none;
    margin: 0;
    padding: 6px;
    max-height: 52vh;
    overflow-y: auto;
  }
  .results:empty {
    display: none;
  }
  .results a {
    display: block;
    padding: 10px 12px;
    border-radius: 10px;
    color: var(--text);
  }
  .results a:hover,
  .results li[aria-selected='true'] a {
    background: var(--brand-soft);
    text-decoration: none;
  }
  .results .t {
    display: block;
    font-weight: 600;
    font-size: 0.96rem;
  }
  .results .d {
    display: block;
    color: var(--text-soft);
    font-size: 0.84rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .empty {
    margin: 0;
    padding: 20px 16px;
    color: var(--text-soft);
    font-size: 0.9rem;
    text-align: center;
  }
</style>

<script is:inline>
  (function () {
    const overlay = document.getElementById('search-overlay');
    const input = document.getElementById('search-input');
    const list = document.getElementById('search-results');
    const empty = document.getElementById('search-empty');
    const openBtn = document.getElementById('search-open');
    if (!overlay || !input || !list || !empty) return;

    let index = null; // 懒加载的索引
    let hits = [];
    let cursor = 0;
    let lastFocus = null;

    async function ensureIndex() {
      if (index) return index;
      const res = await fetch('/search.json');
      index = await res.json();
      return index;
    }

    function score(post, q) {
      let s = 0;
      if (post.title.toLowerCase().includes(q)) s += 10;
      if (post.tags.some((t) => t.toLowerCase().includes(q))) s += 5;
      if (post.category.toLowerCase().includes(q)) s += 5;
      if (post.description.toLowerCase().includes(q)) s += 3;
      if (post.text.toLowerCase().includes(q)) s += 1;
      return s;
    }

    function render() {
      list.innerHTML = '';
      hits.forEach((p, i) => {
        const li = document.createElement('li');
        if (i === cursor) li.setAttribute('aria-selected', 'true');
        const a = document.createElement('a');
        a.href = p.url;
        const t = document.createElement('span');
        t.className = 't';
        t.textContent = p.title;
        const d = document.createElement('span');
        d.className = 'd';
        d.textContent = p.description;
        a.append(t, d);
        li.append(a);
        list.append(li);
      });
      const q = input.value.trim();
      empty.hidden = !(q.length > 0 && hits.length === 0);
    }

    async function search() {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        hits = [];
        cursor = 0;
        render();
        return;
      }
      const data = await ensureIndex();
      hits = data
        .map((p) => ({ p, s: score(p, q) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 10)
        .map((x) => x.p);
      cursor = 0;
      render();
    }

    function open() {
      lastFocus = document.activeElement;
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      input.focus();
      ensureIndex();
    }

    function close() {
      overlay.hidden = true;
      document.body.style.overflow = '';
      input.value = '';
      hits = [];
      render();
      // 焦点还原到触发按钮
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    openBtn?.addEventListener('click', open);
    input.addEventListener('input', search);

    // 点遮罩关闭，点面板内部不关
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', (e) => {
      const isOpen = !overlay.hidden;
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        isOpen ? close() : open();
        return;
      }
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hits.length) cursor = (cursor + 1) % hits.length;
        render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hits.length) cursor = (cursor - 1 + hits.length) % hits.length;
        render();
      } else if (e.key === 'Enter' && hits[cursor]) {
        e.preventDefault();
        window.location.href = hits[cursor].url;
      }
    });
  })();
</script>
```

- [ ] **Step 7: 挂进 BaseLayout**

Modify `src/layouts/BaseLayout.astro`：

在 import 区加一行（放在 `import Sidebar` 之后）：

```astro
import SearchPanel from '../components/SearchPanel.astro';
```

把 `<Footer />` 那一段改为：

```astro
    <Footer />
    <SearchPanel />
  </body>
```

- [ ] **Step 8: 构建验证**

Run: `npm run build`
Expected: 构建成功，产出 `dist/search.json`

- [ ] **Step 9: 断言索引内容与面板**

Run:
```bash
node -e "
const fs=require('fs');
const idx=JSON.parse(fs.readFileSync('dist/search.json','utf8'));
if(idx.length!==3){console.error('FAIL: 索引应 3 条，实际 '+idx.length);process.exit(1)}
const first=idx[0];
for (const k of ['title','description','tags','category','url','text']) {
  if(!(k in first)){console.error('FAIL: 索引缺字段 '+k);process.exit(1)}
}
if(idx.some(p=>p.text.includes('\`\`\`'))){console.error('FAIL: 索引 text 未剥离代码块');process.exit(1)}
if(idx.some(p=>p.text.length>500)){console.error('FAIL: 索引 text 超过 500 字');process.exit(1)}
if(!idx.some(p=>p.text.includes('写作是最好的思考方式'))){console.error('FAIL: 索引未收录正文');process.exit(1)}
const h=fs.readFileSync('dist/index.html','utf8');
if(!h.includes('id=\"search-overlay\"')){console.error('FAIL: 缺搜索面板');process.exit(1)}
if(!h.includes('aria-modal=\"true\"')){console.error('FAIL: 搜索面板缺 aria-modal');process.exit(1)}
console.log('PASS');
"
```
Expected: `PASS`

- [ ] **Step 10: 单元测试全绿**

Run: `npm test`
Expected: PASS — 19 个测试

- [ ] **Step 11: Commit**

```bash
git add src/lib/markdown.ts src/lib/markdown.test.ts src/pages/search.json.ts src/components/SearchPanel.astro src/layouts/BaseLayout.astro
git commit -m "feat: 零依赖站内搜索，索引懒加载"
```

---

### Task 12: 入场动效、无障碍降级与整体验收

**Files:**
- Modify: `src/styles/motion.css`

**Interfaces:**
- Consumes: Task 6 的 `.post-card` 上的 `--i` 变量
- Produces: 动画 `fade-up`；`prefers-reduced-motion: reduce` 下的全局降级

- [ ] **Step 1: 写动效样式**

Modify `src/styles/motion.css` — 整个文件替换为：

```css
/* ===== 入场动画 ===== */
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 卡片错峰入场。--i 由 PostCard 按列表序号写入 inline style。
   封顶 8 档，避免长列表末尾等太久。 */
.post-card {
  animation: fade-up 0.45s ease both;
  animation-delay: calc(min(var(--i, 0), 8) * 60ms);
}

/* 侧栏 widget 与 Hero 也走同一套语言 */
.hero,
.sidebar > .card {
  animation: fade-up 0.5s ease both;
}
.sidebar > .card:nth-child(2) {
  animation-delay: 80ms;
}
.sidebar > .card:nth-child(3) {
  animation-delay: 160ms;
}

/* ===== 无障碍降级 =====
   用极短时长而非 none：若某元素依赖 animationend 事件，
   置为 none 会让它永远停在初始态（透明）。 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 3: 断言动效与降级都在产物里**

Run:
```bash
node -e "
const fs=require('fs');
const dir='dist/_astro';
const css=fs.readdirSync(dir).filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(dir+'/'+f,'utf8')).join('');
const flat=css.replace(/\s/g,'');
if(!flat.includes('@keyframesfade-up')){console.error('FAIL: 缺 fade-up 动画');process.exit(1)}
if(!flat.includes('prefers-reduced-motion:reduce')){console.error('FAIL: 缺 reduced-motion 降级');process.exit(1)}
if(flat.includes('animation-duration:none')){console.error('FAIL: 降级误用 none');process.exit(1)}
const h=fs.readFileSync('dist/index.html','utf8');
if(!/--i:\s*0/.test(h)){console.error('FAIL: PostCard 未写入 --i');process.exit(1)}
console.log('PASS');
"
```
Expected: `PASS`

- [ ] **Step 4: 全量路由验收**

Run:
```bash
node -e "
const fs=require('fs');
const must=[
  'dist/index.html','dist/blog/index.html','dist/tags/index.html',
  'dist/categories/index.html','dist/archive/index.html',
  'dist/guestbook/index.html','dist/about/index.html','dist/404.html',
  'dist/search.json','dist/rss.xml','dist/sitemap-index.xml',
  'dist/blog/hello-world/index.html','dist/blog/how-to-write-posts/index.html',
  'dist/blog/deploy-on-cloudflare/index.html',
  'dist/tags/部署/index.html','dist/categories/教程/index.html'
];
const missing=must.filter(p=>!fs.existsSync(p));
if(missing.length){console.error('FAIL: 缺少产物\n'+missing.join('\n'));process.exit(1)}
console.log('PASS: '+must.length+' 个产物齐全');
"
```
Expected: `PASS: 16 个产物齐全`

- [ ] **Step 5: 断言没有写死色值漏进组件**

Run:
```bash
node -e "
const fs=require('fs'), path=require('path');
const allow=new Set(['src/styles/tokens.css','public/avatar.svg']);
const bad=[];
(function walk(d){
  for (const f of fs.readdirSync(d)) {
    const p=path.join(d,f).replace(/\\\\/g,'/');
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(astro|css)$/.test(p) && !allow.has(p)) {
      const src=fs.readFileSync(p,'utf8');
      // Hero 与 404 的渐变引用变量，rgba() 用于半透明叠加层，都允许；
      // 这里只抓裸十六进制色值
      const hits=src.match(/#[0-9a-fA-F]{6}\b/g);
      if (hits) bad.push(p+' → '+[...new Set(hits)].join(','));
    }
  }
})('src');
if(bad.length){console.error('FAIL: 组件里写死了色值\n'+bad.join('\n'));process.exit(1)}
console.log('PASS');
"
```
Expected: `PASS`

若报出 `src/styles/base.css` 或组件里的裸色值，改成引用 `var(--*)`；`rgba()` 半透明叠加层不在检查范围内，可保留。

- [ ] **Step 6: 单元测试全绿**

Run: `npm test`
Expected: PASS — 19 个测试

- [ ] **Step 7: 人工核对（启动预览）**

Run: `npm run preview`

打开 `http://localhost:4321`，逐项核对：

- [ ] 首页金黄 Hero 渐变正常，统计显示 `3 篇文章 / 3 个分类 / 5 个标签`
- [ ] 置顶文章「你好，世界」排第一并带金色「置顶」徽章
- [ ] 三张卡片左侧都是琥珀渐变兜底块（因为都没配 `cover`），且色调各不相同
- [ ] 卡片依次错峰淡入，hover 上浮且边框变金
- [ ] 点右上角主题按钮，亮/暗切换无闪烁；暗色下底色是暖炭灰、链接是亮黄
- [ ] 侧栏分类计数为 部署 1 / 随笔 1 / 教程 1，标签云 5 个
- [ ] 进任一文章页，右侧出现 TOC，滚动时当前章节高亮跟随
- [ ] 文章底部「想聊两句？」区块，两个按钮可点
- [ ] 按 `⌘K`（Windows 用 `Ctrl+K`）唤起搜索，输入「部署」能命中文章，`↑↓` 可移动、`Enter` 跳转、`Esc` 关闭
- [ ] 访问 `/archive`，年份分组与时间线圆点正常
- [ ] 点侧栏标签「Cloudflare」，中文/英文标签页都能打开
- [ ] 浏览器窗口拖到 900px 宽：侧栏转单列，头像卡在文章列表**上方**，分类标签在**下方**，无横向滚动条
- [ ] 拖到 600px 宽：Hero 变矮，卡片封面转为上下堆叠，无横向滚动条
- [ ] 拖到 1050px 宽：文章页 TOC 隐藏，正文占满

- [ ] **Step 8: Commit**

```bash
git add src/styles/motion.css
git commit -m "feat: 卡片错峰入场动效与 reduced-motion 降级"
```

---

## Self-Review

**1. Spec 覆盖核对**

| Spec 章节 | 落在 |
|---|---|
| 1 色彩系统（三角色 + 暖中性 + 对比度） | Task 3 |
| 2 布局三模式 + 三档断点 | Task 4 |
| 3 Hero（渐变、42vh、通栏 slot、头像占位） | Task 2 Step 5、Task 5 |
| 4 schema 扩展 + 补 category | Task 2 |
| 5 数据层（拆 core/wrapper 已说明） | Task 1、Task 2 |
| 6 组件清单（9 新 3 改） | Task 4–8、11 |
| 7 页面与导航（11 路由 + 归档分类入口） | Task 4（页脚）、5（Hero 统计）、7、9、10 |
| 8 评论接口先行 | Task 8 |
| 9 搜索（索引端点 + 懒加载 + 加权 + 键盘） | Task 11 |
| 10 动效 + 降级 | Task 12 |
| 11 无障碍（对比度/focus/dialog/TOC aria） | Task 3（focus）、8（TOC aria）、11（dialog aria） |
| 12 测试验收 | Task 12 Step 4–7 |

无遗漏。Spec 未提及的 `rss.xml.js` 改用统一数据层，属于第 5 节「所有页面只经由这个模块取数据」的必然要求，已并入 Task 2。

**2. 占位符扫描**

无 TBD/TODO。Task 3 Step 4 的两个占位 CSS 文件是**故意**的，注明了填充任务号，且 Task 4 与 Task 12 确实填了。`COMMENTS.giscus` 四个空字符串是运行时配置项，非计划占位。

**3. 类型与命名一致性**

- `PostLike` / `Counted` / `ArchiveGroup<T>` / `Stats` 在 Task 1 定义，Task 2 导入使用，名称一致
- `filterPublished`、`sortByDate`、`sortPinnedFirst`、`groupByCategory`、`groupByTag`、`groupByYear`、`computeStats` 七个函数，Task 1 定义、Task 2 调用，签名一致
- `getPublishedPosts`/`getSortedPosts`/`getCategories`/`getTags`/`getArchive`/`getStats` 六个封装，Task 2 定义，Task 5/7/8/9/11 调用，名称一致
- `type Post` 在 Task 2 导出，Task 6/8/9 导入
- `--i` 在 Task 6 写入、Task 12 消费
- `.widget-profile`/`.widget-category`/`.widget-tags` 在 Task 4 的断点里被选中、Task 5 的组件里定义 —— 一致
- `#search-open` 在 Task 4 创建、Task 11 绑定 —— 一致
- `stripMarkdown`/`excerpt` 在 Task 11 定义并在同任务的 `search.json.ts` 使用

**4. 断言可靠性**

每个任务的验收都是可自动执行的 `node -e` 断言，不依赖人工看图，唯一的人工环节是 Task 12 Step 7 的视觉核对（动画、渐变、hover 这类无法用产物断言覆盖的部分）。

Task 8 保留了一条 `font-weight:700` 断言——CSS 漏分号不会导致构建失败，只会静默吞掉下一条声明，这类问题只有产物断言能兜住。

**5. 断言与任务时序的一致性**

Task 5 Step 7 断言 `blog/index.html` 里恰好 3 条分类链接、5 条标签链接。此时 `blog/index.astro` 仍是旧的 `.post-item` markup（Task 4 只改了它的 `BaseLayout` 那一行），文章列表不产出分类/标签链接，因此这两个数字只来自侧栏，成立。Task 7 把它换成 `PostCard` 后会新增链接，但 Task 7 的断言针对 `dist/index.html` 且只数卡片数，不受影响。
