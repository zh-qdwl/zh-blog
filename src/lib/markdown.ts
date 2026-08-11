// 纯文本处理，供搜索索引使用。不 import astro:content，可直接单测。

/** 把 Markdown 压成用于检索的纯文本 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, ' ') // frontmatter
    .replace(/```[\s\S]*?```/g, ' ') // 围栏代码块
    .replace(/`[^`\n]*`/g, ' ') // 行内代码
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接保留文字
    .replace(/^\s{0,3}#{1,6}\s+/gm, ' ') // 标题符号
    .replace(/^\s{0,3}>\s?/gm, ' ') // 引用
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, ' ') // 列表符号
    .replace(/[*_~]/g, '') // 强调符号
    .replace(/\s+/g, ' ') // 压缩空白
    .trim();
}

/** 截断到 max 个字符（搜索索引不需要全文） */
export function excerpt(text: string, max = 500): string {
  return text.length <= max ? text : text.slice(0, max);
}
