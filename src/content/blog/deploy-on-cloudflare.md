---
title: 把博客部署到 Cloudflare Pages
description: GitHub 连接 Cloudflare Pages，推送即自动上线，全程免费。
pubDate: 2026-08-09
tags: ['部署', 'Cloudflare']
---

这个博客是纯静态站点，最适合部署在 Cloudflare Pages 上：全球 CDN、免费额度充足、推送代码自动上线。

## 核心思路

把代码放到 GitHub，让 Cloudflare Pages 连接这个仓库。之后每次 `git push`，Cloudflare 都会自动运行 `npm run build` 并把 `dist/` 目录发布到全球节点。

## 构建配置

在 Cloudflare Pages 里创建项目时，填这两项即可：

- **构建命令（Build command）**：`npm run build`
- **输出目录（Build output directory）**：`dist`

框架预设选 **Astro** 会自动带出上面的配置。

## 上线之后

第一次部署完成后，你会得到一个 `xxx.pages.dev` 的免费网址。记得把 `astro.config.mjs` 里的 `site` 改成这个地址，这样 RSS 和站点地图里的链接才正确。

如果之后买了自己的域名，在 Pages 项目的 **Custom domains** 里绑定即可，Cloudflare 会自动配好 HTTPS 证书。
