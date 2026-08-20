# 留言板完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把留言页从「只能发邮件」变成可随时切换到真实评论系统的形态：`COMMENTS.provider` 扩到四档（`none` / `giscus` / `twikoo` / `waline`），四套接入代码全部就位并与本站深浅色令牌打通，后端一旦部署只需改一行常量。

**Architecture:** `Comments.astro` 退化为纯分发器，唯一读 `COMMENTS.provider` 的地方；每个 provider 一个组件，只认通过 props 传进来的那组配置，不 import `consts`。联系方式（邮件 / 开 Issue）抽成 `ContactLinks.astro` 单一来源，被 fallback 卡和各 provider 的 `<noscript>` 共用。评论线的路径键由 `src/lib/comments.ts` 的纯函数在构建期算出并渲染进 `init()`，不让 widget 去读 `location.pathname`。三方 widget 的外观通过 `src/styles/comments.css` 映射到现有令牌，深色靠令牌自动跟随。

**Tech Stack:** Astro 5.13 · TypeScript · 原生 CSS（CSS 变量）· Vitest（仅 devDependency）· 零新增运行时依赖（三方 widget 走 CDN，不进 package.json）

## Global Constraints

- **不新增任何 npm 依赖。** Twikoo / Waline 一律走 CDN，不装包、不改 `package.json`。
- **不改 `astro.config.mjs`。** 保持纯静态输出。
- **交互脚本只用 `is:inline`。** 需要把 frontmatter 的值带进脚本时用 `define:vars`。
- **颜色值一律引用 `var(--*)`**，禁止在组件里写死十六进制色值。
- **中文优先**：所有面向用户的文案与代码注释用简体中文。
- **三方 CDN 版本号写死，禁止用 `@latest`。** latest 会某天静默换掉 DOM 结构，而 `comments.css` 的类名覆盖是绑着结构的，会一起碎掉。
- `src/lib/*.ts` 中被单测覆盖的模块**不得 import `astro:content`**（构建期虚拟模块，Vitest 下不可用）。
- **每个任务结束必须 `npm run build` 通过（零报错，30 页）且 `npm test` 全绿**才能提交。基线：改动前 30 页 / 96 个测试通过。
- **本次不部署任何后端，不填任何真实凭据。** `COMMENTS.provider` 交付时仍为 `'none'`。

## 已核实的外部事实（2026-08-19 核对，实现时直接用，不要再凭印象改）

| 项 | 值 |
|---|---|
| Twikoo 版本 / CDN | `1.7.19`，`https://cdn.jsdelivr.net/npm/twikoo@1.7.19/dist/twikoo.min.js` |
| Twikoo 初始化 | `twikoo.init({ envId, el, region?, path?, lang? })` |
| Waline CSS | `https://unpkg.com/@waline/client@v3/dist/waline.css` |
| Waline JS（ES module） | `https://unpkg.com/@waline/client@v3/dist/waline.js`，`import { init } from ...` |
| Waline 初始化 | `init({ el, serverURL, path?, lang? })` —— **不传 `dark`**，理由见 spec |
| giscus 运行时换主题 | `iframe.giscus-frame` → `postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app')` |

## 已知的验收缺口（必须照实告知，不得假装完成）

- **Twikoo 的 `.tk-*` / `.el-*` 类名覆盖本次无法验收。** widget 要连上后端才渲染完整 DOM，后端未部署，Task 7 那段 CSS 是照官方文档与社区教程盲写的。它必须在 Worker 部署完成后再走一轮目视调整。Task 7 的提交信息与文件注释都要写明这一点。
- 同理 `twikoo` / `waline` 两档只能验证到「脚本与 init 调用正确出现在产物 HTML 里」，无法验证渲染结果。

## File Structure

| 文件 | 责任 |
|---|---|
| `src/lib/comments.ts` | **新建（T1）+ 追加（T2）。** `normalizeCommentPath()` 路径键归一化、`missingCommentFields()` 必填字段校验，两个纯函数 |
| `src/lib/comments.test.ts` | **新建（T1）+ 追加（T2）。** 上两者的守卫 |
| `src/consts.ts` | **改（T2）。** `COMMENTS` 扩到四档 + `lazyOnPosts` |
| `src/consts.test.ts` | **改（T2）。** provider 取值 + 把 `missingCommentFields` 浇到真实配置上 |
| `src/components/comments/ContactLinks.astro` | **新建（T3）。** 邮件 / 开 Issue 两个链接，全站唯一一份，唯一读 `SOCIAL` 的地方 |
| `src/components/comments/CommentsFallback.astro` | **新建（T3）。** `provider='none'` 的卡片 |
| `src/components/comments/NoScriptNotice.astro` | **新建（T4）。** `<noscript>` 提示 + `ContactLinks`，三个 provider 共用 |
| `src/components/comments/CommentsGiscus.astro` | **新建（T4）。** giscus 挂载 + 主题同步 |
| `src/components/comments/CommentsTwikoo.astro` | **新建（T5）。** Twikoo 挂载 |
| `src/components/comments/CommentsWaline.astro` | **新建（T6）。** Waline 挂载 |
| `src/components/Comments.astro` | **重写（T3/4/5/6/8 逐步）。** 纯分发器，唯一读 `COMMENTS.provider` 的地方 |
| `src/styles/comments.css` | **新建（T3：共享外壳）+ 追加（T4：`.comments-mount`；T7：三方换肤）** |
| `src/styles/global.css` | **改（T3）。** 引入 `comments.css` |
| `src/pages/guestbook.astro` | **改。** 文案润色 + 留言须知 + `lazy={false}` |
| `docs/comments-backend.md` | **新建。** Twikoo + CF Workers + D1/R2 部署文档 |
| `README.md` | **改。** 目录结构与配置说明补留言相关条目 |

---

### Task 1: 评论线路径归一化纯函数

**Files:**
- Create: `src/lib/comments.ts`
- Test: `src/lib/comments.test.ts`

**Interfaces:**
- Consumes: 无
- Produces: `normalizeCommentPath(pathname: string): string` —— 后续 Task 6（分发器）import 它

**为什么需要它：** 全站链接统一写 `/blog/${post.id}/`（带尾斜杠），但未配置 `trailingSlash`、Astro 默认 `build.format: 'directory'`，产出 `/blog/foo/index.html`——带不带斜杠都能打开。访客从外部链接或手输网址进来时 `location.pathname` 形态不定，Twikoo 会把同一篇文章的评论拆成两条互相看不见的线。解法是用构建期的规范路径，而不是浏览器的当前路径。

- [ ] **Step 1: 写失败测试**

创建 `src/lib/comments.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { normalizeCommentPath } from './comments';

describe('normalizeCommentPath', () => {
  it('不带尾斜杠的路径补上尾斜杠', () => {
    // 全站链接写的是 /blog/foo/，但访客手输或外链进来可能是 /blog/foo，
    // 两者必须归一到同一个评论线键
    expect(normalizeCommentPath('/blog/foo')).toBe('/blog/foo/');
  });

  it('已带尾斜杠的路径保持不变（幂等）', () => {
    expect(normalizeCommentPath('/blog/foo/')).toBe('/blog/foo/');
  });

  it('同一篇文章的两种写法产出同一个键', () => {
    // 这条是这个函数存在的全部理由，单独断一次
    expect(normalizeCommentPath('/blog/foo')).toBe(normalizeCommentPath('/blog/foo/'));
  });

  it('根路径保持为 /', () => {
    expect(normalizeCommentPath('/')).toBe('/');
  });

  it('空串兜底为 /', () => {
    // Astro.url.pathname 不会给空串，但这个函数是纯函数，
    // 兜底掉空串才不会在将来某个调用方手里产出 '/' 之外的怪值
    expect(normalizeCommentPath('')).toBe('/');
  });

  it('留言页与文章页的键互不相同', () => {
    // 防止归一化写成「一律返回 /」这类过度归并
    expect(normalizeCommentPath('/guestbook')).not.toBe(normalizeCommentPath('/blog/foo'));
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npx vitest run src/lib/comments.test.ts
```

Expected: FAIL，报 `Failed to resolve import "./comments"`（文件还不存在）

- [ ] **Step 3: 写最小实现**

创建 `src/lib/comments.ts`：

```ts
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
```

- [ ] **Step 4: 跑测试确认通过**

```bash
npx vitest run src/lib/comments.test.ts
```

Expected: PASS，6 tests

- [ ] **Step 5: 跑全量测试与构建**

```bash
npm test
```

Expected: 7 test files，102 tests passed（原 96 + 新增 6）

```bash
npm run build
```

Expected: `30 page(s) built`，零报错

- [ ] **Step 6: 提交**

```bash
git add src/lib/comments.ts src/lib/comments.test.ts
git commit -m "feat: 评论线路径归一化纯函数

Twikoo 把带斜杠与不带斜杠的 URL 当成两条独立评论线（见 twikoo-cloudflare
README）。全站链接写 /blog/xxx/，但 Astro 默认 directory 格式下两种都能打开，
访客从外链或手输进来时 location.pathname 形态不定，同一篇文章的评论会被拆成
两半。改由构建期算出规范路径再渲染进 init()。"
```

---

### Task 2: `COMMENTS` 配置扩到四档

**Files:**
- Modify: `src/consts.ts`（文件末尾的 `COMMENTS` 常量）
- Modify: `src/lib/comments.ts`（追加 `missingCommentFields`，Task 1 已建好这个文件）
- Test: `src/lib/comments.test.ts`（追加一个 describe 块）
- Test: `src/consts.test.ts`（追加一个 describe 块）

**Interfaces:**
- Consumes: `src/lib/comments.ts`（Task 1 创建）
- Produces:
  - `export type CommentProvider = 'none' | 'giscus' | 'twikoo' | 'waline'`
  - `COMMENTS.provider: CommentProvider`
  - `COMMENTS.lazyOnPosts: boolean`
  - `COMMENTS.giscus: { repo: string; repoId: string; category: string; categoryId: string }`
  - `COMMENTS.twikoo: { envId: string; region: string }`
  - `COMMENTS.waline: { serverURL: string }`
  - `missingCommentFields(cfg: CommentsConfigLike): string[]` —— 返回当前启用的 provider 缺失的必填字段名

后续所有 Task 都按这些字段名取值，不要改名。

