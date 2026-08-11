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
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
