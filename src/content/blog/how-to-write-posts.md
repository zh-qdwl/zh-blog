---
title: 如何写一篇新文章
description: 三步搞定：新建 Markdown 文件、填写文章信息、写正文。
pubDate: 2026-08-10
category: 教程
tags: ['教程', '指南']
pinned: false
---

在这个博客里发一篇新文章非常简单，只需要三步。

## 第一步：新建文件

在 `src/content/blog/` 目录下新建一个 Markdown 文件，文件名就是文章的网址（slug）。比如 `my-first-trip.md`，访问地址就是 `/blog/my-first-trip/`。

建议文件名用英文小写加连字符，例如 `learn-astro.md`。

## 第二步：填写文章信息（frontmatter）

在文件最上方，用两行 `---` 包起来一段配置：

```md
---
title: 文章标题
description: 一句话简介，会显示在列表和搜索结果里
pubDate: 2026-08-10
category: 教程
tags: ['标签一', '标签二']
cover: /my-cover.png
pinned: false
---
```

字段说明：

- **title**（必填）：文章标题
- **description**（必填）：简介
- **pubDate**（必填）：发布日期
- **updatedDate**（可选）：更新日期
- **tags**（可选）：标签数组
- **category**（可选）：分类，一篇文章只归一类，会出现在 `/categories` 分类页里；不填的话统一归到「未分类」
- **cover**（可选）：封面图路径，会显示在列表卡片左侧；**不填就不显示封面区**，正文占满整张卡，所以不强制每篇都配图
- **pinned**（可选）：设为 `true` 时置顶，会排在首页和列表页最前面，并带一个「置顶」角标
- **featured**（可选）：设为 `true` 时会被侧栏「作者精选」widget 收录；这是唯一的收录方式——没有任何一篇文章标记 `featured` 时，这个 widget 不会显示
- **draft**（可选）：设为 `true` 时是草稿，不会发布

## 第三步：写正文

`---` 下面就是正文，直接用 Markdown 写即可。保存后，本地运行 `npm run dev` 就能实时预览。

写完推送到 GitHub，Cloudflare 会自动重新构建并上线，几十秒后就能看到更新。
