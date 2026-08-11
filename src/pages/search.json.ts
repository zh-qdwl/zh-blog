import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/posts';
import { excerpt, stripMarkdown } from '../lib/markdown';

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const index = posts.map((post) => ({
    title: post.data.title,
    description: post.data.description,
    tags: post.data.tags,
    category: post.data.category,
    url: `/blog/${post.id}/`,
    text: excerpt(stripMarkdown(post.body ?? '')),
  }));
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
