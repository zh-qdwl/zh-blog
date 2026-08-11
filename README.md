# Hebbe 的博客

一个用 [Astro](https://astro.build) 搭建的简洁现代博客，部署在 Cloudflare Pages 上。

## 本地开发

```bash
npm install      # 安装依赖（只需第一次）
npm run dev      # 启动本地预览，打开 http://localhost:4321
npm run build    # 生成静态站点到 dist/
npm run preview  # 预览构建结果
```

## 目录结构

```
src/
├── consts.ts              # 站点标题、导航、社交链接（先改这里）
├── content/blog/          # 所有文章（Markdown），新增文章就放这里
├── content.config.ts      # 文章字段定义
├── components/            # 页头、页脚等组件
├── layouts/              # 页面骨架
├── pages/                # 路由页面（首页 / 文章 / 关于 / RSS / 404）
└── styles/global.css     # 全站样式与配色变量
public/                   # 静态资源（favicon 等）
astro.config.mjs          # 站点地址 site、集成配置
```

## 第一次使用要改的地方

1. `src/consts.ts` —— 站点标题、你的名字、GitHub / 邮箱链接
2. `astro.config.mjs` —— 把 `site` 改成你的正式网址
3. `src/content/blog/` —— 删掉示例文章，写你自己的

## 写新文章

在 `src/content/blog/` 下新建 `.md` 文件即可，详见示例文章《如何写一篇新文章》。

## 部署

见随项目附带的《Cloudflare 部署教程》，或文章《把博客部署到 Cloudflare Pages》。
