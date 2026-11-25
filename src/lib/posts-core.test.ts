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

describe('groupByYear UTC 归组', () => {
  it('UTC 午夜的日期按 UTC 年归组，不受构建机时区影响', () => {
    const mk = (id: string, iso: string) => ({
      id,
      data: { title: id, description: '', pubDate: new Date(iso), updatedDate: undefined, tags: [], category: 'c', pinned: false, featured: false, draft: false },
    });
    const posts = [
      mk('a', '2025-12-31T23:00:00Z'),
      mk('b', '2026-01-01T00:30:00Z'),
    ];
    const groups = groupByYear(posts);
    // UTC 23:00 是 2025 年，00:30 是 2026 年 —— 严格按 UTC 分界
    expect(groups.map((g) => g.year)).toEqual([2026, 2025]);
    expect(groups[0].posts[0].id).toBe('b');
    expect(groups[1].posts[0].id).toBe('a');
  });
});

// ===== getNeighbors / groupBySeries =====

import { getNeighbors, groupBySeries } from './posts-core';

function mk(id: string, pubDate: string, series?: string): PostLike {
  return {
    id,
    data: {
      title: id,
      description: '',
      pubDate: new Date(pubDate),
      tags: [],
      category: 't',
      pinned: false,
      featured: false,
      draft: false,
      ...(series ? { series } : {}),
    },
  };
}

describe('getNeighbors', () => {
  const posts = [mk('a', '2026-01-01'), mk('b', '2026-01-02'), mk('c', '2026-01-03')];

  it('时间线模式：prev 更早、next 更晚', () => {
    expect(getNeighbors(posts, 'b')).toEqual({ prev: posts[0], next: posts[2] });
  });
  it('边界：最早的没有 prev，最晚的没有 next', () => {
    expect(getNeighbors(posts, 'a').prev).toBeNull();
    expect(getNeighbors(posts, 'c').next).toBeNull();
  });
  it('系列模式：只在同系列内移动，独立文章互不干扰', () => {
    const s1 = [mk('s1a', '2026-02-01', 'Go 系列'), mk('s1b', '2026-02-02', 'Go 系列')];
    const all = [...posts, ...s1];
    expect(getNeighbors(all, 's1a', 'Go 系列')).toEqual({ prev: null, next: s1[1] });
    expect(getNeighbors(all, 's1b', 'Go 系列')).toEqual({ prev: s1[0], next: null });
  });
  it('系列内按写作顺序（升序）而非数组传入顺序', () => {
    const s = [mk('x2', '2026-03-02', 'S'), mk('x1', '2026-03-01', 'S')];
    expect(getNeighbors(s, 'x2', 'S')).toEqual({ prev: s[1], next: null });
  });
  it('找不到文章返回双 null', () => {
    expect(getNeighbors(posts, 'ghost')).toEqual({ prev: null, next: null });
  });
});

describe('groupBySeries', () => {
  it('只收有 series 的文章，组内按写作顺序', () => {
    const posts = [mk('a', '2026-01-01'), mk('s2', '2026-01-02', 'S'), mk('s1', '2026-01-01', 'S')];
    const groups = groupBySeries(posts);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('S');
    expect(groups[0].posts.map((p) => p.id)).toEqual(['s1', 's2']);
  });
  it('系列之间按最近一篇文章倒序', () => {
    const posts = [
      mk('old1', '2026-01-01', '旧系列'),
      mk('old2', '2026-01-05', '旧系列'),
      mk('new1', '2026-02-01', '新系列'),
    ];
    expect(groupBySeries(posts).map((g) => g.name)).toEqual(['新系列', '旧系列']);
  });
  it('空输入返回空数组', () => {
    expect(groupBySeries([])).toEqual([]);
  });
});

// ===== getRelated =====

import { getRelated } from './posts-core';

function rel(id: string, tags: string[], category = '教程', series?: string, date = '2026-08-01'): PostLike {
  return {
    id,
    data: {
      title: id,
      description: '',
      pubDate: new Date(date),
      tags,
      category,
      pinned: false,
      featured: false,
      draft: false,
      ...(series ? { series } : {}),
    },
  };
}

describe('getRelated', () => {
  it('共同标签越多排越前', () => {
    const cur = rel('cur', ['tmux', 'Linux', '教程']);
    const all = [cur, rel('one', ['tmux']), rel('two', ['tmux', 'Linux'])];
    expect(getRelated(all, cur).map((p) => p.id)).toEqual(['two', 'one']);
  });

  it('同系列比同标签权重更高', () => {
    const cur = rel('cur', ['a'], '教程', 'S');
    const all = [cur, rel('tagOnly', ['a']), rel('sameSeries', ['zzz'], '教程', 'S')];
    expect(getRelated(all, cur)[0].id).toBe('sameSeries');
  });

  it('同分类权重最低，仅作为弱信号', () => {
    const cur = rel('cur', ['a'], '教程');
    const all = [cur, rel('catOnly', [], '教程'), rel('tagMatch', ['a'], '其他')];
    expect(getRelated(all, cur).map((p) => p.id)).toEqual(['tagMatch', 'catOnly']);
  });

  it('排除自身、排除无任何关联的文章、排除草稿', () => {
    const cur = rel('cur', ['a']);
    const draft = { ...rel('draft', ['a']), data: { ...rel('draft', ['a']).data, draft: true } };
    const all = [cur, rel('unrelated', ['zzz'], '其他'), draft];
    expect(getRelated(all, cur)).toEqual([]);
  });

  it('同分时新文章优先', () => {
    const cur = rel('cur', ['a']);
    const all = [cur, rel('old', ['a'], '教程', undefined, '2026-01-01'), rel('new', ['a'], '教程', undefined, '2026-06-01')];
    expect(getRelated(all, cur).map((p) => p.id)).toEqual(['new', 'old']);
  });

  it('limit 生效', () => {
    const cur = rel('cur', ['a']);
    const all = [cur, rel('x1', ['a']), rel('x2', ['a']), rel('x3', ['a']), rel('x4', ['a'])];
    expect(getRelated(all, cur, 2)).toHaveLength(2);
  });
});
