import { getCollection, type CollectionEntry } from 'astro:content';
import {
  filterPublished,
  filterFeatured,
  sortByDate,
  sortPinnedFirst,
  groupByCategory,
  groupByTag,
  groupByYear,
  computeStats,
  type ArchiveGroup,
  type Counted,
  type Stats,
} from './posts-core';

export type Post = CollectionEntry<'blog'>;

/** 全站唯一的文章数据入口：已剔除草稿，按日期倒序 */
export async function getPublishedPosts(): Promise<Post[]> {
  return sortByDate(filterPublished(await getCollection('blog')));
}

/** 列表页用：置顶优先，其余按日期倒序 */
export async function getSortedPosts(): Promise<Post[]> {
  return sortPinnedFirst(filterPublished(await getCollection('blog')));
}

/** 作者精选文章，按日期倒序 */
export async function getFeaturedPosts(): Promise<Post[]> {
  return filterFeatured(await getPublishedPosts());
}

export async function getCategories(): Promise<Counted[]> {
  return groupByCategory(await getPublishedPosts());
}

export async function getTags(): Promise<Counted[]> {
  return groupByTag(await getPublishedPosts());
}

export async function getArchive(): Promise<ArchiveGroup<Post>[]> {
  return groupByYear(await getPublishedPosts());
}

export async function getStats(): Promise<Stats> {
  return computeStats(await getPublishedPosts());
}
