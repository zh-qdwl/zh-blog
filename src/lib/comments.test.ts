import { describe, it, expect } from 'vitest';
import { normalizeCommentPath } from './comments';

describe('normalizeCommentPath', () => {
  it('不带尾斜杠的路径补上尾斜杠', () => {
    // 全站链接写的是 /blog/foo/，但访客手输或外链进来可能是 /blog/foo，
    // 两者必须归一到同一个评论线键
    expect(normalizeCommentPath('/blog/foo')).toBe('/blog/foo/');
  });

  it('已带尾斜杠的路径保持不变（幂等）', () => {
    expect(normalizeCommentPath('/blog/foo/')).toBe('/blog/foo/');
  });

  it('同一篇文章的两种写法产出同一个键', () => {
    // 这条是这个函数存在的全部理由，单独断一次
    expect(normalizeCommentPath('/blog/foo')).toBe(normalizeCommentPath('/blog/foo/'));
  });

  it('根路径保持为 /', () => {
    expect(normalizeCommentPath('/')).toBe('/');
  });

  it('空串兜底为 /', () => {
    // Astro.url.pathname 不会给空串，但这个函数是纯函数，
    // 兜底掉空串才不会在将来某个调用方手里产出 '/' 之外的怪值
    expect(normalizeCommentPath('')).toBe('/');
  });

  it('留言页与文章页的键互不相同', () => {
    // 防止归一化写成「一律返回 /」这类过度归并
    expect(normalizeCommentPath('/guestbook')).not.toBe(normalizeCommentPath('/blog/foo'));
  });
});
