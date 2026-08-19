# 留言板完善：provider 抽象 + 主题融合 + 页面外壳

日期：2026-08-19
起因：对照 https://www.qladgk.com/feedback，本站留言页只有一张「发邮件 / 开 Issue」的卡片，
访客**没有任何途径直接留言**。

## 差在哪

参考站用的是 **Twikoo v1.6.39**（页脚有 "Powered by Twikoo" 字样）。

| | 参考站 | 改造前 |
|---|---|---|
| 能否提交留言 | 能，填昵称/邮箱就发 | **不能**，只能发邮件或开 Issue |
| 表单 | 昵称(必填)/邮箱(必填)/网址(选填) + 正文 + `0/500` 计数 | 无 |
| 输入增强 | 颜文字/Emoji/Bilibili 三组表情面板、图片上传、Markdown、预览 | 无 |
| 列表 | 头像、昵称可链主页、站长徽章、时间、点赞点踩、OS+浏览器徽章、嵌套回复 | 无 |
| 弹幕 | 顶部飘过最近几条留言 | 无 |
| 标题区 | 大标题 banner + 副标题 | 素的 `h1` + 一句 lead |

**关键认知：那一大片 UI 里，只有标题区和弹幕是站长自己写的。**
表单、表情面板、列表、嵌套回复、OS/浏览器徽章全部由 Twikoo 的 widget 渲染。
所以"照着参考站做"并不等于要画那些控件——真正要做的是把 widget 接进来、让它长得像本站。

## 前置决定（已与用户确认）

