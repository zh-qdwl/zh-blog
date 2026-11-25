import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/posts';
import { stripMarkdown } from '../lib/markdown';

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const index = posts.map((post) => ({
    title: post.data.title,
    description: post.data.description,
    tags: post.data.tags,
    category: post.data.category,
    url: `/blog/${post.id}/`,
    // 全文索引：以前是 excerpt(..., 500)，长文的后半段完全搜不到
    // （tmux 那篇 4644 字只覆盖 11%）。现在整篇正文都进索引，
    // 连同各章节标题一起——搜「速查表」这类小节名也能命中。
    text: stripMarkdown(post.body ?? ''),
  }));
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