**为什么校验逻辑要抽成纯函数：** 直接在 `consts.test.ts` 里对真实配置写断言，会得到一个恒真式——交付时 `provider` 是 `'none'`，任何「必填字段非空」的判断都走不到。护栏必须能用造出来的配置证明自己有牙齿：`provider='twikoo'` 且 `envId` 为空时它得真的报出 `envId`。所以判定逻辑放进 `src/lib/comments.ts`（本仓库的惯例是纯逻辑进 `lib/` 并被 Vitest 覆盖），`consts.test.ts` 只负责把它浇到真实配置上。

- [ ] **Step 1: 写失败测试**

**1a.** 在 `src/lib/comments.test.ts` 末尾追加（import 行改为 `import { normalizeCommentPath, missingCommentFields } from './comments';`）：

```ts
describe('missingCommentFields', () => {
  // 这一组全部用造出来的配置，不碰真实的 COMMENTS——
  // 真实配置交付时是 provider='none'，拿它测「必填字段缺失」永远走不到分支，
  // 那样的测试恒真、等于没写。
  it("provider='none' 时三组全空也不算缺失", () => {
    expect(
      missingCommentFields({ provider: 'none', giscus: {}, twikoo: {}, waline: {} })
    ).toEqual([]);
  });

  it("provider='twikoo' 且 envId 为空时报出 envId", () => {
    expect(
      missingCommentFields({ provider: 'twikoo', twikoo: { envId: '', region: '' } })
    ).toEqual(['envId']);
  });

  it('只校验启用的那档，未启用的留空不报', () => {
    // 这条是护栏的关键行为：twikoo 填齐了就该放行，
    // 不能因为 waline / giscus 那两组还空着而误报
    expect(
      missingCommentFields({
        provider: 'twikoo',
        twikoo: { envId: 'https://x.workers.dev', region: '' },
        waline: { serverURL: '' },
        giscus: { repo: '', repoId: '', category: '', categoryId: '' },
      })
    ).toEqual([]);
  });

  it('多个字段缺失时全部报出', () => {
    expect(
      missingCommentFields({
        provider: 'giscus',
        giscus: { repo: 'a/b', repoId: '', category: 'General', categoryId: '' },
      })
    ).toEqual(['repoId', 'categoryId']);
  });

  it('只有空白字符也算缺失', () => {
    // 复制粘贴时很容易留下一个空格，视觉上「填了」但实际是空的
    expect(
      missingCommentFields({ provider: 'waline', waline: { serverURL: '   ' } })
    ).toEqual(['serverURL']);
  });

  it('配置组整个缺失时报出该档全部必填字段', () => {
    // 手改 consts.ts 时把整个 waline: {} 块删掉，不该抛异常而应报缺失
    expect(missingCommentFields({ provider: 'waline' })).toEqual(['serverURL']);
  });
});
```

**1b.** 在 `src/consts.test.ts` 的 import 块加入 `COMMENTS`，另从 `./lib/comments` import `missingCommentFields`，并在文件末尾追加：

```ts
describe('评论系统配置', () => {
  const PROVIDERS = ['none', 'giscus', 'twikoo', 'waline'];

  it('provider 只能是四档之一', () => {
    // 写错不会报错：分发器四个分支全不命中，评论区静默消失
    expect(PROVIDERS).toContain(COMMENTS.provider);
  });

  it('每档 provider 的配置对象都存在', () => {
    // 分发器把整组配置当 props 传下去，缺对象会在构建期炸在组件里，
    // 报错信息离病根很远，所以在这里先拦一道
    for (const p of PROVIDERS.filter((p) => p !== 'none')) {
      expect(COMMENTS[p as 'giscus' | 'twikoo' | 'waline'], `COMMENTS.${p} 不存在`).toBeTruthy();
    }
  });

  it('启用的 provider 没有缺失的必填字段', () => {
    // 判定逻辑在 lib/comments.ts，那边用造数据证明过它真的会报缺失；
    // 这里只负责把它浇到真实配置上。填一半就上线是最危险的情形：
    // 静态站构建不报错，页面上只是一块空白，只有真人打开才发现。
    const missing = missingCommentFields(COMMENTS);
    expect(
      missing,
      `provider 已设为 ${COMMENTS.provider}，但这些必填字段是空的：${missing.join(', ')}`
    ).toEqual([]);
  });

  it('lazyOnPosts 是布尔值', () => {
    // 它被 define:vars 传进 is:inline 脚本做 if 判断，
    // 写成字符串 'false' 会被当成真值，懒加载静默失效
    expect(typeof COMMENTS.lazyOnPosts).toBe('boolean');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npx vitest run src/lib/comments.test.ts src/consts.test.ts
```

Expected: 两个文件都 FAIL ——
- `comments.test.ts` 报 `missingCommentFields is not a function`（函数还没写）
- `consts.test.ts` 报 `COMMENTS.twikoo 不存在` 与 `lazyOnPosts 是布尔值`（当前 `COMMENTS` 只有 `provider` 与 `giscus`）

- [ ] **Step 3a: 在 `src/lib/comments.ts` 末尾追加校验函数**

```ts
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
```

- [ ] **Step 3b: 改 `src/consts.ts`**

把 `src/consts.ts` 末尾的 `COMMENTS` 整块替换为：

```ts
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
```

- [ ] **Step 4: 跑测试确认通过**

```bash
npx vitest run src/lib/comments.test.ts src/consts.test.ts
```

Expected: 两个文件都 PASS ——
- `comments.test.ts` 12 tests（Task 1 的 6 + 本任务的 6）
- `consts.test.ts` 16 tests（原 12 + 本任务的 4）

- [ ] **Step 5: 构建确认没打破现状**

```bash
npm run build
```

Expected: `30 page(s) built`，零报错。现有 `Comments.astro` 仍读 `COMMENTS.provider === 'giscus'`，`'none'` 分支照旧生效。

- [ ] **Step 6: 提交**

```bash
git add src/consts.ts src/consts.test.ts src/lib/comments.ts src/lib/comments.test.ts
git commit -m "feat: COMMENTS 配置扩到四档并加必填字段守卫

provider 扩为 none/giscus/twikoo/waline，新增 lazyOnPosts。
守卫拦的是「填一半就上线」：静态站构建不报错，页面上只是一块空白，
只有真人打开才发现。

判定逻辑抽成 lib/comments.ts 的 missingCommentFields 纯函数，用造出来的
配置证明它真会报缺失。直接对真实配置断言会得到恒真式——交付时
provider='none'，任何「必填非空」的判断都走不到分支。

必填字段表只存一份（REQUIRED_FIELDS），consts.test.ts 不再自己抄一遍。"
```

---

### Task 3: 抽出 `ContactLinks.astro` 与 `CommentsFallback.astro`

**Files:**
- Create: `src/components/comments/ContactLinks.astro`
- Create: `src/components/comments/CommentsFallback.astro`
- Create: `src/styles/comments.css`（本任务只放共享外壳样式；Task 7 再往里追加三方换肤）
- Modify: `src/styles/global.css`（加一行 `@import`）
- Modify: `src/components/Comments.astro`（`'none'` 分支改为渲染 `CommentsFallback`）

**Interfaces:**
- Consumes: 无
- Produces:
  - `ContactLinks.astro` —— 无 props，渲染「发邮件」+「在 GitHub 上开 Issue」两个按钮。后续 Task 4/5/6 都用它
  - `CommentsFallback.astro` —— 无 props
  - 全局类 `.comments`、`.comments.card`、`.comments-hint` —— 后续四个组件共用，各组件不再自带这几条规则

**为什么抽 `ContactLinks`：** 联系方式要出现在四个地方（fallback 卡 + 三个 provider 的 `<noscript>`）。复制四份的话改文案必然漏一个。同时那句「必须用 `SOCIAL.repo` 而不是 `SOCIAL.github`」的坑注释要跟着搬，别让它重新长出来。

**为什么这个任务就建 `comments.css`：** 评论区的外壳样式（`.comments` 的上边距、提示小字）会被四个组件共用。如果留在各组件的 scoped `<style>` 里就是四份逐字重复。放到 Task 7 再建又会让本任务交付一张没样式的卡片，验收不了。所以共享外壳样式在这里落地，Task 7 只负责追加 Waline 变量映射与 Twikoo 类名覆盖。

**类名必须带 `comments-` 前缀：** 全局化的提示小字**不能**叫 `.hint`——`src/pages/404.astro` 已经有一个自己的 `.hint`，全局规则会漏进 404 页把它改样。同理 fallback 卡的 `.title` 与 `archive.astro` 的 `.title` 撞名，**所以 `.title` 不全局化**，它只有一个使用方、继续留在 `CommentsFallback` 的 scoped `<style>` 里（一份不算重复）。这个坑在本仓库出现过一次（`.count` 与分类徽章撞名），别再踩。

- [ ] **Step 1: 建 `ContactLinks.astro`**

创建 `src/components/comments/ContactLinks.astro`：

```astro
---
import { SOCIAL } from '../../consts';

// 从仓库地址推出 issues 地址。必须用 SOCIAL.repo 而不是 SOCIAL.github ——
// 后者是个人主页，拼出来的 /zh-qdwl/issues 是个死链。没配 repo 就只留邮箱。
//
// 这里是全站唯一读 SOCIAL 推导 issues 地址的地方。四个消费方（fallback 卡 +
// 三个 provider 的 noscript）都用这个组件，别再各自拼一遍。
const issuesUrl = SOCIAL.repo ? `${SOCIAL.repo.replace(/\/$/, '')}/issues` : '';
---

<div class="actions">
  {SOCIAL.email && <a class="btn" href={`mailto:${SOCIAL.email}`}>发邮件</a>}
  {issuesUrl && (
    <a class="btn-ghost" href={issuesUrl} target="_blank" rel="noopener">
      在 GitHub 上开 Issue
    </a>
  )}
</div>

<style>
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  /* .btn 来自 base.css 的全局工具类；这个幽灵按钮只有这里用，留在组件内 */
  .btn-ghost {
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text);
    font-size: 0.92rem;
    font-weight: 600;
    transition: border-color var(--dur) var(--ease), background var(--dur) var(--ease);
  }
  .btn-ghost:hover {
    border-color: var(--brand);
    background: var(--bg-soft);
    text-decoration: none;
  }
</style>
```

