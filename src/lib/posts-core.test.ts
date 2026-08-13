import { describe, it, expect } from 'vitest';
import {
  filterPublished,
  filterFeatured,
  sortByDate,
  sortPinnedFirst,
  groupByCategory,
  groupByTag,
  groupByYear,
  computeStats,
  type PostLike,
} from './posts-core';

function post(over: Partial<PostLike['data']> & { title: string }): PostLike {
  return {
    id: over.title,
    data: {
      description: '描述',
      pubDate: new Date('2026-01-01'),
      tags: [],
      category: '未分类',
      pinned: false,
      featured: false,
      draft: false,
      ...over,
    },
  };
}

describe('filterPublished', () => {
  it('剔除草稿', () => {
    const posts = [post({ title: 'A' }), post({ title: 'B', draft: true })];
    expect(filterPublished(posts).map((p) => p.data.title)).toEqual(['A']);
  });
});

describe('sortByDate', () => {
  it('按发布日期倒序', () => {
    const posts = [
      post({ title: '旧', pubDate: new Date('2026-01-01') }),
      post({ title: '新', pubDate: new Date('2026-08-01') }),
    ];
    expect(sortByDate(posts).map((p) => p.data.title)).toEqual(['新', '旧']);
  });

  it('不修改入参数组', () => {
    const posts = [
      post({ title: '旧', pubDate: new Date('2026-01-01') }),
      post({ title: '新', pubDate: new Date('2026-08-01') }),
    ];
    sortByDate(posts);
    expect(posts.map((p) => p.data.title)).toEqual(['旧', '新']);
  });
});

describe('sortPinnedFirst', () => {
  it('置顶优先，组内按日期倒序', () => {
    const posts = [
      post({ title: '普通新', pubDate: new Date('2026-08-01') }),
      post({ title: '置顶旧', pubDate: new Date('2026-01-01'), pinned: true }),
      post({ title: '置顶新', pubDate: new Date('2026-06-01'), pinned: true }),
    ];
    expect(sortPinnedFirst(posts).map((p) => p.data.title)).toEqual([
      '置顶新',
      '置顶旧',
      '普通新',
    ]);
  });
});

describe('标签/分类详情页：过滤后仍需置顶优先', () => {
  it('按标签过滤后，置顶但更旧的文章仍排在未置顶但更新的文章前面', () => {
    const posts = [
      post({ title: '未置顶新', pubDate: new Date('2026-08-01'), tags: ['随笔'] }),
      post({ title: '置顶旧', pubDate: new Date('2026-01-01'), pinned: true, tags: ['随笔'] }),
      post({ title: '不在此标签', pubDate: new Date('2026-09-01'), tags: ['教程'] }),
    ];
    // 模拟 tags/[tag].astro 的 getStaticPaths：先按标签过滤，再置顶排序
    const filtered = sortPinnedFirst(posts.filter((p) => p.data.tags.includes('随笔')));
    expect(filtered.map((p) => p.data.title)).toEqual(['置顶旧', '未置顶新']);
  });
});

describe('groupByCategory', () => {
  it('按文章数倒序统计分类', () => {
    const posts = [
      post({ title: 'A', category: '教程' }),
      post({ title: 'B', category: '教程' }),
      post({ title: 'C', category: '随笔' }),
    ];
    expect(groupByCategory(posts)).toEqual([
      { name: '教程', count: 2 },
      { name: '随笔', count: 1 },
    ]);
  });
});

describe('groupByTag', () => {
  it('展开并统计标签', () => {
    const posts = [
      post({ title: 'A', tags: ['部署', 'Cloudflare'] }),
      post({ title: 'B', tags: ['部署'] }),
    ];
    expect(groupByTag(posts)).toEqual([
      { name: '部署', count: 2 },
      { name: 'Cloudflare', count: 1 },
    ]);
  });

  it('无标签文章不产生条目', () => {
    expect(groupByTag([post({ title: 'A' })])).toEqual([]);
  });
});

describe('groupByYear', () => {
  it('按年份倒序分组，组内按日期倒序', () => {
    const posts = [
      post({ title: '2025', pubDate: new Date('2025-05-01') }),
      post({ title: '2026-01', pubDate: new Date('2026-01-01') }),
      post({ title: '2026-08', pubDate: new Date('2026-08-01') }),
    ];
    const groups = groupByYear(posts);
    expect(groups.map((g) => g.year)).toEqual([2026, 2025]);
    expect(groups[0].posts.map((p) => p.data.title)).toEqual(['2026-08', '2026-01']);
  });
});

describe('computeStats', () => {
  it('统计文章数、标签数、分类数（去重）', () => {
    const posts = [
      post({ title: 'A', tags: ['x', 'y'], category: '教程' }),
      post({ title: 'B', tags: ['x'], category: '随笔' }),
    ];
    expect(computeStats(posts)).toEqual({
      postCount: 2,
      tagCount: 2,
      categoryCount: 2,
    });
  });
});

describe('filterFeatured', () => {
  it('只保留 featured 为 true 的文章', () => {
    const posts = [
      post({ title: 'A', featured: true }),
      post({ title: 'B' }),
      post({ title: 'C', featured: true }),
    ];
    expect(filterFeatured(posts).map((p) => p.data.title)).toEqual(['A', 'C']);
  });

  it('没有精选文章时返回空数组', () => {
    expect(filterFeatured([post({ title: 'A' })])).toEqual([]);
  });

  it('不修改入参数组', () => {
    const posts = [post({ title: 'A', featured: true }), post({ title: 'B' })];
    filterFeatured(posts);
    expect(posts).toHaveLength(2);
  });
});
