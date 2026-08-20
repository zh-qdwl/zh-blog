import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

describe('归一后的路径键真的接到了每个 provider（扫描组件源码）', () => {
  // 为什么要靠扫源码：上面那些纯函数断言全绿，也证明不了这个键**被传下去了**。
  // 交付时 provider='none'，三个 provider 组件在构建产物里根本不出现，
  // 漏传是完全静默的——构建不报错，只有真启用那一档、并且真有两个访客分别从
  // 带斜杠 / 不带斜杠的地址进来时才会暴露：评论被拆成两条互相看不见的线。
  // giscus 就漏过一次（连 Props 里都没有 path，还硬写着 mapping="pathname"），
  // 所以这里逐个盯住三档。
  const COMPONENTS = join(import.meta.dirname, '..', 'components');
  const dispatcher = readFileSync(join(COMPONENTS, 'Comments.astro'), 'utf-8');
  const PROVIDERS = ['CommentsGiscus', 'CommentsTwikoo', 'CommentsWaline'];

  for (const tag of PROVIDERS) {
    it(`分发器给 <${tag}> 传了 path={path}`, () => {
      const m = dispatcher.match(new RegExp(`<${tag}[^>]*>`));
      expect(m, `Comments.astro 里找不到 <${tag}>`).not.toBeNull();
      expect(m![0], `<${tag}> 没有把构建期算出的 path 传下去`).toContain('path={path}');
    });

    it(`${tag} 自己声明了 path 并交给了 define:vars`, () => {
      const src = readFileSync(join(COMPONENTS, 'comments', `${tag}.astro`), 'utf-8');
      // Astro 不会因为多传一个未声明的 prop 而报错，只会静默丢掉
      expect(src, `${tag} 的 Props 里没有 path`).toMatch(/path:\s*string/);
      const vars = src.match(/define:vars=\{\{([^}]*)\}\}/);
      expect(vars, `${tag} 里找不到 define:vars`).not.toBeNull();
      expect(vars![1], `${tag} 没把 path 交给 define:vars，is:inline 脚本里就拿不到它`).toMatch(
        /\bpath\b/
      );
    });
  }

  it('giscus 用 specific + term 喂键，不用 mapping="pathname"', () => {
    // giscus 的 client.js 里，pathname 分支是
    //   c.term = 2 > location.pathname.length ? 'index'
    //          : location.pathname.substring(1).replace(/\.\w+$/, '')
    // 只去掉开头的 / 和 .扩展名，**不归一尾斜杠**；specific 分支才是 c.term = b.term。
    const src = readFileSync(join(COMPONENTS, 'comments', 'CommentsGiscus.astro'), 'utf-8');
    expect(src, "data-mapping 应为 'specific'").toMatch(/'data-mapping',\s*'specific'/);
    expect(src, 'data-term 应喂构建期算好的 path').toMatch(/'data-term',\s*path/);
    expect(src, "不能退回 'pathname'：那条分支读的是访客当时的 location.pathname").not.toMatch(
      /'data-mapping',\s*'pathname'/
    );
    // client.js 里 c.strict = b.strict || '0'——specific 不显式给 data-strict 就是
    // 非严格模式，giscus 会用 term 做「标题包含」的模糊匹配去找 Discussion。
    expect(src, "specific 映射必须显式给 data-strict='1'，否则退回非严格的模糊匹配").toMatch(
      /'data-strict',\s*'1'/
    );
  });
});