- [ ] **Step 2: 建 `comments.css` 并在 `global.css` 里引入**

创建 `src/styles/comments.css`：

```css
/* ===== 评论区样式 =====
   本文件分两部分：
   1. 共享外壳——四个 provider 组件（fallback / giscus / twikoo / waline）共用，
      写在这里而不是各组件的 scoped <style> 里，否则就是四份逐字重复。
   2. 三方 widget 换肤——Task 7 追加，见本文件后半。

   类名一律带 comments- 前缀。不叫 .hint 是因为 src/pages/404.astro 已经有一个
   自己的 .hint，全局规则会漏进那一页把它改样；同理 .title 与 archive.astro 撞名，
   所以 fallback 卡的标题类不全局化、留在组件内。 */

.comments {
  margin-top: 48px;
}

/* fallback 卡额外叠了 .card 工具类，需要内边距；其他 provider 是裸挂载区，不要 */
.comments.card {
  padding: 24px;
}

/* 评论区里的提示小字：fallback 卡的说明、各 provider 的 noscript 提示 */
.comments-hint {
  margin: 0 0 18px;
  color: var(--text-soft);
  font-size: 0.93rem;
}
```

把 `src/styles/global.css` 整个文件替换为：

```css
/* 样式入口。具体规则按职责拆到下面几个文件：
   tokens   = CSS 变量（配色、尺寸、字体）
   base     = 重置、排版、工具类、.prose
   layout   = 页面网格、头部、页脚、响应式断点
   motion   = 入场动画与 prefers-reduced-motion 降级
   comments = 评论区外壳与三方 widget 换肤（放最后，要盖在三方样式之上）
   组件私有样式写在各自 .astro 的 <style> 里（Astro 自动 scoped）。 */
@import './tokens.css';
@import './base.css';
@import './layout.css';
@import './motion.css';
@import './comments.css';
```

- [ ] **Step 3: 建 `CommentsFallback.astro`**

创建 `src/components/comments/CommentsFallback.astro`：

```astro
---
import ContactLinks from './ContactLinks.astro';
---

<section class="comments card" aria-label="交流">
  <p class="title">想聊两句？</p>
  <p class="comments-hint">
    留言功能正在接，暂时先走下面这两条。有问题、有想法，或者发现了什么错误，欢迎直接找我：
  </p>
  <ContactLinks />
</section>

<style>
  /* .comments / .comments.card / .comments-hint 在 src/styles/comments.css 里，
     四个 provider 组件共用。这里只留本卡片独有的标题样式——
     刻意不叫全局类：archive.astro 也有个 .title，全局化会撞。 */
  .title {
    margin: 0 0 8px;
    font-weight: 700;
    font-size: 1.1rem;
  }
</style>
```

- [ ] **Step 4: 让 `Comments.astro` 的 `none` 分支用新组件**

把 `src/components/Comments.astro` 整个文件替换为（giscus 分支暂时原样保留，Task 4 再搬；`.comments` 的样式已进 `comments.css`，这里不再带 `<style>`）：

```astro
---
import { COMMENTS } from '../consts';
import CommentsFallback from './comments/CommentsFallback.astro';
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
  <CommentsFallback />
)}
```

- [ ] **Step 5: 构建并断言产物**

```bash
npm run build
```

Expected: `30 page(s) built`，零报错

> **产物断言的计数方式**：`grep -c` 数的是**命中的行数**，不是出现次数——同一行里出现三次也只记 1。要数次数必须用 `grep -o … | wc -l`。下面凡是关心「出现几次」的地方都用后者，只关心「有没有」的地方才用 `grep -c`。
>
> （Astro 默认 `compressHTML: true`，但它只压标签之间的空白，**并不会把整页压成一行**——实测留言页产物 181 行。所以两个命令给出的数字通常不同但都不是 1，别拿其中一个去反推另一个。）

```bash
grep -o "在 GitHub 上开 Issue" dist/guestbook/index.html | wc -l
```

Expected: `1`

```bash
grep -o 'href="https://github.com/zh-qdwl/zh-blog/issues"' dist/guestbook/index.html
```

Expected: 输出该 href 一次。**关键断言**——证明用的是 `SOCIAL.repo` 而不是 `SOCIAL.github`（后者会拼成 `github.com/zh-qdwl/issues`）

```bash
grep -o 'href="mailto:[^"]*"' dist/guestbook/index.html | wc -l
```

Expected: `2`。**注意不是 1**——`Footer.astro` 每页都独立渲染一个 mailto 链接，与本组件无关。只想看本组件那一个就用 `grep -o 'class="btn" href="mailto:[^"]*"' dist/guestbook/index.html | wc -l`，那个才是 `1`。

```bash
grep -l "comments-hint" dist/_astro/*.css dist/guestbook/index.html
```

Expected: 两个都列出——CSS 规则进了样式产物，`class="comments-hint"` 进了页面。（Astro 的 `inlineStylesheets: 'auto'` 会让样式在外链与内联之间漂移，所以搜两处。）

```bash
grep -c 'class="hint"' dist/404.html
```

Expected: `1`。**关键断言**——404 页自己的 `.hint` 还在、没被改名，证明全局化没有波及它

```bash
grep -c "comments-hint" dist/404.html
```

Expected: `0`。404 页不该出现评论区的类名

- [ ] **Step 6: 跑全量测试**

```bash
npm test
```

Expected: 112 tests passed（Task 1 加 6 + Task 2 加 10，此后各任务不再变）

- [ ] **Step 7: 提交**

```bash
git add src/components/comments/ContactLinks.astro src/components/comments/CommentsFallback.astro src/components/Comments.astro src/styles/comments.css src/styles/global.css
git commit -m "refactor: 抽出 ContactLinks 与 fallback 卡，共享样式进 comments.css

联系方式要出现在四处（fallback 卡 + 三个 provider 的 noscript），
复制四份改文案必然漏一个。「必须用 SOCIAL.repo 而不是 SOCIAL.github，
后者拼出来是死链」那句坑注释跟着搬过去。

评论区外壳样式（.comments / .comments-hint）进 comments.css，四个 provider
组件共用，避免四份逐字重复。类名带 comments- 前缀是必须的：404 页已有自己的
.hint，全局化会漏进去改它的样；archive.astro 也有 .title，所以 fallback 卡的
标题类不全局化、留在组件内。

fallback 卡文案补上「留言功能正在接」。"
```

---

### Task 4: `CommentsGiscus.astro` —— 抽出并接上主题同步

**Files:**
- Create: `src/components/comments/NoScriptNotice.astro`
- Create: `src/components/comments/CommentsGiscus.astro`
- Modify: `src/styles/comments.css`（追加 `.comments-mount`）
- Modify: `src/components/Comments.astro`（giscus 分支改为渲染新组件）

**Interfaces:**
- Consumes: `ContactLinks.astro`、全局类 `.comments` / `.comments-hint`（均来自 Task 3）
- Produces:
  - `NoScriptNotice.astro` —— 无 props。`<noscript>` 里的那句提示 + `ContactLinks`。Task 5/6 直接复用
  - 全局类 `.comments-mount` —— 三个 provider 的挂载容器共用
  - `CommentsGiscus.astro`，props：
    ```ts
    interface Props {
      config: { repo: string; repoId: string; category: string; categoryId: string };
      lazy: boolean;
    }
    ```

**为什么要 `NoScriptNotice`：** 三个 provider 的 `<noscript>` 内容完全一样。抽出来的理由和 Task 3 抽 `ContactLinks` 是同一条——复制三份，改那句提示文案就得改三处，必然漏。它在这个任务出现是因为 giscus 是第一个用到它的 provider；Task 5/6 只需写一行 `<NoScriptNotice />`。

**为什么要主题同步：** giscus 是 iframe，`comments.css` 里的 CSS 变量透不进去。只能在本站主题切换后用 `postMessage` 通知它换主题。

- [ ] **Step 1a: 建 `NoScriptNotice.astro` 并给 `comments.css` 加挂载容器样式**

创建 `src/components/comments/NoScriptNotice.astro`：

```astro
---
import ContactLinks from './ContactLinks.astro';

// 三个 provider 的 <noscript> 内容一模一样，抽在这里。
// 理由同 ContactLinks：复制三份，改这句提示就得改三处，必然漏一个。
---

<noscript>
  <p class="comments-hint">评论区需要 JavaScript。也可以直接找我：</p>
  <ContactLinks />
</noscript>
```

在 `src/styles/comments.css` 的共享外壳部分末尾（`.comments-hint` 规则之后、Task 7 追加的三方换肤之前）加入：

```css
/* 三方 widget 的挂载容器。给个最小高度，懒加载注入 widget 时才不会把下方内容
   猛地顶一下（CLS）。190px 约等于一个空表单的高度，宁可略矮也不要留一大片空白。 */
.comments-mount {
  min-height: 190px;
}
```

- [ ] **Step 1b: 建 `CommentsGiscus.astro`**

创建 `src/components/comments/CommentsGiscus.astro`：

```astro
---
import NoScriptNotice from './NoScriptNotice.astro';

interface Props {
  config: { repo: string; repoId: string; category: string; categoryId: string };
  lazy: boolean;
}
const { config, lazy } = Astro.props;
---

<section class="comments" aria-label="评论">
  <div id="giscus-mount" class="comments-mount"></div>
  <NoScriptNotice />
</section>

<script
  is:inline
  define:vars={{
    repo: config.repo,
    repoId: config.repoId,
    category: config.category,
    categoryId: config.categoryId,
    lazy,
  }}
>
  (function () {
    const host = document.getElementById('giscus-mount');
    if (!host) return;

    // giscus 是 iframe，comments.css 的变量透不进去，只能按当前主题选它自带的配色，
    // 再在本站切换主题时用 postMessage 通知它换。
    function currentTheme() {
      return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    let loaded = false;
    function load() {
      if (loaded) return;
      loaded = true;
      const s = document.createElement('script');
      s.src = 'https://giscus.app/client.js';
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.setAttribute('data-repo', repo);
      s.setAttribute('data-repo-id', repoId);
      s.setAttribute('data-category', category);
      s.setAttribute('data-category-id', categoryId);
      s.setAttribute('data-mapping', 'pathname');
      s.setAttribute('data-reactions-enabled', '1');
      s.setAttribute('data-emit-metadata', '0');
      s.setAttribute('data-input-position', 'top');
      s.setAttribute('data-lang', 'zh-CN');
      s.setAttribute('data-theme', currentTheme());
      host.appendChild(s);
    }

    if (lazy && window.__commentsWhenNear) window.__commentsWhenNear(host, load);
    else load();

    // 主题切换后通知 iframe。监听 <html data-theme> 而不是给 #theme-toggle 绑点击——
    // 属性变化是唯一真相，将来多一个切换入口也不用改这里。
    new MutationObserver(function () {
      const frame = document.querySelector('iframe.giscus-frame');
      if (!frame) return;
      frame.contentWindow.postMessage(
        { giscus: { setConfig: { theme: currentTheme() } } },
        'https://giscus.app'
      );
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  })();
</script>
```

