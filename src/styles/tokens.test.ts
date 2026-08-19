import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { composite, contrastRatio, parseColor } from '../lib/contrast';

const __dirname = import.meta.dirname;
const SRC_ROOT = join(__dirname, '..');
const TOKENS = join(__dirname, 'tokens.css');

/** 递归收集 dir 下所有 .css / .astro 文件的绝对路径 */
function collectStyleFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) result.push(...collectStyleFiles(full));
    else if (entry.endsWith('.css') || entry.endsWith('.astro')) result.push(full);
  }
  return result;
}

/** 从一个 CSS 块里抽出所有 --var: value 声明 */
function parseBlock(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

/**
 * 读取 tokens.css，返回亮/暗两套已解析的令牌表。
 * 暗色块只覆盖部分令牌，未覆盖的沿用亮色——所以暗色表是亮色表的合并结果，
 * 不这样处理会漏掉 --brand / --brand-ink 这类只在亮色块声明的变量。
 */
function readThemes(): { light: Record<string, string>; dark: Record<string, string> } {
  const css = readFileSync(TOKENS, 'utf-8');

  const lightMatch = css.match(/:root\s*\{([^}]+)\}/);
  expect(lightMatch, 'tokens.css 应包含 :root 块').not.toBeNull();
  const light = parseBlock(lightMatch![1]);

  const darkMatch = css.match(/:root\[data-theme='dark'\]\s*\{([^}]+)\}/);
  expect(darkMatch, "tokens.css 应包含 :root[data-theme='dark'] 块").not.toBeNull();
  const dark = { ...light, ...parseBlock(darkMatch![1]) };

  return { light, dark };
}

const AA = 4.5;

describe('配色对比度不变量', () => {
  const { light, dark } = readThemes();
  const themes: Array<[string, Record<string, string>]> = [
    ['亮色', light],
    ['暗色', dark],
  ];

  // 这些组合是「正文与链接文字对背景」的全部场景，红线是 4.5:1。
  const pairs: Array<[string, string]> = [
    ['--text', '--bg'],
    ['--text', '--card'],
    ['--text-soft', '--bg'],
    ['--text-soft', '--card'],
    ['--text-soft', '--bg-soft'],
    ['--link', '--bg'],
    ['--link', '--card'],
    ['--link', '--bg-soft'],
    ['--brand-ink', '--brand'],
    ['--brand-ink', '--brand-strong'],
    ['--brand-ink-soft', '--brand'],
    ['--brand-ink-soft', '--brand-strong'],
    ['--text', '--bg-soft'],
  ];

  for (const [themeName, tokens] of themes) {
    for (const [fg, bg] of pairs) {
      it(`${themeName}：${fg} 对 ${bg} 不低于 ${AA}:1`, () => {
        expect(tokens[fg], `${themeName}缺少 ${fg}`).toBeTruthy();
        expect(tokens[bg], `${themeName}缺少 ${bg}`).toBeTruthy();
        const ratio = contrastRatio(tokens[fg], tokens[bg]);
        expect(ratio, `${themeName} ${fg} on ${bg} = ${ratio}:1`).toBeGreaterThanOrEqual(AA);
      });
    }
  }

  it('磨砂卡片上的正文仍满足对比度（按合成后的等效底色计算）', () => {
    for (const [themeName, tokens] of themes) {
      const glass = tokens['--glass-bg'];
      expect(glass, `${themeName}缺少 --glass-bg`).toBeTruthy();
      // 磨砂层叠在页面底色之上，取合成后的不透明等效色
      const effective = composite(parseColor(glass), parseColor(tokens['--bg']));
      for (const fg of ['--text', '--text-soft', '--link']) {
        const ratio = contrastRatio(tokens[fg], effective);
        expect(ratio, `${themeName} ${fg} 在磨砂卡上 = ${ratio}:1`).toBeGreaterThanOrEqual(AA);
      }
    }
  });

  it('--brand-soft 叠在 --card 上的等效色仍满足对比度（.tag / 数字角标 / widget li a:hover / a[aria-current] 的真实场景）', () => {
    for (const [themeName, tokens] of themes) {
      const brandSoft = tokens['--brand-soft'];
      expect(brandSoft, `${themeName}缺少 --brand-soft`).toBeTruthy();
      const effective = composite(parseColor(brandSoft), parseColor(tokens['--card']));
      for (const fg of ['--link', '--text']) {
        const ratio = contrastRatio(tokens[fg], effective);
        expect(ratio, `${themeName} ${fg} 在 --brand-soft 合成底色上 = ${ratio}:1`).toBeGreaterThanOrEqual(AA);
      }
    }
  });
});

