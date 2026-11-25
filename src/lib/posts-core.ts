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
    featured: boolean;
    draft: boolean;
  };
};

export type Counted = { name: string; count: number };
export type ArchiveGroup<T> = { year: number; posts: T[] };
export type SeriesGroup<T> = { name: string; posts: T[] };
export type Neighbors<T> = { prev: T | null; next: T | null };
export type Stats = { postCount: number; tagCount: number; categoryCount: number };

/** 剔除草稿 */
export function filterPublished<T extends PostLike>(posts: T[]): T[] {
  return posts.filter((p) => !p.data.draft);
}

/** 只保留作者精选的文章 */
export function filterFeatured<T extends PostLike>(posts: T[]): T[] {
  return posts.filter((p) => p.data.featured);
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
    // UTC 取值：pubDate 被 z.coerce.date() 解析为 UTC 午夜，本地时区分年会在
    // 负时区构建机上把 1 月 1 日归到上一年（polish-todo B3）
    const year = p.data.pubDate.getUTCFullYear();
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

/** 系列内阅读顺序：发布日期升序（写作顺序即阅读顺序） */
function sortByDateAsc<T extends PostLike>(posts: T[]): T[] {
  return [...posts].sort((a, b) => a.data.pubDate.valueOf() - b.data.pubDate.valueOf());
}

/**
 * 上一篇/下一篇导航。
 * 属于系列时只在系列内移动（按写作顺序）；否则按全站发布时间线。
 * prev = 更早的一篇，next = 更晚的一篇。
 */
export function getNeighbors<T extends PostLike>(
  posts: T[],
  currentId: string,
  series?: string,
): Neighbors<T> {
  const pool = series
    ? posts.filter((p) => p.data.series === series)
    : posts.filter((p) => !p.data.series);
  const line = sortByDateAsc(pool);
  const i = line.findIndex((p) => p.id === currentId);
  if (i === -1) return { prev: null, next: null };
  return { prev: line[i - 1] ?? null, next: line[i + 1] ?? null };
}

/**
 * 按系列分组：只收有 series 字段的文章，组内按写作顺序，
 * 系列之间按最近一篇文章的日期倒序（最近更新的系列在前）。
 */
export function groupBySeries<T extends PostLike>(posts: T[]): SeriesGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const p of posts) {
    const s = p.data.series;
    if (!s) continue;
    const bucket = map.get(s);
    if (bucket) bucket.push(p);
    else map.set(s, [p]);
  }
  return [...map.entries()]
    .map(([name, posts]) => ({ name, posts: sortByDateAsc(posts) }))
    .sort((a, b) => {
      const la = a.posts[a.posts.length - 1]!.data.pubDate.valueOf();
      const lb = b.posts[b.posts.length - 1]!.data.pubDate.valueOf();
      return lb - la;
    });
}

/**
 * 相关文章：按标签/分类/系列的共现程度打分。
 *
 * 权重设计的依据：标签最能表达"这篇在讲什么"（一篇可有多个），
 * 分类较宽泛（一个站可能只有几个分类），系列则是最强的关联
 * （同一系列本来就是连续阅读的）。所以 series > tag > category。
 * 同分时新的在前——旧文对当下读者的价值低于新文。
 *
 * 不含当前文章自身；返回前 limit 条。
 */
export function getRelated<T extends PostLike>(posts: T[], current: T, limit = 3): T[] {
  const cur = current.data;
  const curTags = new Set(cur.tags);

  const scored = posts
    .filter((p) => p.id !== current.id && !p.data.draft)
    .map((p) => {
      let score = 0;
      // 同系列：强关联，但不算"同一篇"
      if (cur.series && p.data.series === cur.series) score += 10;
      // 共同标签：每个 3 分
      for (const t of p.data.tags) if (curTags.has(t)) score += 3;
      // 同分类：1 分（分类宽泛，只作为弱信号）
      if (p.data.category === cur.category) score += 1;
      return { post: p, score };
    })
    .filter((x) => x.score > 0);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // 同分时新文优先
    return b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf();
  });

  return scored.slice(0, limit).map((x) => x.post);
}