> 本组件**不带 `<style>`**。`.comments` / `.comments-mount` / `.comments-hint` 都在 `src/styles/comments.css` 里，四个 provider 组件共用——各自再写一份就是逐字重复。

- [ ] **Step 2: 分发器改用新组件**

把 `src/components/Comments.astro` 整个文件替换为：

```astro
---
import { COMMENTS } from '../consts';
import CommentsFallback from './comments/CommentsFallback.astro';
import CommentsGiscus from './comments/CommentsGiscus.astro';

interface Props {
  /** 懒加载：滚到附近才拉三方脚本。留言页应传 false */
  lazy?: boolean;
}
const { lazy = COMMENTS.lazyOnPosts } = Astro.props;
---

{COMMENTS.provider === 'giscus' && <CommentsGiscus config={COMMENTS.giscus} lazy={lazy} />}
{COMMENTS.provider === 'none' && <CommentsFallback />}
```

- [ ] **Step 3: 临时切到 giscus 验证产物**

```bash
sed -i "s/provider: 'none' as CommentProvider/provider: 'giscus' as CommentProvider/" src/consts.ts
sed -i "s/    repo: '',/    repo: 'zh-qdwl\/zh-blog',/; s/    repoId: '',/    repoId: 'TEST_REPO_ID',/; s/    category: '',/    category: 'General',/; s/    categoryId: '',/    categoryId: 'TEST_CATEGORY_ID',/" src/consts.ts
npm run build
```

Expected: `30 page(s) built`，零报错

```bash
grep -o "giscus-mount" dist/guestbook/index.html | wc -l
```

Expected: `2` —— 一次是挂载 div 的 `id`，一次是脚本里的 `getElementById('giscus-mount')`

```bash
grep -o "giscus.app/client.js" dist/guestbook/index.html | wc -l
```

Expected: `1`

```bash
grep -o "TEST_REPO_ID" dist/guestbook/index.html | wc -l
```

Expected: `1`（证明 props 确实传到了组件里）

```bash
grep -c "iframe.giscus-frame" dist/guestbook/index.html
```

Expected: `1`（主题同步代码在）

- [ ] **Step 4: 改回 `none` 并确认恢复**

```bash
git checkout src/consts.ts
npm run build && npm test
```

Expected: `30 page(s) built`；112 tests passed。`git diff src/consts.ts` 应为空。

> **注意**：`git checkout src/consts.ts` 会丢掉 `src/consts.ts` 的所有未提交改动。Task 2 已经提交过它，所以这里安全。若本地另有未提交的 `consts.ts` 改动，改用手工编辑回退。

- [ ] **Step 5: 提交**

```bash
git add src/components/comments/CommentsGiscus.astro src/components/Comments.astro
git commit -m "feat: giscus 抽成独立组件并接上主题同步

giscus 是 iframe，CSS 变量透不进去，只能 postMessage 通知它换主题。
监听 <html data-theme> 的属性变化而不是给 #theme-toggle 绑点击——
属性变化是唯一真相，将来多一个切换入口也不用改这里。

Comments.astro 同时退化为纯分发器。"
```

---

### Task 5: `CommentsTwikoo.astro`

**Files:**
- Create: `src/components/comments/CommentsTwikoo.astro`
- Modify: `src/components/Comments.astro`（加 twikoo 分支 + 传 `path`）

**Interfaces:**
- Consumes: `NoScriptNotice.astro`（Task 4）、`normalizeCommentPath`（Task 1）、全局类 `.comments` / `.comments-mount`（Task 3/4）
- Produces: `CommentsTwikoo.astro`，props：
  ```ts
  interface Props {
    config: { envId: string; region: string };
    path: string;
    lazy: boolean;
  }
  ```

- [ ] **Step 1: 建组件**

创建 `src/components/comments/CommentsTwikoo.astro`：

```astro
---
import NoScriptNotice from './NoScriptNotice.astro';

interface Props {
  config: { envId: string; region: string };
  /** 评论线路径键，由 Comments.astro 用 normalizeCommentPath 算出 */
  path: string;
  lazy: boolean;
}
const { config, path, lazy } = Astro.props;

// 版本写死，不用 @latest。latest 会在某天静默换掉 DOM 结构，
// 而 comments.css 里那组 .tk-* / .el-* 覆盖是绑着结构的，会一起碎掉。
// 升级时改这一行，然后回去核对 comments.css 的 Twikoo 段。
const TWIKOO_VERSION = '1.7.19';
const cdn = `https://cdn.jsdelivr.net/npm/twikoo@${TWIKOO_VERSION}/dist/twikoo.min.js`;
---

<section class="comments" aria-label="评论">
  <div id="twikoo-mount" class="comments-mount"></div>
  <NoScriptNotice />
</section>

<script is:inline define:vars={{ cdn, envId: config.envId, region: config.region, path, lazy }}>
  (function () {
    const host = document.getElementById('twikoo-mount');
    if (!host) return;

    let loaded = false;
    function load() {
      if (loaded) return;
      loaded = true;
      const s = document.createElement('script');
      s.src = cdn;
      s.onload = function () {
        const opts = {
          envId: envId,
          el: '#twikoo-mount',
          // path 由构建期算出，不用 location.pathname——后者带不带尾斜杠取决于
          // 访客怎么进来，而 Twikoo 把两种形态当成两条独立评论线。
          path: path,
          lang: 'zh-CN',
        };
        // region 只有腾讯云要填。给 Vercel / Cloudflare 传空串会让它去连一个
        // 不存在的地域，所以留空时干脆不传这个键。
        if (region) opts.region = region;
        window.twikoo.init(opts);
      };
      document.head.appendChild(s);
    }

    if (lazy && window.__commentsWhenNear) window.__commentsWhenNear(host, load);
    else load();
  })();
</script>
```

> 本组件**不带 `<style>`**。`.comments` / `.comments-mount` / `.comments-hint` 都在 `src/styles/comments.css` 里，四个 provider 组件共用——各自再写一份就是逐字重复。

- [ ] **Step 2: 分发器加 twikoo 分支**

把 `src/components/Comments.astro` 整个文件替换为：

```astro
---
import { COMMENTS } from '../consts';
import { normalizeCommentPath } from '../lib/comments';
import CommentsFallback from './comments/CommentsFallback.astro';
import CommentsGiscus from './comments/CommentsGiscus.astro';
import CommentsTwikoo from './comments/CommentsTwikoo.astro';

interface Props {
  /** 懒加载：滚到附近才拉三方脚本。留言页应传 false */
  lazy?: boolean;
}
const { lazy = COMMENTS.lazyOnPosts } = Astro.props;

// 评论线的路径键。用构建期的规范路径，不让 widget 去读 location.pathname——
// 理由见 src/lib/comments.ts 的注释。
const path = normalizeCommentPath(Astro.url.pathname);
---

{COMMENTS.provider === 'giscus' && <CommentsGiscus config={COMMENTS.giscus} lazy={lazy} />}
{COMMENTS.provider === 'twikoo' && (
  <CommentsTwikoo config={COMMENTS.twikoo} path={path} lazy={lazy} />
)}
{COMMENTS.provider === 'none' && <CommentsFallback />}
```

- [ ] **Step 3: 临时切到 twikoo 验证产物**

```bash
sed -i "s/provider: 'none' as CommentProvider/provider: 'twikoo' as CommentProvider/" src/consts.ts
sed -i "s|    envId: '',|    envId: 'https://twikoo-test.example.workers.dev',|" src/consts.ts
npm run build
```

Expected: `30 page(s) built`，零报错

```bash
grep -o "twikoo@1.7.19/dist/twikoo.min.js" dist/guestbook/index.html
```

Expected: 输出一次

```bash
grep -o 'const path = "/guestbook/";' dist/guestbook/index.html
```

Expected: 输出一次。**关键断言**——证明路径键是构建期算出的规范形态（带尾斜杠），不是 `location.pathname`

> 这个断言的字面形态取自 Astro `define:vars` 的实现（`node_modules/astro/dist/runtime/server/render/util.js` 的 `defineScriptVars`）：它逐个变量输出 `const ${key} = ${JSON.stringify(value)};`，只把 `</script>` 转义掉，斜杠不转义。所以产物里就是 `const path = "/guestbook/";` 这一行。

```bash
grep -o 'const path = "/blog/tmux-guide/";' dist/blog/tmux-guide/index.html
```

Expected: 输出一次。证明文章页各自拿到自己的路径键

```bash
grep -cE "path:\s*location\.pathname" dist/guestbook/index.html
```

Expected: `0`。**关键断言**——确认没有任何地方退回去读浏览器当前路径。

> **不要**改用 `grep -c "location.pathname"`：那样会得到 `1`，因为组件里那句解释性注释本身就写着 `location.pathname`，而 `is:inline` 脚本连注释一起原样进产物。断言必须只盯**可执行位置**，否则它会因为代码注释得清楚而失败——那是荒谬的激励。

- [ ] **Step 4: 改回 `none` 并确认恢复**

```bash
git checkout src/consts.ts
npm run build && npm test
```

Expected: `30 page(s) built`；112 tests passed；`git diff src/consts.ts` 为空

- [ ] **Step 5: 提交**

```bash
git add src/components/comments/CommentsTwikoo.astro src/components/Comments.astro
git commit -m "feat: Twikoo 接入组件

path 由构建期的 normalizeCommentPath 算出后渲染进 init()，不读
location.pathname——Twikoo 把带斜杠与不带斜杠当成两条独立评论线。

