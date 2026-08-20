import { describe, it, expect } from 'vitest';
import {
  AUTHOR,
  AUTHOR_ROLE,
  AVATAR,
  COMMENTS,
  HERO_IMAGE,
  HERO_FOCUS,
  HERO_TONE,
  HERO_TAGLINES,
  MINI_PROGRAM,
  NAV_LINKS,
} from './consts';
import { NAV_ICONS } from './lib/nav-icons';
import { missingCommentFields } from './lib/comments';

describe('首页整屏 Hero 的配置', () => {
  it('HERO_TAGLINES 不为空，且没有空串', () => {
    // 首句会被服务端渲染进 HTML。数组为空时整屏中央会出现一行空白，
    // 打字机脚本也拿不到任何可循环的内容。
    expect(HERO_TAGLINES.length, 'HERO_TAGLINES 至少要有一句').toBeGreaterThan(0);
    for (const line of HERO_TAGLINES) {
      expect(line.trim(), `HERO_TAGLINES 里有空串：${JSON.stringify(line)}`).not.toBe('');
    }
  });

  it('HERO_IMAGE 是以 / 开头的站点根路径', () => {
    // public/ 下的资源必须用绝对路径引用。写成 'hero.webp' 这类相对路径，
    // 在 /blog/xxx 这种子路由上会解析成 /blog/hero.webp 而 404。
    expect(HERO_IMAGE.startsWith('/'), `HERO_IMAGE 应以 / 开头，当前是 ${HERO_IMAGE}`).toBe(true);
  });

  it("HERO_TONE 只能是 'light' 或 'dark'", () => {
    // 它被拼进 <html data-hero-tone>，写错不会报错：
    // 属性选择器匹配不上，就静默沿用 :root 里那套（白字），在浅色底图上直接读不出来。
    expect(['light', 'dark']).toContain(HERO_TONE);
  });

  it('HERO_FOCUS 是合法的 object-position 百分比值', () => {
    // 它被直接拼进内联 style，写错不会报错，只会静默失效退回居中裁切
    expect(HERO_FOCUS).toMatch(/^\d+(\.\d+)?%\s+\d+(\.\d+)?%$/);
  });
});

describe('作者信息', () => {
  it('AVATAR 是以 / 开头的站点根路径', () => {
    // 同 HERO_IMAGE：public/ 下的资源写成相对路径，在子路由页面会 404
    expect(AVATAR.startsWith('/'), `AVATAR 应以 / 开头，当前是 ${AVATAR}`).toBe(true);
  });

  it('AUTHOR 与 AUTHOR_ROLE 都不为空', () => {
    // AUTHOR 同时出现在侧栏头像卡、页脚版权、关于页正文，空值会在三处留下空白
    expect(AUTHOR.trim()).not.toBe('');
    expect(AUTHOR_ROLE.trim()).not.toBe('');
  });
});

describe('侧栏小程序入口', () => {
  it('href 指向站内文章，而不是外链或小程序协议', () => {
    // 网页无法直接唤起小程序，这个链接必须落到站内的介绍文章上；
    // 写成 weixin:// 之类的协议在浏览器里只会是一个点不开的死链。
    expect(MINI_PROGRAM.href.startsWith('/')).toBe(true);
  });

  it('name 与 tagline 要么都填，要么靠 name 留空整体隐藏', () => {
    // widget 用 name 做显隐开关；只填 name 不填 tagline 会渲染出半张空卡
    if (MINI_PROGRAM.name.trim()) {
      expect(MINI_PROGRAM.tagline.trim(), 'name 填了就必须有 tagline').not.toBe('');
    }
  });
});

describe('导航入口', () => {
  // 顶级项 + 所有下拉子项，拍平成一张表
  const allLinks = NAV_LINKS.flatMap((l) => ['children' in l && l.children ? l.children : []].flat().concat(l));

  it('归档页在导航树里有入口', () => {
    // 旧版 Hero 的三个统计数字是 /archive 在全站唯一的入口，
    // 改成整屏后统计被移除，入口必须留在导航里（现在挂在「文章」下拉下面），
    // 否则归档页彻底失联。
    expect(
      allLinks.some((l) => l.href === '/archive'),
      'NAV_LINKS 及其 children 里都找不到 /archive'
    ).toBe(true);
  });

  it('所有导航链接的 href 都以 / 开头', () => {
    for (const l of allLinks) {
      expect(l.href.startsWith('/'), `${l.label} 的 href 不是根路径：${l.href}`).toBe(true);
    }
  });

  it('顶级导航项不重复', () => {
    // 子项允许和父项同 href（父项指向板块索引页，子项里也列一条「全部文章」），
    // 所以只查顶级这一层。
    const hrefs = NAV_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size, `顶级导航有重复项：${hrefs.join(', ')}`).toBe(hrefs.length);
  });

  it('每个顶级项都有图标，且 NAV_ICONS 里没有多余条目', () => {
    // 漏配的话页面上只会静默多出一个 16px 空框，肉眼很容易漏掉；
    // 反向也查一遍，避免删了导航项却留下没人用的图形。
    for (const l of NAV_LINKS) {
      expect(l.icon, `${l.label} 缺少 icon 字段`).toBeTruthy();
      expect(NAV_ICONS[l.icon], `${l.label} 的 icon "${l.icon}" 在 NAV_ICONS 里没有对应图形`).toBeTruthy();
    }
    const used = new Set(NAV_LINKS.map((l) => l.icon));
    for (const name of Object.keys(NAV_ICONS)) {
      expect(used.has(name), `NAV_ICONS 里的 "${name}" 已经没有导航项在用`).toBe(true);
    }
  });
});

describe('评论系统配置', () => {
  const PROVIDERS = ['none', 'giscus', 'twikoo', 'waline'];

  it('provider 只能是四档之一', () => {
    // 写错不会报错：分发器四个分支全不命中，评论区静默消失
    expect(PROVIDERS).toContain(COMMENTS.provider);
  });

  it('每档 provider 的配置对象都存在', () => {
    // 分发器把整组配置当 props 传下去，缺对象会在构建期炸在组件里，
    // 报错信息离病根很远，所以在这里先拦一道
    for (const p of PROVIDERS.filter((p) => p !== 'none')) {
      expect(COMMENTS[p as 'giscus' | 'twikoo' | 'waline'], `COMMENTS.${p} 不存在`).toBeTruthy();
    }
  });

  it('启用的 provider 没有缺失的必填字段', () => {
    // 判定逻辑在 lib/comments.ts，那边用造数据证明过它真的会报缺失；
    // 这里只负责把它浇到真实配置上。填一半就上线是最危险的情形：
    // 静态站构建不报错，页面上只是一块空白，只有真人打开才发现。
    const missing = missingCommentFields(COMMENTS);
    expect(
      missing,
      `provider 已设为 ${COMMENTS.provider}，但这些必填字段是空的：${missing.join(', ')}`
    ).toEqual([]);
  });

  it('lazyOnPosts 是布尔值', () => {
    // 它被 define:vars 传进 is:inline 脚本做 if 判断，
    // 写成字符串 'false' 会被当成真值，懒加载静默失效
    expect(typeof COMMENTS.lazyOnPosts).toBe('boolean');
  });
});