describe('整屏 Hero 的遮罩合同', () => {
  // 底图由 HERO_IMAGE 指定、随时可换，所以「当前这张图够暗/够亮」不能作为对比度依据。
  // 唯一在换图后仍然成立的保证是遮罩本身，这里就按各套配色的最坏底图断言。
  //
  // 两套的最坏方向相反，写反了测试会变成一张永远通过的空头支票：
  //   白字压深色遮罩 → 最坏是底图纯白（合成后最亮，与白字最接近）
  //   深字压浅色遮罩 → 最坏是底图纯黑（合成后最暗，与深字最接近）
  const css = readFileSync(TOKENS, 'utf-8');

  const tones: Array<[string, RegExp, string]> = [
    ['暗色底图（默认 :root）', /:root\s*\{([^}]+)\}/, '#ffffff'],
    ["浅色底图（:root[data-hero-tone='light']）", /:root\[data-hero-tone='light'\]\s*\{([^}]+)\}/, '#000000'],
  ];

  for (const [name, blockRe, worstImage] of tones) {
    it(`${name}：底图取最坏值 ${worstImage} 时文字仍不低于 ${AA}:1`, () => {
      const m = css.match(blockRe);
      expect(m, `tokens.css 应包含 ${name} 的令牌块`).not.toBeNull();
      const tokens = parseBlock(m![1]);

      const scrim = tokens['--hero-scrim'];
      expect(scrim, `${name} 缺少 --hero-scrim`).toBeTruthy();
      const worstCase = composite(parseColor(scrim), parseColor(worstImage));

      const fg = '--hero-ink';
      expect(tokens[fg], `${name} 缺少 ${fg}`).toBeTruthy();
      const ratio = contrastRatio(tokens[fg], worstCase);
      expect(
        ratio,
        `${name} ${fg} 压在「${worstImage} 底图 + 遮罩」上 = ${ratio}:1`
      ).toBeGreaterThanOrEqual(AA);
    });
  }

  // 中央遮罩去掉后，打字机文案直接压在底图上，改由每个字自带的一圈实色描边
  // （Hero.astro 里 8 条 0 模糊的 text-shadow）保证可读性。描边不透明，
  // 所以字形边缘的底色恒等于 --hero-halo，这条对比度是可以断言的——
  // 不像 opacity 或模糊光晕那样是浏览器合成出来、令牌系统看不见的颜色。
  for (const [name, blockRe] of [
    ['暗色底图（默认 :root）', /:root\s*\{([^}]+)\}/],
    ["浅色底图（:root[data-hero-tone='light']）", /:root\[data-hero-tone='light'\]\s*\{([^}]+)\}/],
  ] as Array<[string, RegExp]>) {
    it(`${name}：文案描边 --hero-halo 对 --hero-ink 不低于 ${AA}:1`, () => {
      const tokens = parseBlock(readFileSync(TOKENS, 'utf-8').match(blockRe)![1]);
      for (const role of ['--hero-ink', '--hero-halo']) {
        expect(tokens[role], `${name} 缺少 ${role}`).toBeTruthy();
      }
      const ratio = contrastRatio(tokens['--hero-ink'], tokens['--hero-halo']);
      expect(ratio, `${name} --hero-ink 对 --hero-halo = ${ratio}:1`).toBeGreaterThanOrEqual(AA);
    });
  }

  it('两套配色必须成对声明，缺一项就会在切换 HERO_TONE 时静默沿用另一套的值', () => {
    const roles = [
      '--hero-ink',
      '--hero-halo',
      '--hero-scrim',
      '--hero-veil',
      '--hero-veil-line',
      '--hero-veil-line-strong',
      '--hero-fallback',
    ];
    for (const [name, blockRe] of tones) {
      const tokens = parseBlock(css.match(blockRe)![1]);
      for (const role of roles) {
        expect(tokens[role], `${name} 缺少 ${role}`).toBeTruthy();
      }
    }
  });
});