CDN 版本写死 1.7.19 不用 latest：latest 会某天静默换掉 DOM 结构，
而 comments.css 的 .tk-* 覆盖绑着结构，会一起碎掉。

region 留空时不传这个键，避免 Vercel/Cloudflare 去连一个不存在的地域。"
```

---

### Task 6: `CommentsWaline.astro`

**Files:**
- Create: `src/components/comments/CommentsWaline.astro`
- Modify: `src/components/Comments.astro`（加 waline 分支）

**Interfaces:**
- Consumes: `NoScriptNotice.astro`（Task 4）、`normalizeCommentPath`（Task 1，经分发器）、全局类 `.comments` / `.comments-mount`（Task 3/4）
- Produces: `CommentsWaline.astro`，props：
  ```ts
  interface Props {
    config: { serverURL: string };
    path: string;
    lazy: boolean;
  }
  ```

**为什么保留 Waline：** 用户倾向 Twikoo，但 Twikoo 恰好脆在换肤上（无官方 CSS 变量、无暗色选项）。这个组件是退路，改 `COMMENTS.provider` 一行就能切走，不必重做集成层。成本是一个三十行组件。

- [ ] **Step 1: 建组件**

创建 `src/components/comments/CommentsWaline.astro`：

```astro
---
import NoScriptNotice from './NoScriptNotice.astro';

interface Props {
  config: { serverURL: string };
  /** 评论线路径键，由 Comments.astro 用 normalizeCommentPath 算出 */
  path: string;
  lazy: boolean;
}
const { config, path, lazy } = Astro.props;

// 版本锁在 v3 大版本。Waline 的 CSS 变量名是 comments.css 里那张映射表的依据，
// 跨大版本可能改名，升级时要回去核对。
const WALINE_CSS = 'https://unpkg.com/@waline/client@v3/dist/waline.css';
const WALINE_JS = 'https://unpkg.com/@waline/client@v3/dist/waline.js';
---

<section class="comments" aria-label="评论">
  <div id="waline-mount" class="comments-mount"></div>
  <NoScriptNotice />
</section>

<script is:inline define:vars={{ WALINE_CSS, WALINE_JS, serverURL: config.serverURL, path, lazy }}>
  (function () {
    const host = document.getElementById('waline-mount');
    if (!host) return;

    let loaded = false;
    function load() {
      if (loaded) return;
      loaded = true;

      // 样式也放到 load() 里注入，懒加载时才不会白拉一个请求
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = WALINE_CSS;
      // 必须插到本站第一张样式表**之前**，不能用 appendChild。
      // waline.css 里有一整块无条件的 :root 浅色默认值（--waline-bg-color:#fff 等），
      // 与 comments.css 里的令牌映射同为 :root、权重相同（0,1,0）——权重打平时后来者胜。
      // appendChild 会让 Waline 排在后面，于是它把整片映射盖掉，浅色深色一起失效。
      // 查 style 也查 link：Astro 的 inlineStylesheets:'auto' 可能把本站 CSS 内联成 <style>。
      const firstSheet = document.head.querySelector('link[rel="stylesheet"], style');
      if (firstSheet) document.head.insertBefore(link, firstSheet);
      else document.head.appendChild(link);

      // Waline 客户端是 ES module，用动态 import 加载
      import(WALINE_JS).then(function (mod) {
        mod.init({
          el: '#waline-mount',
          serverURL: serverURL,
          path: path,
          lang: 'zh-CN',
          // 刻意不传 dark：它会注入
          // html[data-theme="dark"] { --waline-bg-color: #1e1e1e; ... } 一整组硬编码值，
          // 权重高于 comments.css 里写在 :root 的映射，深色下会把映射整片盖掉。
          // 映射目标（--card / --text / --border）本身已跟着 data-theme 翻，
          // 深色是自动跟上的，传 dark 只会打架。
        });
      });
    }

    if (lazy && window.__commentsWhenNear) window.__commentsWhenNear(host, load);
    else load();
  })();
</script>
```

> 本组件**不带 `<style>`**。`.comments` / `.comments-mount` / `.comments-hint` 都在 `src/styles/comments.css` 里，四个 provider 组件共用——各自再写一份就是逐字重复。

- [ ] **Step 2: 分发器加 waline 分支**

把 `src/components/Comments.astro` 整个文件替换为：

```astro
---
import { COMMENTS } from '../consts';
import { normalizeCommentPath } from '../lib/comments';
import CommentsFallback from './comments/CommentsFallback.astro';
import CommentsGiscus from './comments/CommentsGiscus.astro';
import CommentsTwikoo from './comments/CommentsTwikoo.astro';
import CommentsWaline from './comments/CommentsWaline.astro';

interface Props {
  /** 懒加载：滚到附近才拉三方脚本。留言页应传 false */
  lazy?: boolean;
}
const { lazy = COMMENTS.lazyOnPosts } = Astro.props;

// 评论线的路径键。用构建期的规范路径，不让 widget 去读 location.pathname——
// 理由见 src/lib/comments.ts 的注释。
const path = normalizeCommentPath(Astro.url.pathname);
---

{COMMENTS.provider === 'giscus' && <CommentsGiscus config={COMMENTS.giscus} lazy={lazy} />}
{COMMENTS.provider === 'twikoo' && (
  <CommentsTwikoo config={COMMENTS.twikoo} path={path} lazy={lazy} />
)}
{COMMENTS.provider === 'waline' && (
  <CommentsWaline config={COMMENTS.waline} path={path} lazy={lazy} />
)}
{COMMENTS.provider === 'none' && <CommentsFallback />}
```

- [ ] **Step 3: 临时切到 waline 验证产物**

```bash
sed -i "s/provider: 'none' as CommentProvider/provider: 'waline' as CommentProvider/" src/consts.ts
sed -i "s|    serverURL: '',|    serverURL: 'https://waline-test.example.vercel.app',|" src/consts.ts
npm run build
```

Expected: `30 page(s) built`，零报错

```bash
grep -o "@waline/client@v3/dist/waline.js" dist/guestbook/index.html
```

Expected: 输出一次

```bash
grep -o 'const path = "/guestbook/";' dist/guestbook/index.html
```

Expected: 输出一次

```bash
grep -cE 'dark\s*:' dist/guestbook/index.html
```

Expected: `0`。**关键断言**——确认没有误传 `dark` 选项（传了会把深色映射整片盖掉）

> 这个正则不会误命中 `BaseLayout` 里的主题初始化脚本：那里写的是 `? 'dark' : 'light'`，`dark` 后面隔着一个引号才到冒号，`dark\s*:` 匹配不上。`data-theme="dark"` 与 `prefers-color-scheme: dark)` 同理都不含 `dark:`。

- [ ] **Step 4: 改回 `none` 并确认恢复**

```bash
git checkout src/consts.ts
npm run build && npm test
```

Expected: `30 page(s) built`；112 tests passed；`git diff src/consts.ts` 为空

- [ ] **Step 5: 提交**

```bash
git add src/components/comments/CommentsWaline.astro src/components/Comments.astro
git commit -m "feat: Waline 接入组件，作为 Twikoo 换肤不理想时的退路

刻意不传 dark 选项：它会注入 html[data-theme=dark] 下一整组硬编码深色值，
权重高于写在 :root 的变量映射，深色下把映射整片盖掉。映射目标本身已跟着
data-theme 翻，深色自动跟上。

CSS 也放到 load() 里注入，懒加载时才不会白拉一个请求。"
```

---

### Task 7: `comments.css` —— 三方 widget 映射到本站令牌

**Files:**
- Modify: `src/styles/comments.css`（追加两段三方换肤；文件与 `global.css` 的引入已在 Task 3 完成，共享外壳样式与 `.comments-mount` 也已在 Task 3/4 落地——**本任务只追加，不重写已有内容**）

**Interfaces:**
- Consumes: widget 自身的类名与 CSS 变量
- Produces: 无 JS 接口

> **本任务有一半无法验收。** Waline 那段是逐个核对过官方 style 参考页的变量映射，可靠。**Twikoo 那段是盲写的**——它的 widget 要连上后端才渲染完整 DOM，后端未部署，看不到真实的 `.tk-*` / `.el-*` 结构。提交信息与文件头注释都必须写明这一点，不许当成做完了。

- [ ] **Step 1: 往 `comments.css` 末尾追加两段换肤**

在 `src/styles/comments.css` 现有内容（共享外壳 + `.comments-mount`）之后追加：

```css
/* ===== 以下是三方 widget 的外观映射 =====
   目标是让接进来的评论区看着像本站的一部分，而不是一块补丁。
   两个 provider 的处境完全不同，分两段处理。

   ⚠️ Twikoo 那一段（本文件末尾）在写下时后端尚未部署，widget 渲染不出完整 DOM，
      因此那些选择器是照官方文档与社区教程盲写的，可能对不上、也可能有遗漏。
      Worker 部署完成后必须回来对着真实 DOM 走一轮目视调整。 */

/* ===== Waline =====
   它暴露官方 CSS 变量，映射一遍就完事。变量名逐个核对过官方 style 参考页——
   写错不会报错，只会静默不生效。

   刻意不启用 Waline 的 dark 选项：那会注入
   html[data-theme="dark"] { --waline-bg-color: #1e1e1e; ... } 一整组硬编码深色值，
   权重高于这里写在 :root 上的映射，深色下把映射整片盖掉。
   下面映射到的令牌（--card / --text / --border）本身已经跟着 data-theme 翻过一轮，
   深色是自动跟上的。

   为什么是 `:root, #waline-mount` 两个选择器、而不是只写 `:root`：
   waline.css 自带一整块无条件的 :root 浅色默认值，与本块同权重（0,1,0），
   打平时靠源码顺序决胜。CommentsWaline.astro 已用 insertBefore 把 Waline 的样式表
   插到本站样式表之前来保证本块在后（那个保证由 Step 3b 的断言守着），
   但那只覆盖 load() 执行时 <head> 里已有的节点——将来若有别的懒加载组件在更晚
   append 一张样式表，同类问题会换个地方复现。
   #waline-mount 是 ID 选择器（1,0,0），无条件压过任何 :root，与顺序无关，
   为挂载区内的元素补上第二道保险。
   两个选择器共用同一个声明块，所以变量表只有一份，不是抄两遍。
   保留 :root 那一半是必要的：万一 Waline 把某些 UI（图片预览遮罩之类）挂到
   #waline-mount 之外，那些元素继承不到挂载元素上的变量，只能靠 :root 兜住。 */
