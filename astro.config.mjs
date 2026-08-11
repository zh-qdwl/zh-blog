// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 部署后把这里改成你的正式网址（例如 https://my-blog.pages.dev 或你的自定义域名）
// 这个地址用于生成 RSS、站点地图和绝对链接。
export default defineConfig({
  site: 'https://example.pages.dev',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      // 代码高亮主题：亮色用 github-light，暗色用 github-dark
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
  },
});