- **方向**：接 Twikoo 或 Waline 这类真正能提交的系统，不走 Giscus，不停在静态页
- **后端倾向 Twikoo + Cloudflare Workers**（用户表述为"更偏向"，非最终拍定）。
  因此本次仍**不部署后端**，只把接入点抽象成可切换配置；Waline 一路照样实现，
  作为 Twikoo 换肤不理想时的退路（见下方「Twikoo 换肤本次无法验收」）

  > **勘误**：本文初稿把这条路径写成 "Twikoo + CF Workers + MongoDB Atlas"，是错的。
  > 官方 `backend.html` 在 Cloudflare 一节只给了仓库链接，追到
  > [twikoojs/twikoo-cloudflare](https://github.com/twikoojs/twikoo-cloudflare) 的 README
  > 才看到：**CF Workers 版用 Cloudflare D1 存数据、R2 存图片，完全不碰 MongoDB**。
  > 对用户是好消息——少一个第三方账号，数据库和图床都在 Cloudflare 自己家里。
- **标题区保持素**，跟 `/about` 等内页一致，只润色文案，不做彩色 banner
- **`provider='none'` 时**：保留邮件/Issue 卡，并补一句「即将开放」
- **附加项全做**：选型/部署文档、留言须知短文案、文章页评论区懒加载。不再往外扩

### 后端必须由用户自己部署

注册 MongoDB Atlas、登录 Cloudflare 控制台、填密钥这类操作涉及创建账号与录入凭据，
Claude 不执行。本次交付的是前端集成 + 可切换配置 + 一份照着点就行的步骤文档。

## 核实到的硬事实

这几条决定了选型，全部来自官方文档，不是凭记忆：

| | Twikoo | Waline |
|---|---|---|
| 官方支持 Cloudflare Workers | **是**（数据库必须 MongoDB Atlas） | **否**，只有第三方移植 |
| 其他部署位 | Vercel / Netlify / 腾讯云 CloudBase / Railway / Zeabur / HF Spaces / AWS Lambda / Docker | Vercel / Netlify / Railway / Zeabur / 百度云函数 / 阿里云函数 / VPS |
| 数据库 | **CF Workers 版用 Cloudflare D1 + R2**；Vercel/Netlify 等用 MongoDB Atlas；Docker 版可用内嵌 lokijs | MongoDB / MySQL / TiDB / PostgreSQL / SQLite / CloudBase / **GitHub 仓库存 CSV** |
| 当前版本 / CDN | 1.7.19，`https://cdn.jsdelivr.net/npm/twikoo@1.7.19/dist/twikoo.min.js`（国内可换 `registry.npmmirror.com`） | 随 `@waline/client` 发布 |
| 官方 CSS 变量换肤 | **无** | **有** |
| 官方暗色模式选项 | **无** | **有**，`dark` 可填 CSS 选择器 |
| 前端接入 | `twikoo.init({ envId, el, path, lang, region })` | `init({ el, serverURL, dark })` |

**取舍没有免费午餐**：

- **Twikoo** 官方支持 CF Workers，后端能跟博客同平台（本站在 `*.workers.dev`），
  国内可达性与博客本体一致，且数据库/图床都用 Cloudflare 自家的 D1/R2，无需第三方账号。
  代价有两层：一是换肤只能覆盖它的 `.tk-*` / `.el-*` 类名（官方推荐外部 CSS +
  `!important`，或改用 `twikoo.nocss.js` 自己写全套），跨版本容易碎；二是 CF Workers
  版官方评级 ★★☆☆☆，有一组明确写在 README 里的功能限制（见下）。
- **Waline** 的 `dark` 选项可直接填 `'html[data-theme="dark"]'`——本站主题切换正是往
  `<html>` 上写 `data-theme`（`Header.astro` 的 `#theme-toggle`），一行对上，且它暴露
  官方 CSS 变量，能干净地映射到 `tokens.css`。代价是官方不支持 CF，得走 Vercel，
  而 Vercel 在国内经常被墙或很慢，访客会看到留言区一直转圈。

因此 `comments.css` 里 Waline 那段是干净的变量映射，Twikoo 那段是一组带注释的类名覆盖，
并在文件里注明「升级 Twikoo 后要回来看一眼」——这是它的固有代价，藏不掉。

### Twikoo CF Workers 版的已知限制

全部来自 `twikoo-cloudflare` 的 README，照实记录，不粉饰：

| 限制 | 对本站的影响 |
|---|---|
| 免费版 Worker 1MiB 体积上限，需先清空三个 `node_modules` 文件再打包 | 部署时的额外步骤，写进文档 |
| 必须用 `wrangler` 命令行部署，不能只在控制台点 | 部署时需要本地 Node 环境 |
| **带斜杠 / 不带斜杠的 URL 被视为两条独立评论线** | **有实际影响，见下节** |
| 环境变量控制不了应用行为 | 配置改动要走 Twikoo 管理面板 |
| 不支持 IP 归属地 | 无影响——参考站那些 OS/浏览器徽章靠 UA，不靠 IP |
| 图片上传走 R2，需另建 bucket | 可选功能，不建 bucket 就是不支持传图 |
| XSS 过滤用 `xss` 包而非 `dompurify` | 无影响 |

### 评论线路径必须规范化 · `src/lib/comments.ts`

上表第三条对本站是真问题。全站链接统一写成 `/blog/${post.id}/`（带斜杠），
但未配置 `trailingSlash`、Astro 默认 `build.format: 'directory'`，产出的是
`/blog/foo/index.html`——带不带斜杠都能打开。访客从外部链接、手输网址、
或搜索引擎结果进来时，`location.pathname` 可能是两种形态中的任意一种，
Twikoo 就会把同一篇文章的评论**拆成两条互相看不见的线**。

**解法**：不让 widget 去读 `location.pathname`，而是把 Astro 构建期的规范路径
服务端渲染进 `init()` 的 `path` 参数。构建期的值对每个访客都一样，与他怎么进来无关。

规范化逻辑抽成纯函数放 `src/lib/comments.ts`：

```ts
/** 评论线的路径键：统一带尾斜杠，与全站链接写法一致 */
export function normalizeCommentPath(pathname: string): string;
```

放 `lib/` 而不是写在 `.astro` 里，是为了能进 vitest——本仓库测试只覆盖纯 TS 层，
这是唯一能给这条逻辑上守卫的位置。规则、边界与用例见实现计划。

Waline 同样接受 `path` 参数，两个 provider 共用这一个函数，不各写一套。

## 定下的方案

### 1. 配置层 · `src/consts.ts`

```ts
export const COMMENTS = {
  provider: 'none' as 'none' | 'giscus' | 'twikoo' | 'waline',
  /** 文章页评论区懒加载；留言页不受影响，总是立即加载 */
  lazyOnPosts: true,
  giscus: { repo: '', repoId: '', category: '', categoryId: '' },
  twikoo: { envId: '', region: '' },
  waline: { serverURL: '' },
};
```

各 provider 的必填字段：

| provider | 必填 | 选填 |
|---|---|---|
| `giscus` | `repo`、`repoId`、`category`、`categoryId` | — |
| `twikoo` | `envId` | `region`（仅腾讯云需要，Vercel/CF 留空） |
| `waline` | `serverURL` | — |

`consts.test.ts` 加守卫：provider 不为 `'none'` 时，对应那组的必填字段不能为空串。
否则配置填一半就上线，访客看到的是一块空白区域——而且静态站构建不会报错，
只有真人打开页面才会发现。

### 2. 组件拆分

```
src/components/Comments.astro        分发器：选 provider、决定懒加载、渲染外壳
src/components/comments/
  ├─ ContactLinks.astro              邮件 / 开 Issue 两个链接，唯一一份
  ├─ CommentsFallback.astro          provider='none'：ContactLinks +「即将开放」
  ├─ CommentsGiscus.astro
  ├─ CommentsTwikoo.astro
  └─ CommentsWaline.astro
src/lib/comments.ts                  normalizeCommentPath（纯函数，可测）
src/lib/comments.test.ts             它的守卫
src/styles/comments.css              三方 widget → 本站 tokens 的主题映射
```

**为什么拆**：四个 provider 的挂载方式不同——giscus 是带一堆 `data-*` 的 `<script>` 标签，
twikoo/waline 是往容器里跑 `init()` 调用。塞进一个文件就是一坨互相嵌套的 if，
再加上四套样式，单文件会奔向 200 行以上。拆开后每个文件只回答一个问题：
**这个 provider 怎么挂上去**。

各单元的边界：

- `Comments.astro` —— 唯一读 `COMMENTS.provider` 的地方。对外接口是 props `{ lazy?: boolean }`。
  不含任何 provider 专属知识（除了"哪个 provider 对应哪个组件"这张映射表）。
- `comments/CommentsGiscus|Twikoo|Waline.astro` —— 每个只认自己那组配置，通过 props 拿到，
  不直接 import `consts`。这样加第五个 provider 不需要改任何现有文件的内部逻辑，
  只加一个文件 + 映射表一行。
- `comments/ContactLinks.astro` —— **唯一** 读 `SOCIAL` 并推导 issues 地址的地方
  （即现有 `Comments.astro` 里那段「必须用 `SOCIAL.repo` 而不是 `SOCIAL.github`」的注释，
  连注释一起搬过来，别让那个坑重新长出来）。三个消费方：`CommentsFallback`、
  各 provider 的 `<noscript>`、以及将来任何需要"找我"入口的地方。
- `comments.css` —— 只做视觉映射，不含逻辑。

`Comments.astro` 的 props：`lazy` 默认取 `COMMENTS.lazyOnPosts`，
`guestbook.astro` 显式传 `lazy={false}`——留言区就是那一页的主体内容，懒加载没有意义。

### 3. 懒加载（仅文章页）

三方评论脚本体积不小，而本站定位是"全站静态、访问飞快"，不能让它拖累文章页首屏。

- mount 点外包一层 `<div data-comments-lazy>`，`IntersectionObserver` 以
  `rootMargin: '400px'` 提前命中，再注入脚本
- **占位 `min-height`**：加载完成会把下方内容顶一下，给容器一个最小高度压住 CLS
- **`<noscript>` 兜底**：无 JS 时渲染 `ContactLinks.astro`。它和 `CommentsFallback.astro`
  用的是同一个组件，不复制两遍——否则改文案时必然漏一个
- `IntersectionObserver` 不可用时（极老浏览器）直接同步加载，不做 polyfill

### 4. 主题融合 · `src/styles/comments.css`

**Waline**：映射到现有令牌，深色交给它自己的 `dark` 选项，不写第二套。

```
--waline-theme-color   → var(--brand-strong)
--waline-bg-color      → var(--card)
--waline-border-color  → var(--border)
--waline-text-color    → var(--text)
--waline-info-color    → var(--text-soft)
--waline-border-radius → var(--radius)
```

`init()` 传 `dark: 'html[data-theme="dark"]'`。因为上面这些变量本身就指向 tokens，
而 tokens 已经按 `data-theme` 换过一轮，深色其实是自动跟上的——`dark` 选项主要
让 Waline 内部那些没走变量的地方（如代码块、遮罩）也切过去。

**Twikoo**：类名覆盖。范围限定在本站需要的几处：容器背景、边框、输入框、按钮、
链接色、次要文字色。每条注明覆盖的是哪个元素，并在文件头写明版本敏感。

> **Twikoo 换肤本次无法验收。** Twikoo 的 widget 要连上后端才渲染出完整 DOM，
> 后端尚未部署，因此这段覆盖是**照官方文档与社区教程盲写**的，选择器可能对不上、
> 也可能有遗漏的元素。它必须在 Worker 部署完成后再走一轮目视调整。
>
> 这一条同时是保留 Waline 实现的理由：Twikoo 恰好脆在换肤上，
> 若调整后仍不理想，改 `COMMENTS.provider` 一行即可切走，不必重做集成层。

**Giscus**：`data-theme` 按当前 `data-theme` 取值，并在 `#theme-toggle` 点击后
用 `postMessage` 通知 iframe 换主题——giscus 是 iframe，CSS 变量透不进去。

### 5. 页面外壳 · `src/pages/guestbook.astro`

保持素调子，与 `/about` 一致，不引入新的颜色令牌：

- `h1`「留言」保留
- lead 重写一句
- 新增一行**留言须知**小字：邮箱不公开、支持 Markdown。
  **刻意不写回复时效**——那是个可能兑现不了的承诺，写了做不到比不写更糟
- 下面直接 `<Comments lazy={false} />`

`CommentsFallback.astro` 在 `ContactLinks` 两个按钮之上，补一句
「留言功能正在接，暂时先走这两条」。

### 6. 选型/部署文档 · `docs/comments-backend.md`

用户已倾向 **Twikoo + Cloudflare Workers + MongoDB Atlas**，因此文档**只详写这一条路径**，
不再平铺两条——短的文档才会被真的照着做。内容：

- **主线：Twikoo + CF Workers + D1 + R2 分步操作**（步骤取自 `twikoo-cloudflare` README）
  - clone `twikoojs/twikoo-cloudflare`、`npm install`
  - 清空三个 `node_modules` 文件绕过免费版 1MiB 体积上限
  - `npx wrangler login` → `npx wrangler d1 create twikoo` → 把返回的
    `database_name` / `database_id` 填回 `wrangler.toml`
  - `npx wrangler d1 execute twikoo --remote --file=./schema.sql` 建表
  - 需要传图再做：`npx wrangler r2 bucket create twikoo` + 填 `R2_PUBLIC_URL`
  - `npx wrangler deploy --minify`
  - 回到本仓库填 `COMMENTS.provider = 'twikoo'` 与 `twikoo.envId`（= Worker 地址），
    `region` 留空（那是腾讯云才要的）
  - 首次打开留言页设管理密码；邮件通知可选，要配的话是 `SENDER_EMAIL` / `SENDER_NAME`
    / `SMTP_SERVICE` / `SMTP_USER` / `SMTP_PASS` 这几个环境变量
  - **附上「已知限制」那张表**，别让人部署完才发现传图要另开 R2
- **每一步标注执行人**。以下只能用户自己做，Claude 不代劳：注册/登录 Cloudflare
  账号（`wrangler login` 走浏览器授权）、生成与填写管理密码及 SMTP 凭据
- **退路一节（简短）**：若 Twikoo 换肤调不满意，改 `COMMENTS.provider = 'waline'`
  + 填 `serverURL` 即可切到 Waline；附 Waline 官方部署入口链接，不展开步骤
- 上面「核实到的硬事实」那张表照搬进来，附官方文档链接——它是当初为什么这么选的依据

**上述步骤已于 2026-08-19 从 `twikoo-cloudflare` README 核实**，不是凭印象写的。
文档里要注明核实日期并给出仓库链接，声明「以仓库 README 为准」——
第三方部署脚本变动频繁，写死的步骤总会过期，但注明了日期的步骤至少不会骗人。

## 不做

- **弹幕**：要调后端 API 取最近留言，后端未定就写不了。等 provider 定了再补
- **自建评论后端**：远超本次范围
- **表情面板 / 图片上传 / 预览 / 点赞 / OS 浏览器徽章**：widget 自带，不是我们画的
- **彩色 banner 或整屏 Hero 头图**：用户明确要求保持素

## 测试

| 测什么 | 放哪 |
|---|---|
| provider 不为 `none` 时对应配置必填字段非空 | `src/consts.test.ts` |
| provider 取值只能是四个之一 | `src/consts.test.ts` |
| `normalizeCommentPath` 把带/不带尾斜杠归一成同一个键 | `src/lib/comments.test.ts` |
| 主题映射若引入新颜色令牌，补对比度断言 | `src/styles/tokens.test.ts` |

本次方案刻意**不引入新颜色令牌**（外壳保持素、映射全部复用现有 tokens），
所以预期不需要动 `tokens.test.ts`。如果实现中发现必须新增颜色，按现有惯例补断言。

`comments.css` 与 `.astro` 组件是渲染层，本仓库的测试只覆盖纯数据层与令牌，
不为它们写单测；验收靠本地 `npm run dev` 四种 provider 各切一遍目视确认
（`none` 与 `giscus` 可当场验证，`twikoo`/`waline` 在后端就位后验证）。