:root,
#waline-mount {
  --waline-font-size: 0.95rem;
  --waline-theme-color: var(--brand-strong);
  --waline-active-color: var(--brand);
  --waline-color: var(--text);
  --waline-bg-color: var(--card);
  --waline-bg-color-light: var(--bg-soft);
  --waline-bg-color-hover: var(--bg-soft);
  --waline-border-color: var(--border);
  --waline-info-color: var(--text-soft);
  --waline-info-bg-color: var(--bg-soft);
  --waline-code-bg-color: var(--code-bg);
  --waline-bq-color: var(--bg-soft);
  --waline-badge-color: var(--brand-strong);
  --waline-box-shadow: var(--shadow);
}

/* ===== Twikoo =====
   ⚠️ 未经真实 DOM 验证，见文件头。
   Twikoo 没有官方 CSS 变量、也没有暗色选项，只能覆盖它的类名。
   官方文档自己也推荐用外部 CSS + !important 来盖（因为它的配置项存在数据库里、
   加载有延迟），所以这里的 !important 不是偷懒，是官方姿势。

   范围刻意收窄到「不改就明显不像本站」的几处：容器背景、边框、输入框、按钮、
   链接色、次要文字。不做整体魔改——覆盖越多，升级时碎得越彻底。 */
/* 容器背景与文字：background 设为 transparent，不让 Twikoo 给自己的容器刷底色，
   把背景交给页面本身——它原本要是没背景，这行就是空操作；要是有（大概率是白色），
   这行就是深色模式下不会糊成一块亮板的关键。color 则让容器内文字跟本站正文令牌走，
   不用 Twikoo 自带的默认灰。

   注意这里刻意**不猜**一个不透明底色。去掉一个不透明背景是安全动作，
   编一个颜色不是——而这一段本来就是盲写的。 */
.twikoo .tk-comments,
.twikoo .tk-submit {
  background: transparent !important;
  color: var(--text);
}

/* 输入框：Twikoo 用的是 element-ui（Vue 2 那一代），类名带 el- 前缀。
   别写成 element-plus——那是 Vue 3 的后继项目，Twikoo 并没有用它，
   两者部分类名不同，认错了会照着错的文档去找选择器。 */
.twikoo .el-textarea__inner,
.twikoo .el-input__inner {
  background: var(--card) !important;
  border-color: var(--border) !important;
  color: var(--text) !important;
  border-radius: var(--radius) !important;
}
.twikoo .el-textarea__inner {
  min-height: 120px !important;
}
.twikoo .el-textarea__inner:focus,
.twikoo .el-input__inner:focus {
  border-color: var(--brand) !important;
}

/* 发送按钮：本站按钮是圆角胶囊 + 品牌底 + 深色字 */
.twikoo .tk-submit .tk-row-actions .el-button--primary {
  background: var(--brand) !important;
  border-color: var(--brand) !important;
  color: var(--brand-ink) !important;
  border-radius: 999px !important;
}

/* 次要文字：时间、UA 徽章、楼层信息 */
.twikoo .tk-time,
.twikoo .tk-extras,
.twikoo .tk-nick-link {
  color: var(--text-soft) !important;
}

/* 链接色统一走本站的 --link */
.twikoo a {
  color: var(--link);
}

/* 分隔线 */
.twikoo .tk-comment {
  border-color: var(--border) !important;
}
```

- [ ] **Step 2: 确认没有动到 Task 3/4 已经落地的部分**

```bash
git diff --stat src/styles/
```

Expected: 只有 `src/styles/comments.css` 一个文件有改动，且是纯新增行（`git diff src/styles/comments.css` 里不应出现以 `-` 开头的行，`global.css` 不应出现）。本任务只追加换肤，共享外壳与 `@import` 在 Task 3/4 已经就位。

- [ ] **Step 3: 构建并断言产物**

```bash
npm run build
```

Expected: `30 page(s) built`，零报错

```bash
grep -l "waline-theme-color" dist/_astro/*.css dist/guestbook/index.html
```

Expected: 至少列出一个文件

```bash
grep -l "comments-mount" dist/_astro/*.css dist/guestbook/index.html
```

Expected: 至少列出一个文件

- [ ] **Step 3b: 验证级联真的是本站映射胜出**

Waline 的 `waline.css` 自带一整块无条件的 `:root` 浅色默认值，与本文件的映射**同为 `:root`、权重相同**（0,1,0）。权重打平时由源码顺序决定，所以映射能不能生效取决于两张样式表谁在后面。`CommentsWaline.astro` 已经用 `insertBefore` 把 Waline 的样式表插到本站第一张样式表之前来保证这一点（Task 6 的修复），本步骤是复查那个保证还在：

```bash
grep -c "insertBefore" src/components/comments/CommentsWaline.astro
```

Expected: `1`。**关键断言**——如果有人把它改回 `appendChild`，本文件这整张映射表会静默失效（浅色深色一起），页面上看不出任何报错。

```bash
grep -c "appendChild(link)" src/components/comments/CommentsWaline.astro
```

Expected: `1`（只剩 `head` 里一张样式表都没有时的兜底分支）。

> **为什么两处都搜**：Astro 的 `build.inlineStylesheets` 默认是 `'auto'`——小于阈值的样式表会被内联进 `<head>` 的 `<style>`，大于阈值的才输出成 `dist/_astro/*.css` 外链。本仓库当前是外链形态（`dist/_astro/about.*.css` 里能查到 `--brand-strong`），但这个分界会随 CSS 体积漂移。**只搜 `dist/_astro/*.css` 已经在前三轮造成过三次假失败**（见 `.superpowers/sdd/progress.md` 里记的同类计划缺陷），所以这里一律两处都搜。

- [ ] **Step 4: 确认变量名没写错**

```bash
grep -o -- "--waline-[a-z-]*" src/styles/comments.css | sort -u
```

Expected: 输出下面这 14 个，逐个与官方 style 参考页核对。**特别确认没有 `--waline-text-color` 或 `--waline-border-radius`——这两个不存在**：

```
--waline-active-color
--waline-badge-color
--waline-bg-color
--waline-bg-color-hover
--waline-bg-color-light
--waline-border-color
--waline-box-shadow
--waline-bq-color
--waline-code-bg-color
--waline-color
--waline-font-size
--waline-info-bg-color
--waline-info-color
--waline-theme-color
```

- [ ] **Step 5: 跑全量测试**

```bash
npm test
```

Expected: 112 tests passed

- [ ] **Step 6: 提交**

```bash
git add src/styles/comments.css
git commit -m "feat: 三方评论 widget 的外观映射

Waline 段是逐个核对官方 style 参考页的变量映射，可靠；刻意不启用它的
dark 选项，理由写在文件注释里。

⚠️ Twikoo 段未经真实 DOM 验证：widget 要连上后端才渲染完整 DOM，后端尚未
部署，那些 .tk-* / .el-* 选择器是照官方文档与社区教程盲写的，可能对不上。
Worker 部署完成后必须回来对着真实 DOM 走一轮。文件头注释已标明。

覆盖范围刻意收窄到几处必要元素——覆盖越多，升级时碎得越彻底。"
```

---

### Task 8: 文章页评论区懒加载

**Files:**
- Modify: `src/components/Comments.astro`（加共享的 `__commentsWhenNear` helper）

**Interfaces:**
- Consumes: 无
- Produces: `window.__commentsWhenNear(el: Element, load: () => void)` —— Task 4/5/6 三个组件已经在调它，本任务补上它的定义

**为什么挂在 `window` 上：** `is:inline` 脚本之间无法 `import`，共享逻辑只能借 `window`。三个 provider 组件都调同一个函数，避免各写一份 IntersectionObserver。虽然一次构建只会渲染一个 provider，源码层仍要 DRY——改 `rootMargin` 时只有一处。

> 注意 Task 4/5/6 的组件里写的是 `if (lazy && window.__commentsWhenNear)`。helper 缺失时会退化为立即加载，所以那三个 Task 单独验收时不会崩，只是懒加载不生效。本任务把它补齐。

- [ ] **Step 1: 在分发器里加 helper**

把 `src/components/Comments.astro` 整个文件替换为：

```astro
---
import { COMMENTS } from '../consts';
import { normalizeCommentPath } from '../lib/comments';
import CommentsFallback from './comments/CommentsFallback.astro';
import CommentsGiscus from './comments/CommentsGiscus.astro';
import CommentsTwikoo from './comments/CommentsTwikoo.astro';
import CommentsWaline from './comments/CommentsWaline.astro';

interface Props {
  /** 懒加载：滚到附近才拉三方脚本。留言页应传 false */
  lazy?: boolean;
}
const { lazy = COMMENTS.lazyOnPosts } = Astro.props;

// 评论线的路径键。用构建期的规范路径，不让 widget 去读 location.pathname——
// 理由见 src/lib/comments.ts 的注释。
const path = normalizeCommentPath(Astro.url.pathname);

// helper 只在真要懒加载时才输出，provider='none' 或留言页不用白搭一段脚本
const needsLazyHelper = lazy && COMMENTS.provider !== 'none';
---

{needsLazyHelper && (
  <script is:inline>
    {/* is:inline 脚本之间无法 import，共享逻辑只能挂在 window 上。
        三个 provider 组件都调它，避免各写一份 IntersectionObserver——
        改 rootMargin 时只有这一处。 */}
    window.__commentsWhenNear = function (el, load) {
      // 极老浏览器没有 IntersectionObserver：直接加载，不引 polyfill。
      // 评论区读不到比多一个 polyfill 更糟。
      if (!('IntersectionObserver' in window)) {
        load();
        return;
      }
      var io = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
              io.disconnect();
              load();
              return;
            }
          }
        },
        // 提前 400px 开始加载，滚到评论区时脚本通常已经就位
        { rootMargin: '400px' }
      );
      io.observe(el);
    };
  </script>
)}