describe('配色角色契约', () => {
  const { light, dark } = readThemes();

  it('亮暗两套都必须声明 --brand / --brand-ink / --link 三个角色', () => {
    for (const [name, tokens] of [['亮色', light], ['暗色', dark]] as const) {
      for (const role of ['--brand', '--brand-ink', '--link']) {
        expect(tokens[role], `${name}缺少角色变量 ${role}`).toBeTruthy();
      }
    }
  });

  it('--brand 亮度过高，不得作为文字色使用（扫描 src 下所有 .css/.astro）', () => {
    // 允许 var(--brand-ink) / var(--brand-soft) / var(--brand-strong)；
    // 负向前瞻排除 border-color / background-color 等复合属性
    const invalid = /(?<![a-z-])color\s*:\s*var\(--brand\)/;
    const files = collectStyleFiles(SRC_ROOT);
    expect(files.length, '应能在 src 下找到样式文件').toBeGreaterThan(0);
    for (const file of files) {
      expect(
        readFileSync(file, 'utf-8'),
        `${relative(SRC_ROOT, file)} 中不应有 color: var(--brand)（对比度过低）`
      ).not.toMatch(invalid);
    }
  });

  /**
   * 算出「不能当文字色」的令牌集合：对 --card 的对比度在亮暗任一主题下低于 4.5:1 的，
   * 放到文字位置上就读不出来（--card 是评论区、卡片、正文区的实际底色）。
   * 刻意算而不是手写一张名单——手写的话，将来新增一个同样过亮的令牌会静默绕过约束。
   * 非颜色值（阴影、尺寸、字体栈）解析不了，跳过。
   */
  function unreadableAsText(): Set<string> {
    const out = new Set<string>();
    for (const tokens of [light, dark]) {
      for (const [name, value] of Object.entries(tokens)) {
        let ratio: number;
        try {
          ratio = contrastRatio(value, tokens['--card']);
        } catch {
          continue;
        }
        if (ratio < AA) out.add(name);
      }
    }
    return out;
  }

  it('不得把「不能当文字」的令牌灌进任何以 -color 结尾的自定义属性（三方 widget 换肤的坑）', () => {
    // 为什么要单独加这一条：上面那条只管 bare `color:`，它的负向前瞻 (?<![a-z-]) 会把
    // `--waline-active-color: var(--brand)` 整个放过——属性名里 color 前面就是个 `-`。
    // 而 waline.css 里 --waline-theme-color / --waline-active-color / --waline-badge-color
    // 全是**前景色**角色（分别驱动 13 / 5 / 2 处 color:），灌进 --brand 就是 2.14:1 的正文，
    // 而且不报错、页面照样渲染，只是读不出来。所以按「属性名以 -color 结尾」再筛一遍。
    const unreadable = unreadableAsText();
    // 守卫自检：万一 tokens.css 的解析坏了，集合会变空，整条约束就成了空头支票
    expect(unreadable.has('--brand'), '自检：--brand（亮色 2.14:1）应被判为不能当文字').toBe(true);
    expect(unreadable.has('--brand-strong'), '自检：--brand-strong（亮色 2.77:1）应被判为不能当文字').toBe(true);
    expect(unreadable.has('--link'), '自检：--link 是本站的文字/链接色，不该被判进来').toBe(false);

    // 例外：属性名自己说明了是背景/边框/阴影角色（bg / background / border / shadow），
    // 亮色令牌本来就该往那里放。--waline-bq-color 也在例外里：名字看不出角色，
    // 但对着 v3 的 waline.css 核过——它只驱动 [data-waline] blockquote 的
    // border-inline-start，是边框色。除此之外一律按前景色对待：
    // 三方变量表里分不清角色时，宁可误报也不要漏掉一处 2.14:1 的正文。
    const nonTextRole = /(^|-)(bg|background|border|shadow)(-|$)|^--waline-bq-color$/;
    const files = collectStyleFiles(SRC_ROOT);
    expect(files.length, '应能在 src 下找到样式文件').toBeGreaterThan(0);
    for (const file of files) {
      const css = readFileSync(file, 'utf-8');
      for (const m of css.matchAll(/(--[\w-]*-color)\s*:\s*var\((--[\w-]+)\)/g)) {
        const [, prop, token] = m;
        if (nonTextRole.test(prop)) continue;
        const ratios = [light, dark]
          .map((t) => (t[token] ? contrastRatio(t[token], t['--card']) : NaN))
          .join(' / ');
        expect(
          unreadable.has(token),
          `${relative(SRC_ROOT, file)} 把 ${token} 灌进了 ${prop}：` +
            `以 -color 结尾的自定义属性按前景色对待，而 ${token} 对 --card 只有 ${ratios}（亮/暗），` +
            `低于 ${AA}:1。文字色请用 --link（链接）或 --text / --text-soft（正文）。`
        ).toBe(false);
      }
    }
  });

  it('不得把 --waline-code-bg-color 映射到任何与 waline.css 硬编码前景 #bbb 凑不够对比度的令牌', () => {
    // 上面那条「-color 结尾」的守卫为什么拦不住这一个案例：--waline-code-bg-color 名字里
    // 带 "bg"，命中 nonTextRole 的例外，被判定成「背景角色，映射什么都行」——这个判断本身
    // 没错，它确实是背景角色。但错在：这个「背景令牌」在 waline.css 里有一个变量系统看不见、
    // 换不掉的硬编码搭档 —— `.wl-content pre code { color: #bbb }`（权重 (0,1,2)，
    // 我们写在 :root/#waline-mount 上的变量表够不到）。
    // 判断它安不安全，不能像别的前景变量那样去量「对 --card 的对比度」——它压根不是给
    // --card 配对的，量出来的数字文不对题。只能直接拿 waline.css 里那个硬编码前景去量。
    //
    // 这也是为什么删掉这条映射（FINDING 2）之后必须单独补一条守卫：不这样做的话，
    // 未来有人为了让代码块跟站点配色统一，把 --waline-code-bg-color 映射回 --code-bg，
    // 会在上面那条「-color 结尾」的守卫和「--brand 亮度过高」那条守卫下都全绿通过——
    // 两条都不检查这个变量与硬编码 #bbb 的搭配，实际效果却是把代码块的文字变不可见。
    const WALINE_HARDCODED_CODE_FG = '#bbbbbb';

    // 自检：不靠下面 for 循环里「扫到 0 条就什么都不断言」来证明守卫有效——
    // 必须独立复现 re-review 量出的 1.80:1 且判定为不达标，否则说明这条断言的计算链路
    // 本身就是坏的，整条约束会在「comments.css 里没人这么写」的当下静默通过，
    // 却在真被写回去的那天照样放行。
    const selfCheckLight = contrastRatio(WALINE_HARDCODED_CODE_FG, light['--code-bg']);
    expect(selfCheckLight, `自检：#bbb 对亮色 --code-bg 应为 1.8:1 左右，实测 ${selfCheckLight}`).toBeCloseTo(
      1.8,
      1
    );
    expect(selfCheckLight, '自检：这个组合本该判定为不达标（<4.5:1）').toBeLessThan(AA);
    const selfCheckWaline = contrastRatio(WALINE_HARDCODED_CODE_FG, '#282c34');
    expect(
      selfCheckWaline,
      `自检：#bbb 对 Waline 自带默认底色 #282c34 应为 7.29:1 左右，实测 ${selfCheckWaline}`
    ).toBeGreaterThanOrEqual(AA);

    const files = collectStyleFiles(SRC_ROOT);
    for (const file of files) {
      const css = readFileSync(file, 'utf-8');
      for (const m of css.matchAll(/--waline-code-bg-color\s*:\s*var\(\s*(--[\w-]+)\s*\)/g)) {
        const [, token] = m;
        for (const [themeName, tokens] of [
          ['亮色', light],
          ['暗色', dark],
        ] as const) {
          const value = tokens[token];
          expect(value, `${themeName}缺少 ${token}`).toBeTruthy();
          const ratio = contrastRatio(WALINE_HARDCODED_CODE_FG, value);
          expect(
            ratio,
            `${relative(SRC_ROOT, file)} 把 --waline-code-bg-color 映射到了 ${token}：` +
              `waline.css 给 .wl-content pre code 硬编码了 color:#bbb（权重 (0,1,2)，本文件的变量表` +
              `覆盖不到这一条），${themeName}下 #bbb 对 ${token}（${value}）只有 ${ratio}:1，` +
              `低于 ${AA}:1，代码块里的文字会读不出来。Waline 自己的默认底色 #282c34 就是照 #bbb ` +
              `配的（7.29:1），那才是能读的那一对——不要覆盖 --waline-code-bg-color，让 Waline 自带的` +
              `深色代码框留着。`
          ).toBeGreaterThanOrEqual(AA);
        }
      }
    }
  });
});

