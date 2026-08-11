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
    // 强调/删除线符号：仅剥离成对出现的定界符，不误伤孤立的 _ / ~ / *
    // 顺序要求：先处理两字符定界符（**、__、~~），再处理单字符定界符（*、_），
    // 否则 **粗体** 会被单字符规则提前吃掉一半，留下多余的 *。
    .replace(/\*\*([^*]+?)\*\*/g, '$1') // **粗体**
    .replace(/__([^_]+?)__/g, '$1') // __粗体__
    .replace(/~~([^~]+?)~~/g, '$1') // ~~删除线~~
    .replace(/\*([^*\n]+?)\*/g, '$1') // *斜体*（* 允许出现在词内，无需边界限制）
    .replace(/(?<!\w)_([^_\n]+?)_(?!\w)/g, '$1') // _斜体_：左右都不贴词字符才算定界符，避免误伤 API_KEY、snake_case_name
    .replace(/\s+/g, ' ') // 压缩空白
    .trim();
}

/** 截断到 max 个字符（搜索索引不需要全文） */
export function excerpt(text: string, max = 500): string {
  return text.length <= max ? text : text.slice(0, max);
}
