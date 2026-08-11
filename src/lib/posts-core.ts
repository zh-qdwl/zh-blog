// 纯计算函数：不 import astro:content，因此可以被 Vitest 直接测试。
// 需要读取内容集合的封装在 ./posts.ts。

/** 结构上兼容 CollectionEntry<'blog'> 的最小形状 */
export type PostLike = {
  id: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    updatedDate?: Date;
    tags: string[];
    category: string;
    cover?: string;
    pinned: boolean;
    draft: boolean;
  };
};

export type Counted = { name: string; count: number };
export type ArchiveGroup<T> = { year: number; posts: T[] };
export type Stats = { postCount: number; tagCount: number; categoryCount: number };

/** 剔除草稿 */
export function filterPublished<T extends PostLike>(posts: T[]): T[] {
  return posts.filter((p) => !p.data.draft);
}

/** 按发布日期倒序（返回新数组，不改入参） */
export function sortByDate<T extends PostLike>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** 置顶优先，其余按日期倒序 */
export function sortPinnedFirst<T extends PostLike>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  });
}

/** 计数并按 count 倒序；count 相同按名称的中文排序 */
function countBy(names: string[]): Counted[] {
  const map = new Map<string, number>();
  for (const name of names) map.set(name, (map.get(name) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
}

export function groupByCategory(posts: PostLike[]): Counted[] {
  return countBy(posts.map((p) => p.data.category));
}

export function groupByTag(posts: PostLike[]): Counted[] {
  return countBy(posts.flatMap((p) => p.data.tags));
}

/** 按年份倒序分组，组内按日期倒序 */
export function groupByYear<T extends PostLike>(posts: T[]): ArchiveGroup<T>[] {
  const map = new Map<number, T[]>();
  for (const p of sortByDate(posts)) {
    const year = p.data.pubDate.getFullYear();
    const bucket = map.get(year);
    if (bucket) bucket.push(p);
    else map.set(year, [p]);
  }
  return [...map.entries()]
    .map(([year, posts]) => ({ year, posts }))
    .sort((a, b) => b.year - a.year);
}

export function computeStats(posts: PostLike[]): Stats {
  return {
    postCount: posts.length,
    tagCount: groupByTag(posts).length,
    categoryCount: groupByCategory(posts).length,
  };
}
