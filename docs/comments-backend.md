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