describe('自定义属性引用不能指向不存在的令牌', () => {
  // FINDING B：`--waline-theme-color: var(--lnk)` 这种打字错误——把 --link 少打一个字母——
  // 浏览器不会报错，只会让这条声明**静默失效**：Waline 拿不到这个变量的值，退回它自己内置的
  // 默认前景色。那正是 FINDING 1 修复之前的低对比度状态，重新量过：--waline-theme-color 的
  // 默认值 #27ae60 对亮色 --card 只有 2.87:1，--waline-active-color 默认值 #2ecc71 只有
  // 2.10:1，--waline-badge-color 默认值 #3498db 只有 3.15:1，全部不达标。
  // 现有测试只检查「选对了的值读不读得出来」，从没检查过「引用的令牌到底存不存在」。
  const files = collectStyleFiles(SRC_ROOT);

  /**
   * 把整份文件当纯文本扫一遍「看起来像自定义属性声明」的名字：要求以分号收尾，
   * 排除说明性文字里恰好出现 `--xxx:` 但没有分号收尾的假阳性（中文注释几乎不会
   * 写出这种带分号的片段，实测扫全部 src 下 .css/.astro 也没有一处误命中）。
   *
   * 不局限于 tokens.css 的 :root 块，这样才能同时认出三类「已经有地方定义」的情况：
   *   1. tokens.css 的三个 :root 块——全局设计令牌；
   *   2. comments.css 里 `:root, #waline-mount` 那一整张 Waline 变量表——这些自定义属性
   *      是本文件的**局部定义**，从来就不在 tokens.css 里，但同样不算「未定义」；
   *   3. PostCard.astro 用内联 style 写的 `` `--i:${index};` ``——纯文本正则不关心它是不是
   *      写在 <style> 标签里，一样能抓到。
   */
  function collectDefinedCustomProps(fileList: string[]): Set<string> {
    const out = new Set<string>();
    for (const file of fileList) {
      const css = readFileSync(file, 'utf-8');
      for (const m of css.matchAll(/(--[\w-]+)\s*:\s*[^;]+;/g)) out.add(m[1]);
    }
    return out;
  }

  const defined = collectDefinedCustomProps(files);

  // 已知的合法例外：Shiki 在构建期给每一段高亮代码内联写
  // style="--shiki-dark:...;--shiki-dark-bg:...;..."（base.css 的 .astro-code 那几条规则消费
  // 它们），这些自定义属性由 Shiki 逐 span 生成在构建产物里，src 下永远找不到「定义」——
  // 这是「确实在别处定义、只是不在本仓库源码里」的合法情形，不是拼写错误。
  // 逐个核对过 base.css 里的消费方（color / background-color / font-style / font-weight /
  // text-decoration 五条）之后才列进白名单，不是图省事筛掉报错。
  const externallyDefined = new Set([
    '--shiki-dark',
    '--shiki-dark-bg',
    '--shiki-dark-font-style',
    '--shiki-dark-font-weight',
    '--shiki-dark-text-decoration',
  ]);

  it('自检：应扫到已知存在的令牌、扫不到瞎编的令牌，否则下面的断言是空头支票', () => {
    for (const known of ['--link', '--card', '--brand', '--waline-theme-color', '--waline-white', '--i']) {
      expect(defined.has(known), `自检：应识别出已定义的 ${known}`).toBe(true);
    }
    expect(
      defined.has('--this-token-does-not-exist'),
      '自检：编造的令牌名不该被判定为已定义'
    ).toBe(false);
  });

  it('每个 var(--x) 引用的自定义属性都能在 src 下找到定义（本站令牌或第三方局部定义均可）', () => {
    for (const file of files) {
      const css = readFileSync(file, 'utf-8');
      for (const m of css.matchAll(/var\(\s*(--[\w-]+)\s*(,[^)]*)?\)/g)) {
        const [, token, fallback] = m;
        // 带回退值的引用即使目标不存在也不会静默失效——fallback 就是显式声明的兜底行为，
        // 不属于本条要拦的「悄悄失效」，例如 motion.css 的 var(--i, 0)。
        if (fallback) continue;
        if (externallyDefined.has(token)) continue;
        expect(
          defined.has(token),
          `${relative(SRC_ROOT, file)} 引用了 var(${token})，但这个自定义属性在 src 下找不到任何定义，` +
            `多半是拼写错误。CSS 对此不会报错，只会让消费它的声明静默失效、退回各自的默认值——` +
            `Waline 的三个前景变量一旦这样退回默认值，就是 FINDING 1 修复之前的低对比度状态。`
        ).toBe(true);
      }
    }
  });
});