{COMMENTS.provider === 'giscus' && <CommentsGiscus config={COMMENTS.giscus} lazy={lazy} />}
{COMMENTS.provider === 'twikoo' && (
  <CommentsTwikoo config={COMMENTS.twikoo} path={path} lazy={lazy} />
)}
{COMMENTS.provider === 'waline' && (
  <CommentsWaline config={COMMENTS.waline} path={path} lazy={lazy} />
)}
{COMMENTS.provider === 'none' && <CommentsFallback />}
```

- [ ] **Step 2: 临时切到 twikoo 验证懒加载只出现在文章页**

```bash
sed -i "s/provider: 'none' as CommentProvider/provider: 'twikoo' as CommentProvider/" src/consts.ts
sed -i "s|    envId: '',|    envId: 'https://twikoo-test.example.workers.dev',|" src/consts.ts
npm run build
```

Expected: `30 page(s) built`，零报错

```bash
grep -o "window.__commentsWhenNear = function" dist/blog/tmux-guide/index.html | wc -l
```

Expected: `1`。文章页有 helper（`lazyOnPosts` 默认 `true`）。

> **必须只数 helper 的定义，不能裸 grep `__commentsWhenNear`**：三个 provider 组件里那句 `if (lazy && window.__commentsWhenNear)` 无论 `lazy` 真假都会原样进产物，所以裸串在关掉懒加载的页面上照样出现 2 次。`rootMargin` 也只存在于 helper 里，可以作为同样可靠的判据。

```bash
grep -o "window.__commentsWhenNear = function" dist/guestbook/index.html | wc -l
```

Expected: `1`。留言页此刻还没传 `lazy={false}`（那是 Task 9 的事），所以它走的是默认值 `COMMENTS.lazyOnPosts = true`，helper 照样会输出。这是本阶段的正确状态，不是缺陷——Task 9 Step 3 会把它翻成 `0` 并复查。

```bash
grep -o "rootMargin" dist/blog/tmux-guide/index.html | wc -l
```

Expected: `3`

- [ ] **Step 3: 改回 `none` 并确认 helper 不输出**

```bash
git checkout src/consts.ts
npm run build
grep -o "window.__commentsWhenNear = function" dist/blog/tmux-guide/index.html | wc -l
```

Expected: `0`。provider='none' 时不该白搭一段脚本

- [ ] **Step 4: 跑全量测试**

```bash
npm test
```

Expected: 112 tests passed

- [ ] **Step 5: 提交**

```bash
git add src/components/Comments.astro
git commit -m "feat: 文章页评论区懒加载

滚到评论区前 400px 才拉三方脚本，不拖累文章页首屏。

共享的 whenNear helper 挂在 window 上——is:inline 脚本之间无法 import，
这是唯一的共享途径；三个 provider 都调它，改 rootMargin 只有一处。
provider='none' 或不需懒加载时不输出这段脚本。

没有 IntersectionObserver 的老浏览器直接加载，不引 polyfill：
评论区读不到比多一个 polyfill 更糟。"
```

---

### Task 9: 留言页外壳润色

**Files:**
- Modify: `src/pages/guestbook.astro`

**Interfaces:**
- Consumes: `Comments.astro`（Task 8 的最终版）
- Produces: 无

**范围约束：** 保持素调子，与 `/about` 一致。**不加彩色 banner、不加头图、不引入任何新颜色令牌**——用户明确要求。

- [ ] **Step 1: 改页面**

把 `src/pages/guestbook.astro` 整个文件替换为：

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Comments from '../components/Comments.astro';
---

<BaseLayout title="留言" description="留言与交流" layout="plain">
  <article>
    <header class="article-header">
      <h1>留言</h1>
      <p class="lead">路过留个脚印，或者聊聊你在折腾什么。看到都会回。</p>
      <p class="notice">
        邮箱只用于回复通知，不会公开显示，也不会出现在页面源码里。正文支持 Markdown。
      </p>
    </header>
    <!-- 留言区就是这一页的主体内容，懒加载没有意义，显式关掉 -->
    <Comments lazy={false} />
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
    margin: 0 0 10px;
    color: var(--text-soft);
  }
  /* 留言须知：比 lead 再轻一档，是提示而不是正文 */
  .notice {
    margin: 0;
    color: var(--text-soft);
    font-size: 0.85rem;
    line-height: 1.7;
  }
</style>
```

> 文案说明：刻意**不写回复时效**（"24 小时内回复"这类）——那是可能兑现不了的承诺，写了做不到比不写更糟。"看到都会回"是不带时限的表述。

- [ ] **Step 2: 构建并断言产物**

```bash
npm run build
```

Expected: `30 page(s) built`，零报错

```bash
grep -c "邮箱只用于回复通知" dist/guestbook/index.html
```

Expected: `1`

```bash
grep -c "正文支持 Markdown" dist/guestbook/index.html
```

Expected: `1`

- [ ] **Step 3: 复查 Task 8 留下的那条断言**

```bash
sed -i "s/provider: 'none' as CommentProvider/provider: 'twikoo' as CommentProvider/" src/consts.ts
sed -i "s|    envId: '',|    envId: 'https://twikoo-test.example.workers.dev',|" src/consts.ts
npm run build
grep -o "window.__commentsWhenNear = function" dist/guestbook/index.html | wc -l
```

Expected: `0`。**关键断言**——留言页现在传了 `lazy={false}`，不再输出懒加载 helper

```bash
grep -o "window.__commentsWhenNear = function" dist/blog/tmux-guide/index.html | wc -l
```

Expected: `1`。文章页仍然懒加载

```bash
git checkout src/consts.ts
npm run build && npm test
```

Expected: `30 page(s) built`；112 tests passed；`git diff src/consts.ts` 为空

- [ ] **Step 4: 本地目视确认**

```bash
npm run dev
```

打开 `http://localhost:4321/guestbook`，确认：标题区三行文案层级清楚（h1 → lead → 更轻的 notice）；下方是「想聊两句？」卡片，两个按钮可点；切换深浅色两遍，文字都读得清。

- [ ] **Step 5: 提交**

```bash
git add src/pages/guestbook.astro
git commit -m "feat: 留言页外壳润色，补留言须知

保持素调子与 /about 一致，不加彩色 banner、不引入新颜色令牌。
须知刻意不写回复时效——那是可能兑现不了的承诺，写了做不到比不写更糟。

显式传 lazy={false}：留言区就是这一页的主体，懒加载没有意义。"
```

---

### Task 10: 后端部署文档 + README 更新

**Files:**
- Create: `docs/comments-backend.md`
- Modify: `README.md`（目录结构段 + 页面路由段）

**Interfaces:**
- Consumes: 无
- Produces: 无代码接口

