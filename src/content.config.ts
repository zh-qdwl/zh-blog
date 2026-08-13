import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

// 博客文章集合：所有文章放在 src/content/blog/ 下，用 Markdown 或 MDX 写
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    // 分类：一篇文章只属于一个分类，缺省归入「未分类」
    category: z.string().default('未分类'),
    // 封面图可选。不填时列表卡片不渲染封面区，正文占满整张卡——
    // 不做占位兜底，免得没配图的文章白占一块 200px 却不给任何信息。
    cover: z.string().optional(),
    // 置顶：列表页排在最前
    pinned: z.boolean().default(false),
    // 作者精选：在侧栏「作者精选」widget 中列出
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
