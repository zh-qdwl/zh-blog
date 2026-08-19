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
- **后端选型暂缓**：用户要再想想放哪。因此本次**不部署后端**，只把接入点抽象成可切换配置
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
| 数据库 | 云端一律 MongoDB Atlas；Docker 版可用内嵌 lokijs | MongoDB / MySQL / TiDB / PostgreSQL / SQLite / CloudBase / **GitHub 仓库存 CSV** |
| 官方 CSS 变量换肤 | **无** | **有** |
| 官方暗色模式选项 | **无** | **有**，`dark` 可填 CSS 选择器 |
| 前端接入 | `twikoo.init({ envId, el, path, lang, region })` | `init({ el, serverURL, dark })` |

**取舍没有免费午餐**：

- **Twikoo** 官方支持 CF Workers，后端能跟博客同平台（本站在 `*.workers.dev`），
  国内可达性与博客本体一致。代价是换肤只能覆盖它的 `.tk-*` / `.el-*` 类名
  （官方推荐外部 CSS + `!important`，或改用 `twikoo.nocss.js` 自己写全套），跨版本容易碎。
- **Waline** 的 `dark` 选项可直接填 `'html[data-theme="dark"]'`——本站主题切换正是往
  `<html>` 上写 `data-theme`（`Header.astro` 的 `#theme-toggle`），一行对上，且它暴露
  官方 CSS 变量，能干净地映射到 `tokens.css`。代价是官方不支持 CF，得走 Vercel，
  而 Vercel 在国内经常被墙或很慢，访客会看到留言区一直转圈。

因此 `comments.css` 里 Waline 那段是干净的变量映射，Twikoo 那段是一组带注释的类名覆盖，
并在文件里注明「升级 Twikoo 后要回来看一眼」——这是它的固有代价，藏不掉。

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

**Giscus**：`data-theme` 按当前 `data-theme` 取值，并在 `#theme-toggle` 点击后
用 `postMessage` 通知 iframe 换主题——giscus 是 iframe，CSS 变量透不进去。

### 5. 页面外壳 · `src/pages/guestbook.astro`

保持素调子，与 `/about` 一致，不引入新的颜色令牌：

- `h1`「留言」保留
- lead 重写一句
- 新增一行**留言须知**小字：邮箱不公开、支持 Markdown、大概多久回
- 下面直接 `<Comments lazy={false} />`

`CommentsFallback.astro` 在 `ContactLinks` 两个按钮之上，补一句
「留言功能正在接，暂时先走这两条」。

### 6. 选型/部署文档 · `docs/comments-backend.md`

给未来的自己看的决策文档，内容：

- 上面「核实到的硬事实」那张表，附官方文档链接
- 两条推荐路径的分步操作：
  - **Twikoo + Cloudflare Workers + MongoDB Atlas**（后端与博客同平台）
  - **Waline + Vercel + GitHub 存储**（零数据库，数据在自己仓库里）
- 每条路径明确标出**哪些步骤只能用户自己做**（注册账号、生成并填写密钥）
- 定完之后回来改哪一行（`COMMENTS.provider` 与对应那组字段）

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
| 主题映射若引入新颜色令牌，补对比度断言 | `src/styles/tokens.test.ts` |

本次方案刻意**不引入新颜色令牌**（外壳保持素、映射全部复用现有 tokens），
所以预期不需要动 `tokens.test.ts`。如果实现中发现必须新增颜色，按现有惯例补断言。

`comments.css` 与 `.astro` 组件是渲染层，本仓库的测试只覆盖纯数据层与令牌，
不为它们写单测；验收靠本地 `npm run dev` 四种 provider 各切一遍目视确认
（`none` 与 `giscus` 可当场验证，`twikoo`/`waline` 在后端就位后验证）。