**约束：** 步骤来自 2026-08-19 对 [twikoojs/twikoo-cloudflare](https://github.com/twikoojs/twikoo-cloudflare) README 的核实。文档里必须注明核实日期并声明「以仓库 README 为准」——第三方部署脚本变动频繁，写死的步骤总会过期，但注明日期的步骤至少不会骗人。**不要编造控制台里的按钮名字。**

- [ ] **Step 1: 建 `docs/comments-backend.md`**

创建 `docs/comments-backend.md`：

```markdown
# 接一个能真正留言的评论后端

本站前端已经把四档 provider 都写好了（见 `src/consts.ts` 的 `COMMENTS`），
差的只有后端。这份文档只详写一条路径：**Twikoo + Cloudflare Workers + D1 + R2**。

只写一条是刻意的——短的文档才会被真的照着做。另一条退路在最后一节，两行带过。

> **步骤核实于 2026-08-19**，来源是 [twikoojs/twikoo-cloudflare](https://github.com/twikoojs/twikoo-cloudflare)
> 的 README。第三方部署脚本变动频繁，**执行前请先扫一遍仓库 README，以它为准**。

## 为什么选这条

| | Twikoo | Waline |
|---|---|---|
| 官方支持 Cloudflare Workers | 是 | 否，只有第三方移植 |
| CF 版数据库 | Cloudflare D1（图片走 R2） | — |
| 官方 CSS 变量换肤 | **无** | 有 |
| 官方暗色模式选项 | **无** | 有 |

选 Twikoo 的理由是后端能跟博客同平台（本站在 `*.workers.dev`），国内可达性与
博客本体一致，且数据库和图床都用 Cloudflare 自家的，不需要第三方账号。
代价是换肤只能覆盖它的类名，跨版本容易碎——`src/styles/comments.css` 里那段
Twikoo 覆盖已经标注了这一点。

## 已知限制（部署前先看，别等做完才发现）

来自 `twikoo-cloudflare` README，照实抄录：

| 限制 | 影响 |
|---|---|
| 免费版 Worker 有 1MiB 体积上限，需先清空三个 `node_modules` 文件 | 多一个部署步骤 |
| 必须用 `wrangler` 命令行，不能只在控制台点 | 本地要有 Node 环境 |
| 带斜杠 / 不带斜杠的 URL 视为两条独立评论线 | **本站已处理**，见 `src/lib/comments.ts` |
| 环境变量控制不了应用行为 | 配置改动走 Twikoo 管理面板 |
| 不支持 IP 归属地 | 无影响，UA 徽章不依赖 IP |
| 图片上传需另建 R2 bucket | 不建就是不支持传图 |
| XSS 过滤用 `xss` 包而非 `dompurify` | 无影响 |
| 官方对这条部署路径的评级 | ★★☆☆☆ |

## 步骤

**执行人标注**：🧑 = 只能你自己做（涉及账号授权或填写凭据），⌨️ = 普通命令。

1. ⌨️ clone 后端仓库并装依赖

   ```bash
   git clone https://github.com/twikoojs/twikoo-cloudflare
   cd twikoo-cloudflare
   npm install
   ```

2. ⌨️ 清空三个文件绕过免费版 1MiB 体积上限

   ```bash
   echo "" > node_modules/jsdom/lib/api.js
   echo "" > node_modules/tencentcloud-sdk-nodejs/tencentcloud/index.js
   echo "" > node_modules/nodemailer/lib/nodemailer.js
   ```

   看着很脏，但这是 README 写的官方做法：这三个包只在别的部署方式下用得到，
   在 Cloudflare 版里是纯体积负担。

3. 🧑 授权 Cloudflare。会打开浏览器让你登录并授权，这一步只能你自己点。

   ```bash
   npx wrangler login
   ```

4. ⌨️ 建 D1 数据库

   ```bash
   npx wrangler d1 create twikoo
   ```

5. ⌨️ 把上一步返回的 `database_name` 与 `database_id` 填进 `wrangler.toml`

6. ⌨️ 建表

   ```bash
   npx wrangler d1 execute twikoo --remote --file=./schema.sql
   ```

7. ⌨️ 需要支持传图再做这两步；不需要就跳过

   ```bash
   npx wrangler r2 bucket create twikoo
   ```

   然后把 bucket 的公开访问域名填进 `wrangler.toml` 的 `R2_PUBLIC_URL`。

8. ⌨️ 部署

   ```bash
   npx wrangler deploy --minify
   ```

   记下它输出的 Worker 地址，下一步要用。

9. ⌨️ 回到本仓库，改 `src/consts.ts`：

   ```ts
   provider: 'twikoo' as CommentProvider,
   // ...
   twikoo: {
     envId: '上一步那个 Worker 地址',
     region: '',   // 留空。这个字段只有腾讯云要填
   },
   ```

   然后 `npm test` —— `consts.test.ts` 会检查 `envId` 非空，填漏了会直接红。

10. 🧑 打开 `/guestbook`，按 Twikoo 的引导设管理密码。密码只能你自己设。

11. 🧑 想要邮件通知的话，在 Cloudflare 控制台给 Worker 加这几个环境变量
    （需要 SendGrid 或 MailChannels 账号，凭据只能你自己填）：
    `SENDER_EMAIL`、`SENDER_NAME`、`SMTP_SERVICE`、`SMTP_USER`、`SMTP_PASS`

## 部署完成后必须补的一件事

`src/styles/comments.css` 里那段 Twikoo 类名覆盖是在**后端还没部署时盲写的**——
当时看不到 widget 的真实 DOM。Worker 跑起来之后：

1. 打开 `/guestbook`，深浅色各切一遍
2. 对着真实 DOM 核对那些 `.tk-*` / `.el-*` 选择器，改掉对不上的、补上漏掉的
3. 把文件头那段「未经真实 DOM 验证」的警告删掉

## 退路：换成 Waline

如果 Twikoo 换肤怎么调都不满意，前端已经准备好了：改 `COMMENTS.provider` 为
`'waline'`、填 `waline.serverURL` 即可，集成层不用重做。
后端部署见 [Waline 官方文档](https://waline.js.org/guide/deploy/)——它官方不支持
Cloudflare，得走 Vercel 等平台，注意国内访问速度。

数据库可以选它支持的「GitHub 仓库存 CSV」，那样连数据库都不用开。
```

- [ ] **Step 2: 更新 README 的目录结构段**

在 `README.md` 的目录结构代码块里，`├── components/` 那一行下方补一行，并在 `lib/` 说明里补一句。找到：

```
├── components/        # 页头、页脚、文章卡片等组件
```

替换为：

```
├── components/        # 页头、页脚、文章卡片等组件
│   └── comments/      # 评论区：四档 provider 各一个组件 + 共用的联系方式链接
```

找到 `└── styles/` 那两行说明，在末尾补上 `comments`。把：

```
└── styles/             # tokens（配色变量）/ base（重置与排版）/ layout（网格与断点）
                        # / motion（入场动效），global.css 只是汇总引入以上四个文件
```

替换为：

```
└── styles/             # tokens（配色变量）/ base（重置与排版）/ layout（网格与断点）
                        # / motion（入场动效）/ comments（三方评论 widget 的外观映射）
                        # global.css 只是汇总引入以上五个文件
```

- [ ] **Step 3: 在 README 里加一节说明留言怎么开**

在 README 的「## 换首页的整屏底图」这一节**之前**插入新的一节：

```markdown
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
```

- [ ] **Step 4: 更新 README 的页面路由段**

找到：

```
- `/guestbook` —— 留言
```

替换为：

```
- `/guestbook` —— 留言（评论系统见下方「打开留言功能」）
```

- [ ] **Step 5: 构建与测试**

```bash
npm run build && npm test
```

Expected: `30 page(s) built`，零报错；112 tests passed

- [ ] **Step 6: 核对文档里没有编造的步骤**

```bash
grep -n "wrangler" docs/comments-backend.md
```

Expected: 只出现 `wrangler login`、`wrangler d1 create`、`wrangler d1 execute`、`wrangler r2 bucket create`、`wrangler deploy --minify` 这五条命令，与 README 核实结果一致，没有多出别的。

```bash
grep -c "MongoDB" docs/comments-backend.md
```

Expected: `0`。**关键断言**——CF Workers 版用 D1，完全不碰 MongoDB。设计初稿曾把这条路径错写成「+ MongoDB Atlas」，别让它渗回文档。

- [ ] **Step 7: 提交**

```bash
git add docs/comments-backend.md README.md
git commit -m "docs: Twikoo + CF Workers + D1 部署文档，README 补留言说明

只详写一条路径——短的文档才会被真的照着做，Waline 退路两行带过。

步骤核实于 2026-08-19 的 twikoo-cloudflare README，文档里注明核实日期并
声明以仓库 README 为准。每步标了执行人：wrangler login、设管理密码、
填 SMTP 凭据这几步只能本人做。

已知限制单列一表放在步骤之前，包括免费版 1MiB 体积上限那三行 echo、
传图要另开 R2、官方评级 ★★☆☆☆。

另附「部署完成后必须补的一件事」：回来核对 comments.css 里盲写的
Twikoo 类名覆盖。"
```

---

## Self-Review

**1. Spec 覆盖检查**

| Spec 要求 | 落在哪 |
|---|---|
| `COMMENTS` 扩四档 + `lazyOnPosts` | Task 2 |
| `consts.test.ts` 必填字段守卫 | Task 2 |
| `ContactLinks.astro` 单一来源 + 搬坑注释 | Task 3 |
| `CommentsFallback.astro` +「即将开放」文案 | Task 3 |
| `Comments.astro` 退化为纯分发器 | Task 4 建立，Task 5/6/8 逐步补全分支 |
| `CommentsGiscus.astro` + iframe 主题同步 | Task 4 |
| `CommentsTwikoo.astro` | Task 5 |
| `CommentsWaline.astro`（不传 `dark`） | Task 6 |
| `normalizeCommentPath` + 测试 | Task 1 |
| 路径键渲染进 `init()` 而非读 `location.pathname` | Task 5 Step 2/3（含 `grep -c "location.pathname"` = 0 的断言） |
| `comments.css` Waline 变量映射（12 条 + 字号 + 阴影） | Task 7 |
| `comments.css` Twikoo 类名覆盖 + 标注未验证 | Task 7 |
| `comments.css` 建档 + `global.css` 引入 | Task 3 |
| 懒加载（仅文章页）+ `<noscript>` + 占位高度 | `<noscript>` 抽成 `NoScriptNotice`（Task 4）三处共用；helper 在 Task 8；`.comments-mount` 的 `min-height` 在 Task 4 |
| 留言页外壳润色 + 留言须知 | Task 9 |
| `docs/comments-backend.md` | Task 10 |
| 不做弹幕 / 自建后端 / 表情面板 / 彩色 banner | 全程未出现 |

README 更新不在 spec 里，是实现时该带的收尾——留在 Task 10。

**2. 占位符扫描**

已核对：无 TBD / TODO / "类似 Task N" / "适当处理错误"。每个改代码的 Step 都给了完整文件内容或完整替换块，`Comments.astro` 因为要被五个 Task 反复改写，每次都给整份文件而不是 diff 片段——让任何顺序读到的人都不必去拼上一版。

**3. 类型与命名一致性**

- `normalizeCommentPath` —— Task 1 定义，Task 5/6/8 的分发器 import，名字一致
- `CommentProvider` —— Task 2 定义，Task 4/5/6/8 的 `sed` 命令与 Task 10 的文档都按 `provider: 'xxx' as CommentProvider` 这个字面形态匹配，一致
- `window.__commentsWhenNear(el, load)` —— Task 4/5/6 调用，Task 8 定义，签名一致
- 挂载点 id：`giscus-mount` / `twikoo-mount` / `waline-mount`，各组件内自洽；共用 class `comments-mount`，Task 7 的 `min-height` 命中它
- props 名 `config` / `path` / `lazy` —— 三个 provider 组件与分发器一致
- `COMMENTS.twikoo.envId`、`COMMENTS.waline.serverURL`、`COMMENTS.giscus.repoId` —— Task 2 定义，后续 Task 与 `sed` 命令一致

**4. 预检修订（执行前，用户裁定）**

开工前扫计划时发现三处「计划自己要求的写法会被评审判成缺陷」，已提交用户裁定并按裁定改掉：

| 问题 | 裁定与落点 |
|---|---|
| `.comments` / `.hint` 在四个组件里逐字重复 | 收拢到 `comments.css`。全局化时改名 `.comments-hint`——`404.astro` 已有自己的 `.hint`；`.title` 与 `archive.astro` 撞名故不全局化。`comments.css` 与 `global.css` 的引入因此从 Task 7 提前到 Task 3（否则 Task 3 交付一张没样式的卡片，验收不了） |
| `<noscript>` 在三个 provider 组件里逐字重复 | 抽成 `NoScriptNotice.astro`，在 Task 4（第一个使用方）落地，Task 5/6 各写一行复用 |
| Task 2 的「未启用的 provider 允许留空」是恒真式 | 校验逻辑抽成 `lib/comments.ts` 的 `missingCommentFields` 纯函数，用造出来的配置证明它真会报缺失；`consts.test.ts` 只负责浇到真实配置上。必填字段表因此只存一份 |

另修掉一处不需裁定的事实错误：Task 7 原本只在 `dist/_astro/*.css` 里 grep 样式，而 Astro 的 `inlineStylesheets: 'auto'` 会让样式在外链与内联间漂移——`.superpowers/sdd/progress.md` 记录这个坑已在前三轮造成三次假失败。改为两处都搜。

**5. 任务间的一处已知张力（刻意保留）**

Task 4/5/6 的组件调 `window.__commentsWhenNear`，而它到 Task 8 才定义。三个组件都写成
`if (lazy && window.__commentsWhenNear) ... else load()`，helper 缺失时退化为立即加载，
所以 Task 4/5/6 单独验收不会崩，只是懒加载尚未生效。Task 8 的正文已写明这一点。
反过来把 Task 8 提前，则它定义的 helper 在三个消费方都不存在时无处验证——现在这个顺序
让每个任务都有可验收的交付物。
