import { describe, it, expect } from 'vitest';
import { normalizeCommentPath, missingCommentFields } from './comments';

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

describe('missingCommentFields', () => {
  // 这一组全部用造出来的配置，不碰真实的 COMMENTS——
  // 真实配置交付时是 provider='none'，拿它测「必填字段缺失」永远走不到分支，
  // 那样的测试恒真、等于没写。
  it("provider='none' 时三组全空也不算缺失", () => {
    expect(
      missingCommentFields({ provider: 'none', giscus: {}, twikoo: {}, waline: {} })
    ).toEqual([]);
  });

  it("provider='twikoo' 且 envId 为空时报出 envId", () => {
    expect(
      missingCommentFields({ provider: 'twikoo', twikoo: { envId: '', region: '' } })
    ).toEqual(['envId']);
  });

  it('只校验启用的那档，未启用的留空不报', () => {
    // 这条是护栏的关键行为：twikoo 填齐了就该放行，
    // 不能因为 waline / giscus 那两组还空着而误报
    expect(
      missingCommentFields({
        provider: 'twikoo',
        twikoo: { envId: 'https://x.workers.dev', region: '' },
        waline: { serverURL: '' },
        giscus: { repo: '', repoId: '', category: '', categoryId: '' },
      })
    ).toEqual([]);
  });

  it('多个字段缺失时全部报出', () => {
    expect(
      missingCommentFields({
        provider: 'giscus',
        giscus: { repo: 'a/b', repoId: '', category: 'General', categoryId: '' },
      })
    ).toEqual(['repoId', 'categoryId']);
  });

  it('只有空白字符也算缺失', () => {
    // 复制粘贴时很容易留下一个空格，视觉上「填了」但实际是空的
    expect(
      missingCommentFields({ provider: 'waline', waline: { serverURL: '   ' } })
    ).toEqual(['serverURL']);
  });

  it('配置组整个缺失时报出该档全部必填字段', () => {
    // 手改 consts.ts 时把整个 waline: {} 块删掉，不该抛异常而应报缺失
    expect(missingCommentFields({ provider: 'waline' })).toEqual(['serverURL']);
  });
});
