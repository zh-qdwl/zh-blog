// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// 站点地址用于生成 RSS、站点地图和绝对链接（canonical / og:url）
const SITE = 'https://blog.zhgyx.dpdns.org';

/**
 * 从 markdown frontmatter 里读出每篇文章的最后修改时间，供 sitemap 输出 <lastmod>。
 *
 * 为什么不用 astro:content：那个模块只在页面/组件上下文可用，
 * 在 astro.config.mjs 顶层 import 会在构建时直接抛错。
 * 这里直接读文件——frontmatter 只是几行 YAML，两个正则足够，
 * 不值得为此引入 YAML 解析器。
 */
function collectLastmods() {
  const map = new Map();
  const dir = './src/content/blog';
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
  } catch {
    return map;
  }

  for (const file of files) {
    let raw;
    try {
      raw = readFileSync(join(dir, file), 'utf8');
    } catch {
      continue;
    }
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) continue;
    const head = fm[1];

    // 草稿不进 sitemap，也不用给它日期
    if (/^draft:\s*true\s*$/m.test(head)) continue;

    const pick = (key) => {
      const m = head.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
      if (!m) return null;
      // 去掉可能存在的引号
      const v = m[1].trim().replace(/^['"]|['"]$/g, '');
      const d = new Date(v);
      return Number.isNaN(d.valueOf()) ? null : d;
    };

    const date = pick('updatedDate') ?? pick('pubDate');
    if (!date) continue;

    const slug = file.replace(/\.mdx?$/, '');
    map.set(`/blog/${slug}/`, date.toISOString());
  }
  return map;
}

const lastmods = collectLastmods();
const latestOverall = [...lastmods.values()].sort().pop();

// 首页 / 列表 / 归档 的内容随最新文章变化，用最新日期
const AGGREGATE_PATHS = new Set(['/', '/blog/', '/archive/', '/series/', '/categories/', '/tags/']);

export default defineConfig({
  site: SITE,
  integrations: [
    sitemap({
      serialize(item) {
        const path = new URL(item.url).pathname;
        const own = lastmods.get(path);
        if (own) item.lastmod = own;
        else if (AGGREGATE_PATHS.has(path) && latestOverall) item.lastmod = latestOverall;
        return item;
      },
    }),
  ],
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
