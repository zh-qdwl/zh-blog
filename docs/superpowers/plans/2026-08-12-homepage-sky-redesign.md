# 首页天空配色改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把整站配色从暖金黄换成天空蓝，并给首页引入 liuyuyang.net 的视觉手法（磨砂玻璃、渐变、强阴影、密集过渡）与封面图为主的大卡片，同时新增运行时间条、作者卡升级、侧栏随机推荐与作者精选。

**Architecture:** 配色集中在 `src/styles/tokens.css`，改一处整站跟随。换色之前先把 `tokens.test.ts` 从「字面值断言」改成「对比度不变量断言」，这样护栏先立好、换色后仍必须通过。所有新增纯逻辑（对比度换算、随机抽取、运行时长）进 `src/lib/` 并有单测，不写在 `.astro` frontmatter 里。首页专属的大卡片通过 `PostCard` 的 `variant` prop 实现，其他列表页不受影响。

**Tech Stack:** Astro 5.13 · TypeScript · 原生 CSS（CSS 变量 + Grid + backdrop-filter）· Vitest（仅 devDependency）· 零运行时依赖

## Global Constraints

- **不新增任何运行时依赖。** 不引入前端框架，交互只用 `is:inline` 原生脚本。
- **不引入图片素材依赖。** Hero 与封面兜底继续用纯 CSS 渐变。
- **对比度红线：正文与链接文字对背景不低于 4.5:1。**
- **`--brand` (`#38bdf8`) 只能作背景色**（对白底作文字仅 2.14:1），其上文字必须用 `--brand-ink`。文字/链接用 `--link`。
- **不改 `astro.config.mjs`**，保持纯静态输出。
- **中文优先**：所有面向用户的文案、注释用简体中文。
- **颜色值一律引用 `var(--*)`**，禁止在组件里写死十六进制色值（`rgba()` 半透明叠加层除外）。
- `src/lib/*.ts` 中被单测覆盖的模块**不得 import `astro:content`**（构建期虚拟模块，Vitest 下不可用）。
- **每个任务结束必须 `npm run build` 通过（零报错，19 页）且 `npm test` 全绿**才能提交。

## 天空配色目标值（实测，Task 2 使用）

| 变量 | 亮色 | 暗色 |
|---|---|---|
| `--brand` | `#38bdf8` | 同亮色 |
| `--brand-strong` | `#0284c7` | 同亮色 |
| `--brand-ink` | `#0b1b2b` | 同亮色 |
| `--brand-soft` | `rgba(56, 189, 248, 0.16)` | `rgba(56, 189, 248, 0.14)` |
| `--link` | `#0369a1` | `#38bdf8` |
| `--bg` | `#ffffff` | `#0b1220` |
| `--bg-soft` | `#f6f8fb` | `#131c2e` |
| `--card` | `#ffffff` | `#111a2b` |
| `--border` | `#e3e8ef` | `#1f2a3d` |
| `--text` | `#1f2328` | `#e2e8f0` |
| `--text-soft` | `#5b6b7f` | `#93a1b5` |
| `--code-bg` | `#f6f8fa` | `#131c2e` |

## File Structure

| 文件 | 状态 | 职责 |
|---|---|---|
| `src/lib/contrast.ts` | 新 | 纯函数：颜色解析、alpha 合成、WCAG 对比度 |
| `src/lib/contrast.test.ts` | 新 | 上者单测 |
| `src/styles/tokens.test.ts` | 改 | 由字面值断言改为对比度不变量断言 |
| `src/styles/tokens.css` | 改 | 天空配色、冷中性色、磨砂与过渡令牌 |
| `src/content.config.ts` | 改 | schema 加 `featured` |
| `src/content/blog/deploy-on-cloudflare.md` | 改 | 标记 `featured: true` |
| `src/consts.ts` | 改 | 加 `SITE_START`、`AUTHOR_ROLE`、可选社交字段 |
| `src/lib/posts-core.ts` | 改 | 加纯函数 `filterFeatured` |
| `src/lib/posts-core.test.ts` | 改 | 加 `filterFeatured` 测试 |
| `src/lib/posts.ts` | 改 | 加 `getFeaturedPosts()` 封装 |
| `src/lib/home.ts` | 新 | 纯函数：`pickRandom`、`uptimeSince` |
| `src/lib/home.test.ts` | 新 | 上者单测 |
| `src/components/PostCard.astro` | 改 | 兜底改天空色系 + 分类水印；新增 `variant` prop |
| `src/pages/index.astro` | 改 | 首页用 `variant="feature"`，插入运行时间条 |
| `src/components/UptimeBar.astro` | 新 | 运行时间条 |
| `src/components/widgets/ProfileCard.astro` | 改 | 加身份行与更多社交图标 |
| `src/components/widgets/RandomPosts.astro` | 新 | 随机推荐 widget |
| `src/components/widgets/FeaturedPosts.astro` | 新 | 作者精选 widget |
| `src/components/Sidebar.astro` | 改 | 接入两个新 widget |
| `src/styles/base.css` | 改 | 新增 `.glass` 工具类与 `@supports` 回退 |

---

### Task 1: 对比度工具与不变量护栏

**为什么先做这个：** 护栏必须在换色**之前**立好。这样它先在已知良好的金黄配色上验证通过，换成天空色后必须仍然通过——如果新配色有任何一项低于 4.5:1，测试会立刻失败。反过来先换色再改测试，就失去了这层保障。

**Files:**
- Create: `src/lib/contrast.ts`
- Test: `src/lib/contrast.test.ts`
- Modify: `src/styles/tokens.test.ts`（整体替换）

**Interfaces:**
- Consumes: 无
- Produces: `src/lib/contrast.ts` 导出
  - `type Rgba = { r: number; g: number; b: number; a: number }`
  - `parseColor(input: string): Rgba` — 支持 `#rrggbb` 与 `rgba(r, g, b, a)` / `rgb(r, g, b)`
  - `composite(over: Rgba, under: Rgba): Rgba` — 把半透明色合成到不透明底色上，返回 `a: 1`
  - `relativeLuminance(c: Rgba): number`
  - `contrastRatio(a: string | Rgba, b: string | Rgba): number` — 两位小数

- [ ] **Step 1: 写失败的测试**

Create `src/lib/contrast.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseColor, composite, relativeLuminance, contrastRatio } from './contrast';

describe('parseColor', () => {
  it('解析六位十六进制', () => {
    expect(parseColor('#38bdf8')).toEqual({ r: 56, g: 189, b: 248, a: 1 });
  });

  it('忽略大小写与首尾空白', () => {
    expect(parseColor('  #38BDF8 ')).toEqual({ r: 56, g: 189, b: 248, a: 1 });
  });

  it('解析 rgba 并保留 alpha', () => {
    expect(parseColor('rgba(56, 189, 248, 0.16)')).toEqual({ r: 56, g: 189, b: 248, a: 0.16 });
  });

  it('解析 rgb 时 alpha 为 1', () => {
    expect(parseColor('rgb(11, 18, 32)')).toEqual({ r: 11, g: 18, b: 32, a: 1 });
  });

  it('无法识别的输入应抛错，而不是静默返回黑色', () => {
    expect(() => parseColor('var(--brand)')).toThrow();
  });
});

describe('relativeLuminance', () => {
  it('白色为 1，黑色为 0', () => {
    expect(relativeLuminance(parseColor('#ffffff'))).toBeCloseTo(1, 4);
    expect(relativeLuminance(parseColor('#000000'))).toBeCloseTo(0, 4);
  });
});

describe('contrastRatio', () => {
  it('黑白对比为 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('同色对比为 1:1', () => {
    expect(contrastRatio('#38bdf8', '#38bdf8')).toBeCloseTo(1, 2);
  });

  it('参数顺序不影响结果', () => {
    expect(contrastRatio('#0369a1', '#ffffff')).toBe(contrastRatio('#ffffff', '#0369a1'));
  });

  it('复现设计文档中的实测值', () => {
    // 这几个值是配色方案的依据，写死在测试里防止工具本身算错
    expect(contrastRatio('#0369a1', '#ffffff')).toBeCloseTo(5.93, 1); // 亮色链接
    expect(contrastRatio('#38bdf8', '#0b1220')).toBeCloseTo(8.74, 1); // 暗色链接
    expect(contrastRatio('#0b1b2b', '#38bdf8')).toBeCloseTo(8.13, 1); // 天蓝底上的文字
    expect(contrastRatio('#38bdf8', '#ffffff')).toBeCloseTo(2.14, 1); // 亮天蓝当文字：不合格
  });
});

describe('composite', () => {
  it('alpha 为 1 时直接返回上层色', () => {
    const over = parseColor('#38bdf8');
    expect(composite(over, parseColor('#ffffff'))).toEqual({ r: 56, g: 189, b: 248, a: 1 });
  });

  it('alpha 为 0 时返回底色', () => {
    const over = parseColor('rgba(56, 189, 248, 0)');
    expect(composite(over, parseColor('#ffffff'))).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('半透明白叠在深底上会变亮', () => {
    const glass = parseColor('rgba(255, 255, 255, 0.5)');
    const out = composite(glass, parseColor('#000000'));
    expect(out).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('合成结果可直接用于对比度计算', () => {
    // 磨砂卡：62% 白叠在白底上，等效仍是白
    const glass = parseColor('rgba(255, 255, 255, 0.62)');
    const eff = composite(glass, parseColor('#ffffff'));
    expect(contrastRatio('#1f2328', eff)).toBeCloseTo(contrastRatio('#1f2328', '#ffffff'), 2);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./contrast"`

- [ ] **Step 3: 实现 contrast.ts**

Create `src/lib/contrast.ts`:

```ts
// WCAG 对比度计算。纯函数，不 import 任何 Astro 相关模块，可直接单测。
// 用途：tokens.test.ts 用它断言配色的对比度不变量，而不是断言字面色值。

export type Rgba = { r: number; g: number; b: number; a: number };

/** 解析 #rrggbb / rgb(...) / rgba(...)。无法识别时抛错，避免静默算出错误结论。 */
export function parseColor(input: string): Rgba {
  const s = input.trim();

  const hex = /^#([0-9a-fA-F]{6})$/.exec(s);
  if (hex) {
    const n = hex[1];
    return {
      r: parseInt(n.slice(0, 2), 16),
      g: parseInt(n.slice(2, 4), 16),
      b: parseInt(n.slice(4, 6), 16),
      a: 1,
    };
  }

  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/.exec(s);
  if (fn) {
    return {
      r: Number(fn[1]),
      g: Number(fn[2]),
      b: Number(fn[3]),
      a: fn[4] === undefined ? 1 : Number(fn[4]),
    };
  }

  throw new Error(`无法解析颜色：${input}`);
}

/** 把半透明的 over 合成到不透明的 under 之上，返回不透明色 */
export function composite(over: Rgba, under: Rgba): Rgba {
  const mix = (o: number, u: number) => Math.round(o * over.a + u * (1 - over.a));
  return { r: mix(over.r, under.r), g: mix(over.g, under.g), b: mix(over.b, under.b), a: 1 };
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(c: Rgba): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** WCAG 2.1 对比度，保留两位小数。参数顺序无关。 */
export function contrastRatio(a: string | Rgba, b: string | Rgba): number {
  const ca = typeof a === 'string' ? parseColor(a) : a;
  const cb = typeof b === 'string' ? parseColor(b) : b;
  const [hi, lo] = [relativeLuminance(ca), relativeLuminance(cb)].sort((x, y) => y - x);
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test`
Expected: PASS — contrast.test.ts 14 个测试全绿

- [ ] **Step 5: 把 tokens.test.ts 改为断言不变量**

Modify `src/styles/tokens.test.ts` — 整个文件替换为：

```ts
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
});
```

- [ ] **Step 6: 加临时的 `--glass-bg` 令牌让新测试可运行**

新测试引用了 `--glass-bg`，而 Task 2 才正式引入磨砂令牌。为了让 Task 1 自身可验证，现在先在 `src/styles/tokens.css` 的两个块里各加一行（Task 2 会连同整套配色一起重写这两个值）：

在 `:root` 块内 `--code-bg` 那行之后加：

```css
  /* 磨砂卡片底色（半透明，叠在 --bg 之上） */
  --glass-bg: rgba(255, 255, 255, 0.62);
```

在 `:root[data-theme='dark']` 块内 `--code-bg` 那行之后加：

```css
  --glass-bg: rgba(28, 25, 19, 0.58);
```

（暗色这个值是配合当前暖色底的临时值，Task 2 换成天空系时会改为 `rgba(17, 26, 43, 0.58)`。）

- [ ] **Step 7: 运行测试，确认护栏在现有金黄配色上通过**

Run: `npm test`
Expected: PASS — 全部通过。**这一步的意义是证明护栏本身正确**：它在已知良好的配色上不误报。

- [ ] **Step 8: 证明护栏真的有牙齿**

临时把 `src/styles/tokens.css` 亮色块的 `--link` 改成 `#38bdf8`（一个已知对白底只有 2.14:1 的值），然后：

Run: `npm test`
Expected: FAIL — 报 `亮色：--link 对 --bg 不低于 4.5:1`，且失败信息里带上实测比值

改回 `#8a6100`，再次 `npm test` 确认恢复全绿。把这次 RED/GREEN 写进报告。

- [ ] **Step 9: 构建验证**

Run: `npm run build`
Expected: 成功，19 页

- [ ] **Step 10: Commit**

```bash
git add src/lib/contrast.ts src/lib/contrast.test.ts src/styles/tokens.test.ts src/styles/tokens.css
git commit -m "test: 令牌测试改为断言对比度不变量，新增 contrast 工具"
```

---

### Task 2: 换成天空配色

**Files:**
- Modify: `src/styles/tokens.css`（整体替换）

**Interfaces:**
- Consumes: Task 1 的 `tokens.test.ts` 不变量护栏
- Produces: 全站配色变量；新增 `--glass-bg`、`--glass-border`、`--blur`、`--shadow-glass`、`--ease`

- [ ] **Step 1: 整体替换 tokens.css**

Modify `src/styles/tokens.css` — 整个文件替换为：

```css
/* ===== 设计令牌：改这里就能改整站视觉 ===== */
:root {
  /* 品牌色：天空蓝。
     注意 --brand 亮度高（对白底作文字仅 2.14:1），只能作背景、渐变、边框，
     其上文字必须用 --brand-ink。文字/链接用 --link。
     这条约束由 tokens.test.ts 的对比度不变量测试守着。 */
  --brand: #38bdf8;
  --brand-strong: #0284c7;
  --brand-ink: #0b1b2b;
  --brand-soft: rgba(56, 189, 248, 0.16);

  /* 链接色：亮色用深天蓝（对白底 5.93:1，过 WCAG AA）。
     注意 sky-600 #0284c7 只有 4.1:1，不达标，所以没选它。 */
  --link: #0369a1;

  /* 冷中性色：冷灰配天空蓝才干净 */
  --bg: #ffffff;
  --bg-soft: #f6f8fb;
  --card: #ffffff;
  --border: #e3e8ef;
  --text: #1f2328;
  --text-soft: #5b6b7f;
  --code-bg: #f6f8fa;

  /* 磨砂玻璃：半透明底 + 亮边，叠在 --bg 之上。
     不支持 backdrop-filter 时由 base.css 的 @supports 回退为实色 --card。 */
  --glass-bg: rgba(255, 255, 255, 0.62);
  --glass-border: rgba(255, 255, 255, 0.7);
  --blur: 14px;

  --shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-lift: 0 8px 24px rgba(15, 23, 42, 0.1);
  --shadow-glass: 0 12px 40px rgba(15, 23, 42, 0.12);

  /* 统一过渡曲线与时长 */
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
  --dur: 220ms;

  /* 结构 */
  --radius: 12px;
  --radius-card: 16px;
  --maxw-page: 1200px;
  --maxw-prose: 720px;
  --sidebar-w: 260px;
  --toc-w: 240px;

  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', Roboto, Helvetica, Arial, sans-serif;
  --font-mono: 'SFMono-Regular', 'JetBrains Mono', Menlo, Consolas, monospace;
}

:root[data-theme='dark'] {
  /* 暗色下亮天蓝对冷暗底 8.74:1，可以直接当链接色 */
  --link: #38bdf8;
  --brand-soft: rgba(56, 189, 248, 0.14);

  --bg: #0b1220;
  --bg-soft: #131c2e;
  --card: #111a2b;
  --border: #1f2a3d;
  --text: #e2e8f0;
  --text-soft: #93a1b5;
  --code-bg: #131c2e;

  --glass-bg: rgba(17, 26, 43, 0.58);
  --glass-border: rgba(255, 255, 255, 0.08);

  --shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  --shadow-lift: 0 8px 24px rgba(0, 0, 0, 0.55);
  --shadow-glass: 0 12px 40px rgba(0, 0, 0, 0.6);
}
```

- [ ] **Step 2: 运行不变量测试**

Run: `npm test`
Expected: PASS — Task 1 的对比度测试在新配色下全部通过。**这是换色正确性的主要证据**：19 组对比度断言 + 磨砂等效底色断言全绿。

- [ ] **Step 3: 构建验证**

Run: `npm run build`
Expected: 成功，19 页

- [ ] **Step 4: 断言新色值确实进了产物**

Run:
```bash
node -e "
const fs=require('fs');
const dir='dist/_astro';
const css=fs.readdirSync(dir).filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(dir+'/'+f,'utf8')).join('');
const flat=css.replace(/\s/g,'');
for (const t of ['--brand:#38bdf8','--link:#0369a1','--bg:#0b1220','--ease:cubic-bezier']) {
  if(!flat.includes(t)){console.error('FAIL: 缺少 '+t);process.exit(1)}
}
if(flat.includes('#fcd635')){console.error('FAIL: 仍残留金黄 #fcd635');process.exit(1)}
if(flat.includes('#8a6100')){console.error('FAIL: 仍残留旧链接色 #8a6100');process.exit(1)}
console.log('PASS: 天空配色已生效，金黄无残留');
"
```
Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat: 配色由金黄换为天空蓝，中性色改冷灰"
```

---

### Task 3: schema 加 featured，配置加运行起点与身份

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/content/blog/deploy-on-cloudflare.md`（frontmatter）
- Modify: `src/consts.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - frontmatter 新字段 `featured: boolean`（默认 `false`）
  - `src/consts.ts` 新增 `SITE_START: string`（ISO 日期）、`AUTHOR_ROLE: string`；`SOCIAL` 新增可选 `gitee`、`juejin`、`csdn`

- [ ] **Step 1: schema 加 featured**

Modify `src/content.config.ts` — 在 `pinned` 那一行之后加：

```ts
    // 作者精选：在侧栏「作者精选」widget 中列出
    featured: z.boolean().default(false),
```

- [ ] **Step 2: 标记一篇文章为精选**

Modify `src/content/blog/deploy-on-cloudflare.md` — frontmatter 整体替换为：

```yaml
---
title: 把博客部署到 Cloudflare Pages
description: GitHub 连接 Cloudflare Pages，推送即自动上线，全程免费。
pubDate: 2026-08-09
category: 部署
tags: ['部署', 'Cloudflare']
featured: true
---
```

- [ ] **Step 3: 配置加运行起点、身份与可选社交**

Modify `src/consts.ts` — 把 `AVATAR` 那一行之后、`NAV_LINKS` 之前的部分改为（即在 `AVATAR` 后新增 `AUTHOR_ROLE` 与 `SITE_START`）：

```ts
// 一句身份描述，显示在首页作者卡与侧栏头像卡上
export const AUTHOR_ROLE = '前端开发 · 记录所学与折腾过程';

// 建站日期（ISO），用于首页「本站已运行 X 天」。改成你真实的起点。
export const SITE_START = '2026-08-09';
```

同时把 `SOCIAL` 整体替换为（新增三个可选字段，留空自动隐藏）：

```ts
// 社交/联系方式链接（留空的会自动隐藏）
export const SOCIAL = {
  // github 是个人主页，用于页脚和头像卡的社交图标
  github: 'https://github.com/zh-qdwl',
  // repo 是本博客的仓库地址，用于生成「开 Issue」链接。
  // 注意别和上面的个人主页搞混：主页拼 /issues 是打不开的。
  repo: 'https://github.com/zh-qdwl/zh-blog',
  email: '1498690097@qq.com',
  rss: '/rss.xml',
  // 下面三个留空则不显示
  gitee: '',
  juejin: '',
  csdn: '',
};
```

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 成功，19 页，无 schema 校验错误

- [ ] **Step 5: 断言 featured 字段已被 schema 接受**

Run:
```bash
node -e "
const fs=require('fs');
const md=fs.readFileSync('src/content/blog/deploy-on-cloudflare.md','utf8');
if(!md.includes('featured: true')){console.error('FAIL: 文章未标记 featured');process.exit(1)}
const cfg=fs.readFileSync('src/content.config.ts','utf8');
if(!cfg.includes('featured:')){console.error('FAIL: schema 缺 featured');process.exit(1)}
const c=fs.readFileSync('src/consts.ts','utf8');
for(const k of ['SITE_START','AUTHOR_ROLE','gitee','juejin','csdn']){
  if(!c.includes(k)){console.error('FAIL: consts 缺 '+k);process.exit(1)}
}
console.log('PASS');
"
```
Expected: `PASS`（构建能通过就说明 schema 接受了该字段——若字段未声明，Astro 会因未知键报错）

- [ ] **Step 6: 测试仍全绿**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/content.config.ts src/content/blog/deploy-on-cloudflare.md src/consts.ts
git commit -m "feat: schema 加 featured 字段，配置加运行起点与身份描述"
```

---

### Task 4: 首页数据逻辑（精选筛选、随机抽取、运行时长）

**Files:**
- Modify: `src/lib/posts-core.ts`（新增一个函数）
- Modify: `src/lib/posts-core.test.ts`（新增测试）
- Modify: `src/lib/posts.ts`（新增一个封装）
- Create: `src/lib/home.ts`
- Test: `src/lib/home.test.ts`

**Interfaces:**
- Consumes: Task 3 的 `featured` 字段；`posts-core.ts` 已有的 `PostLike` 类型
- Produces:
  - `posts-core.ts` 新增 `filterFeatured<T extends PostLike>(posts: T[]): T[]`
  - `posts.ts` 新增 `getFeaturedPosts(): Promise<Post[]>`（精选 + 日期倒序）
  - `home.ts` 导出 `uptimeSince(startISO: string, now: Date): { days: number; hours: number }`

**关于「随机抽取」为何不在这里：** spec 4.4 要求随机推荐**每次访问**都不同，这只能由客户端脚本完成（服务端渲染是构建期固定的）。而 `is:inline` 脚本无法 import 模块，所以洗牌逻辑必须内联在 `RandomPosts.astro` 里（Task 8）。若在此处再写一个 `pickRandom` 纯函数，它将没有任何生产调用方——只有测试用它，属于死代码。故本任务只做 `uptimeSince`。

**注意：** `PostLike` 的 `data` 目前没有 `featured`，需要把它加进类型定义，否则 `filterFeatured` 无法通过类型检查。

- [ ] **Step 1: 写失败的测试（posts-core）**

Modify `src/lib/posts-core.test.ts` — 在文件末尾追加：

```ts
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
```

同时把该文件顶部的 import 加上 `filterFeatured`，并给测试用的 `post()` 工厂补上 `featured` 默认值——把 `post()` 函数体内的 `data` 对象改为（新增 `featured: false` 一行）：

```ts
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
```

- [ ] **Step 2: 写失败的测试（home）**

Create `src/lib/home.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { uptimeSince } from './home';

describe('uptimeSince', () => {
  it('同一时刻为 0 天 0 小时', () => {
    expect(uptimeSince('2026-08-09', new Date('2026-08-09T00:00:00Z'))).toEqual({
      days: 0,
      hours: 0,
    });
  });

  it('按整天与余下小时拆分', () => {
    expect(uptimeSince('2026-08-09', new Date('2026-08-12T05:00:00Z'))).toEqual({
      days: 3,
      hours: 5,
    });
  });

  it('不足一天只有小时', () => {
    expect(uptimeSince('2026-08-09', new Date('2026-08-09T23:59:00Z'))).toEqual({
      days: 0,
      hours: 23,
    });
  });

  it('起点晚于当前时间时归零，不返回负数', () => {
    expect(uptimeSince('2026-08-20', new Date('2026-08-12T00:00:00Z'))).toEqual({
      days: 0,
      hours: 0,
    });
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./home"`，以及 posts-core.test.ts 报 `filterFeatured is not exported`

- [ ] **Step 4: 实现 filterFeatured 并给 PostLike 加字段**

Modify `src/lib/posts-core.ts`：

把 `PostLike` 的 `data` 定义中 `pinned: boolean;` 那一行之后加：

```ts
    featured: boolean;
```

在 `filterPublished` 函数之后加：

```ts
/** 只保留作者精选的文章 */
export function filterFeatured<T extends PostLike>(posts: T[]): T[] {
  return posts.filter((p) => p.data.featured);
}
```

- [ ] **Step 5: 实现 home.ts**

Create `src/lib/home.ts`:

```ts
// 首页专用的纯逻辑。不 import astro:content，可直接单测。
// 随机推荐的洗牌不在这里——它必须每次访问都变，只能由客户端脚本做，
// 而 is:inline 脚本无法 import 模块，故那段逻辑内联在 RandomPosts.astro 里。

/** 从建站日期算到 now 的运行时长。起点晚于 now 时归零。 */
export function uptimeSince(startISO: string, now: Date): { days: number; hours: number } {
  const ms = now.getTime() - new Date(startISO).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return { days: 0, hours: 0 };
  const totalHours = Math.floor(ms / 3_600_000);
  return { days: Math.floor(totalHours / 24), hours: totalHours % 24 };
}
```

- [ ] **Step 6: 加 getFeaturedPosts 封装**

Modify `src/lib/posts.ts`：

把顶部从 `./posts-core` 的 import 列表加上 `filterFeatured`，然后在 `getSortedPosts` 之后加：

```ts
/** 作者精选文章，按日期倒序 */
export async function getFeaturedPosts(): Promise<Post[]> {
  return filterFeatured(await getPublishedPosts());
}
```

- [ ] **Step 7: 运行测试确认通过**

Run: `npm test`
Expected: PASS — 新增 7 个测试（posts-core 的 `filterFeatured` 3 个 + home 的 `uptimeSince` 4 个）全绿

- [ ] **Step 8: 构建验证**

Run: `npm run build`
Expected: 成功，19 页

- [ ] **Step 9: Commit**

```bash
git add src/lib/posts-core.ts src/lib/posts-core.test.ts src/lib/posts.ts src/lib/home.ts src/lib/home.test.ts
git commit -m "feat: 首页数据逻辑（精选筛选、随机抽取、运行时长）"
```

---

### Task 5: 封面兜底改天空色系 + 分类水印

**Files:**
- Modify: `src/components/PostCard.astro`

**Interfaces:**
- Consumes: Task 2 的天空配色
- Produces: 无新接口（仅改视觉）

**注意此项全站生效**：兜底样式被 `/blog`、标签页、分类页共用，它们的无图卡片也会一并从琥珀变天蓝。这是必要的——留着琥珀兜底配天空主色会直接打架。

- [ ] **Step 1: 改色相区间并加水印字**

Modify `src/components/PostCard.astro`：

把 frontmatter 中的色相计算（第 13–16 行）替换为：

```ts
// 无封面时用标题算一个色相做渐变兜底。
// 刻意压在 190–215 的天蓝区间内，与主色同族，避免随机色相跟天空蓝打架。
const hash = [...title].reduce((acc, ch) => (acc * 31 + ch.codePointAt(0)!) % 997, 7);
const hue = 190 + (hash % 26);
// 兜底块上叠一个分类首字水印。用展开取字符，避免中文/emoji 被截断成半个码位。
const watermark = [...category][0] ?? '·';
```

把 `.cover-fallback` 那个 `<span>` 替换为（加上水印文字与数据属性）：

```astro
      <span class="cover-fallback" aria-hidden="true">{watermark}</span>
```

- [ ] **Step 2: 改兜底样式**

Modify `src/components/PostCard.astro` — 把 `.cover-fallback` 规则替换为：

```css
  /* 无封面兜底：天蓝区间渐变 + 网格纹理 + 分类首字水印 */
  .cover-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.6rem;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.5);
    user-select: none;
    background:
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.08) 0 2px, transparent 2px 12px),
      linear-gradient(
        135deg,
        hsl(var(--cover-hue) 85% 62%),
        hsl(calc(var(--cover-hue) + 14) 70% 42%)
      );
  }
```

- [ ] **Step 3: 构建验证**

Run: `npm run build`
Expected: 成功，19 页

- [ ] **Step 4: 断言兜底已改为天蓝并带水印**

Run:
```bash
node -e "
const fs=require('fs');
const h=fs.readFileSync('dist/index.html','utf8');
const body=h.slice(h.indexOf('</head>'));
const hues=[...body.matchAll(/--cover-hue:(\d+)/g)].map(m=>Number(m[1]));
if(!hues.length){console.error('FAIL: 未找到 --cover-hue');process.exit(1)}
const bad=hues.filter(x=>x<190||x>215);
if(bad.length){console.error('FAIL: 色相越界 '+bad.join(','));process.exit(1)}
console.log('色相:', hues.join(','), '(应全部落在 190-215)');
if(!body.includes('cover-fallback')){console.error('FAIL: 缺兜底块');process.exit(1)}
// 水印：分类首字应出现在兜底 span 内
if(!/<span class=\"cover-fallback\"[^>]*>./.test(body)){console.error('FAIL: 兜底块内无水印字');process.exit(1)}
console.log('PASS');
"
```
Expected: `PASS`，色相三个值都在 190–215 之间

- [ ] **Step 5: 测试仍全绿**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/PostCard.astro
git commit -m "feat: 封面兜底改天空色系并叠加分类水印"
```

---

### Task 6: PostCard 大卡变体，首页启用

**Files:**
- Modify: `src/components/PostCard.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: Task 5 的兜底样式
- Produces: `PostCard` 新增 prop `variant?: 'compact' | 'feature'`，默认 `'compact'`

- [ ] **Step 1: 加 variant prop**

Modify `src/components/PostCard.astro`：

把 `interface Props` 与解构替换为：

```ts
interface Props {
  post: Post;
  /** 列表中的序号，用于入场动画错峰 */
  index?: number;
  /** compact = 横向紧凑卡（列表页默认）；feature = 大封面纵向卡（首页） */
  variant?: 'compact' | 'feature';
}
const { post, index = 0, variant = 'compact' } = Astro.props;
```

把根元素的 class 改为带上变体：

```astro
<article class:list={['card', 'post-card', `is-${variant}`]} style={`--i:${index}; --cover-hue:${hue};`}>
```

- [ ] **Step 2: 加 feature 变体样式**

Modify `src/components/PostCard.astro` — 在 `<style>` 块内、`@media (max-width: 720px)` 之前插入：

```css
  /* ===== feature 变体：大封面纵向卡，仅首页使用 ===== */
  .post-card.is-feature {
    grid-template-columns: minmax(0, 1fr);
  }
  .is-feature .cover {
    /* 固定 16:9，避免不同封面图把卡片撑成不同高度 */
    aspect-ratio: 16 / 9;
    min-height: 0;
  }
  .is-feature .cover-fallback {
    font-size: 4rem;
  }
  .is-feature .body {
    padding: 22px 24px 24px;
  }
  .is-feature h3 {
    font-size: 1.42rem;
    /* 标题最多一行，超出省略 */
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .is-feature .desc {
    font-size: 0.97rem;
  }

  @media (max-width: 640px) {
    .is-feature h3 {
      font-size: 1.2rem;
    }
    .is-feature .body {
      padding: 18px;
    }
  }
```

- [ ] **Step 3: 首页启用大卡**

Modify `src/pages/index.astro` — 把 `<ul class="post-list">` 那一段替换为：

```astro
  <ul class="post-list is-feature-list">
    {posts.map((post, i) => (
      <li><PostCard post={post} index={i} variant="feature" /></li>
    ))}
  </ul>
```

并把页面底部 `<style>` 块替换为：

```astro
<style>
  /* 首页大卡之间留更大间距，配合更重的卡片体量 */
  .is-feature-list {
    gap: 24px;
  }
  .more {
    margin: 28px 0 0;
  }
</style>
```

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 成功，19 页

- [ ] **Step 5: 断言变体只作用于首页**

Run:
```bash
node -e "
const fs=require('fs');
const body=p=>{const h=fs.readFileSync(p,'utf8');return h.slice(h.indexOf('</head>'))};
const home=body('dist/index.html');
const feat=(home.match(/is-feature/g)||[]).length;
if(feat<3){console.error('FAIL: 首页 feature 卡不足，实际 '+feat);process.exit(1)}
for(const p of ['dist/blog/index.html','dist/tags/随笔/index.html','dist/categories/教程/index.html']){
  const b=body(p);
  if(b.includes('is-feature')){console.error('FAIL: '+p+' 不应出现 feature 变体');process.exit(1)}
  if(!b.includes('is-compact')){console.error('FAIL: '+p+' 应为 compact 变体');process.exit(1)}
}
console.log('PASS: 大卡仅首页，列表页仍为紧凑卡');
"
```
Expected: `PASS`

- [ ] **Step 6: 测试仍全绿**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/PostCard.astro src/pages/index.astro
git commit -m "feat: PostCard 新增大封面 feature 变体，首页启用"
```

---

### Task 7: 运行时间条与作者卡升级

**Files:**
- Create: `src/components/UptimeBar.astro`
- Modify: `src/components/widgets/ProfileCard.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: Task 3 的 `SITE_START`、`AUTHOR_ROLE`、可选社交字段；Task 4 的 `uptimeSince`
- Produces: `<UptimeBar />`（无 props）

- [ ] **Step 1: 写运行时间条**

Create `src/components/UptimeBar.astro`:

```astro
---
import { SITE_START } from '../consts';
import { uptimeSince } from '../lib/home';

// 服务端先算一个初始值，避免首屏空白；客户端每分钟刷新
const initial = uptimeSince(SITE_START, new Date());
---

<p class="uptime glass" data-start={SITE_START}>
  <span class="dot" aria-hidden="true"></span>
  本站已运行
  <strong data-uptime-days>{initial.days}</strong> 天
  <strong data-uptime-hours>{initial.hours}</strong> 小时
</p>

<style>
  .uptime {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 0 0 24px;
    padding: 10px 16px;
    border-radius: 999px;
    border: 1px solid var(--glass-border);
    color: var(--text-soft);
    font-size: 0.88rem;
  }
  .uptime strong {
    color: var(--link);
    font-variant-numeric: tabular-nums;
  }
  /* 呼吸小圆点，提示这是实时数字 */
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--brand);
    box-shadow: 0 0 0 3px var(--brand-soft);
  }
</style>

<script is:inline>
  (function () {
    const el = document.querySelector('[data-start]');
    if (!el) return;
    const start = new Date(el.dataset.start).getTime();
    const dEl = el.querySelector('[data-uptime-days]');
    const hEl = el.querySelector('[data-uptime-hours]');
    function tick() {
      const ms = Date.now() - start;
      if (!isFinite(ms) || ms <= 0) return;
      const totalHours = Math.floor(ms / 3600000);
      dEl.textContent = String(Math.floor(totalHours / 24));
      hEl.textContent = String(totalHours % 24);
    }
    tick();
    setInterval(tick, 60000);
  })();
</script>
```

- [ ] **Step 2: 首页插入运行时间条**

Modify `src/pages/index.astro`：

在 import 区加一行（放在 `import PostCard` 之后）：

```astro
import UptimeBar from '../components/UptimeBar.astro';
```

把 `<Hero slot="hero" />` 之后、`<p class="section-title">` 之前插入：

```astro
  <UptimeBar />
```

- [ ] **Step 3: 作者卡加身份行与更多社交**

Modify `src/components/widgets/ProfileCard.astro` — 整个文件替换为：

```astro
---
import { AUTHOR, AUTHOR_ROLE, SITE_DESCRIPTION, AVATAR, SOCIAL } from '../../consts';

// 只渲染填了值的社交链接，留空自动隐藏
const links = [
  { key: 'github', label: 'GitHub', href: SOCIAL.github },
  { key: 'gitee', label: 'Gitee', href: SOCIAL.gitee },
  { key: 'juejin', label: '掘金', href: SOCIAL.juejin },
  { key: 'csdn', label: 'CSDN', href: SOCIAL.csdn },
  { key: 'email', label: 'Email', href: SOCIAL.email ? `mailto:${SOCIAL.email}` : '' },
  { key: 'rss', label: 'RSS', href: SOCIAL.rss },
].filter((l) => l.href);
---

<div class="card widget widget-profile">
  <img class="avatar" src={AVATAR} alt="头像" width="72" height="72" loading="lazy" />
  <p class="name">{AUTHOR}</p>
  <p class="role">{AUTHOR_ROLE}</p>
  <p class="bio">{SITE_DESCRIPTION}</p>
  <div class="links">
    {links.map((l) => (
      <a href={l.href} target={l.key === 'email' ? undefined : '_blank'} rel="noopener">
        {l.label}
      </a>
    ))}
  </div>
</div>

<style>
  .widget-profile {
    padding: 24px 20px;
    text-align: center;
  }
  .avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    border: 2px solid var(--brand);
  }
  .name {
    margin: 12px 0 2px;
    font-weight: 700;
    font-size: 1.05rem;
  }
  .role {
    margin: 0 0 8px;
    color: var(--link);
    font-size: 0.82rem;
  }
  .bio {
    margin: 0 0 16px;
    color: var(--text-soft);
    font-size: 0.88rem;
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px 14px;
    font-size: 0.85rem;
  }
</style>
```

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 成功，19 页

- [ ] **Step 5: 断言运行时间条与身份行**

Run:
```bash
node -e "
const fs=require('fs');
const h=fs.readFileSync('dist/index.html','utf8');
const body=h.slice(h.indexOf('</head>'));
if(!body.includes('本站已运行')){console.error('FAIL: 缺运行时间条');process.exit(1)}
if(!body.includes('data-uptime-days')){console.error('FAIL: 缺天数占位');process.exit(1)}
const m=/data-start=\"([^\"]+)\"/.exec(body);
if(!m){console.error('FAIL: 缺 data-start');process.exit(1)}
console.log('建站起点:', m[1]);
// 服务端渲染的初始天数必须是数字且非负
const d=/data-uptime-days>(\d+)</.exec(body);
if(!d){console.error('FAIL: 天数未服务端渲染');process.exit(1)}
console.log('服务端初始天数:', d[1]);
if(!body.includes('前端开发')){console.error('FAIL: 作者卡缺身份行');process.exit(1)}
// 未填的社交字段不应产生空链接
if(/href=\"\"/.test(body)){console.error('FAIL: 存在空 href');process.exit(1)}
console.log('PASS');
"
```
Expected: `PASS`，打印出建站起点与初始天数

- [ ] **Step 6: 测试仍全绿**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/UptimeBar.astro src/components/widgets/ProfileCard.astro src/pages/index.astro
git commit -m "feat: 运行时间条与作者卡身份行、可选社交链接"
```

---

### Task 8: 侧栏随机推荐与作者精选

**Files:**
- Create: `src/components/widgets/RandomPosts.astro`
- Create: `src/components/widgets/FeaturedPosts.astro`
- Modify: `src/components/Sidebar.astro`

**Interfaces:**
- Consumes: Task 4 的 `getFeaturedPosts()`；`getPublishedPosts()`；`pickRandom`
- Produces: 两个 widget；外层 class 分别为 `widget-random`、`widget-featured`

**布局契约：** `src/styles/layout.css` 的 960px 断点用 `display: contents` + `order` 重排侧栏，选择器是 `.sidebar > .widget-profile`（`order: -1`）与 `.sidebar > .widget-category, .sidebar > .widget-tags`（`order: 1`）。新 widget 未被这些选择器覆盖，`order` 默认为 `0`，因此在移动端会落在内容区**之后**、分类/标签**之前**。这是可接受的顺序，无需改 `layout.css`。

- [ ] **Step 1: 写随机推荐 widget**

Create `src/components/widgets/RandomPosts.astro`:

```astro
---
import { getPublishedPosts } from '../../lib/posts';

// 服务端渲染全部候选，客户端加载时随机抽至多 3 条。
// 这样每次访问都不同，而不是每次部署才变一次。
const posts = await getPublishedPosts();
---

{posts.length > 0 && (
  <div class="card widget widget-random">
    <p class="widget-title">随机推荐</p>
    <ul data-random-pool>
      {posts.map((post) => (
        <li hidden>
          <a href={`/blog/${post.id}/`}>{post.data.title}</a>
        </li>
      ))}
    </ul>
  </div>
)}

<style>
  .widget-random {
    padding: 20px;
  }
  .widget-title {
    margin: 0 0 12px;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--text-soft);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  li a {
    display: block;
    padding: 7px 10px;
    border-radius: 8px;
    color: var(--text);
    font-size: 0.9rem;
    line-height: 1.5;
    transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
  }
  li a:hover {
    background: var(--brand-soft);
    color: var(--link);
    text-decoration: none;
  }
</style>

<script is:inline>
  (function () {
    const ul = document.querySelector('[data-random-pool]');
    if (!ul) return;
    const items = [...ul.children];
    // Fisher-Yates 洗牌后显示前 3 条，其余保持 hidden
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    items.slice(0, 3).forEach((li) => {
      li.hidden = false;
      ul.appendChild(li);
    });
  })();
</script>
```

- [ ] **Step 2: 写作者精选 widget**

Create `src/components/widgets/FeaturedPosts.astro`:

```astro
---
import { getFeaturedPosts } from '../../lib/posts';

const posts = await getFeaturedPosts();
---

{posts.length > 0 && (
  <div class="card widget widget-featured">
    <p class="widget-title">作者精选</p>
    <ol>
      {posts.map((post) => (
        <li>
          <a href={`/blog/${post.id}/`}>{post.data.title}</a>
        </li>
      ))}
    </ol>
  </div>
)}

<style>
  .widget-featured {
    padding: 20px;
  }
  .widget-title {
    margin: 0 0 12px;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--text-soft);
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    counter-reset: pick;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  li {
    counter-increment: pick;
  }
  li a {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 8px;
    color: var(--text);
    font-size: 0.9rem;
    line-height: 1.5;
    transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
  }
  /* 序号用 counter 生成，不写死在 HTML 里 */
  li a::before {
    content: counter(pick);
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 6px;
    background: var(--brand-soft);
    color: var(--link);
    font-size: 0.72rem;
    font-weight: 700;
    text-align: center;
    line-height: 18px;
  }
  li a:hover {
    background: var(--brand-soft);
    color: var(--link);
    text-decoration: none;
  }
</style>
```

- [ ] **Step 3: 接入侧栏**

Modify `src/components/Sidebar.astro` — 整个文件替换为：

```astro
---
import ProfileCard from './widgets/ProfileCard.astro';
import CategoryList from './widgets/CategoryList.astro';
import TagCloud from './widgets/TagCloud.astro';
import FeaturedPosts from './widgets/FeaturedPosts.astro';
import RandomPosts from './widgets/RandomPosts.astro';
---

<aside class="sidebar">
  <ProfileCard />
  <CategoryList />
  <TagCloud />
  <FeaturedPosts />
  <RandomPosts />
</aside>
```

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 成功，19 页

- [ ] **Step 5: 断言两个 widget**

Run:
```bash
node -e "
const fs=require('fs');
const h=fs.readFileSync('dist/index.html','utf8');
const body=h.slice(h.indexOf('</head>'));
if(!body.includes('随机推荐')){console.error('FAIL: 缺随机推荐');process.exit(1)}
if(!body.includes('作者精选')){console.error('FAIL: 缺作者精选');process.exit(1)}
// 随机池应包含全部 3 篇且默认 hidden
const pool=/data-random-pool[^>]*>([\s\S]*?)<\/ul>/.exec(body);
if(!pool){console.error('FAIL: 缺随机池');process.exit(1)}
const lis=(pool[1].match(/<li hidden>/g)||[]).length;
if(lis!==3){console.error('FAIL: 随机池应有 3 个 hidden li，实际 '+lis);process.exit(1)}
// 精选只有一篇（deploy-on-cloudflare 被标记）
const feat=/widget-featured[\s\S]*?<\/ol>/.exec(body);
if(!feat){console.error('FAIL: 缺精选列表');process.exit(1)}
const fl=(feat[0].match(/<li>/g)||[]).length;
if(fl!==1){console.error('FAIL: 精选应有 1 篇，实际 '+fl);process.exit(1)}
if(!feat[0].includes('把博客部署到 Cloudflare Pages')){console.error('FAIL: 精选文章不对');process.exit(1)}
console.log('PASS: 随机池 3 篇（默认隐藏），精选 1 篇且为标记的那篇');
"
```
Expected: `PASS`

- [ ] **Step 6: 测试仍全绿**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/widgets/RandomPosts.astro src/components/widgets/FeaturedPosts.astro src/components/Sidebar.astro
git commit -m "feat: 侧栏新增随机推荐与作者精选 widget"
```

---

### Task 9: 磨砂玻璃、渐变与过渡手法落地

**Files:**
- Modify: `src/styles/base.css`
- Modify: `src/components/PostCard.astro`
- Modify: `src/components/Hero.astro`

**Interfaces:**
- Consumes: Task 2 的 `--glass-bg`、`--glass-border`、`--blur`、`--shadow-glass`、`--ease`、`--dur`
- Produces: `.glass` 工具类（含 `@supports` 回退）

- [ ] **Step 1: 加 .glass 工具类与回退**

Modify `src/styles/base.css` — 在 `.card` 规则之后插入：

```css
/* 磨砂玻璃。用在首页大卡与运行时间条上。
   backdrop-filter 不被支持时回退为实色 --card，否则半透明底会让文字读不清。 */
.glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: blur(var(--blur));
  backdrop-filter: blur(var(--blur));
  box-shadow: var(--shadow-glass);
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass {
    background: var(--card);
    border-color: var(--border);
  }
}
```

- [ ] **Step 2: 首页大卡改用磨砂 + 统一过渡曲线**

Modify `src/components/PostCard.astro` — 把 `.post-card` 与 `.post-card:hover` 两条规则替换为：

```css
  .post-card {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr);
    overflow: hidden;
    transition: transform var(--dur) var(--ease), border-color var(--dur) var(--ease),
      box-shadow var(--dur) var(--ease);
  }
  .post-card:hover {
    transform: translateY(-2px);
    border-color: var(--brand);
    box-shadow: var(--shadow-lift);
  }
  /* 大卡用磨砂质感与更重的悬浮阴影 */
  .is-feature {
    background: var(--glass-bg);
    border-color: var(--glass-border);
    -webkit-backdrop-filter: blur(var(--blur));
    backdrop-filter: blur(var(--blur));
  }
  .is-feature:hover {
    box-shadow: var(--shadow-glass);
  }
```

并在 `<style>` 块末尾（`@media (max-width: 640px)` 之后）追加回退：

```css
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .is-feature {
      background: var(--card);
      border-color: var(--border);
    }
  }
```

- [ ] **Step 3: Hero 换成天空渐变**

Modify `src/components/Hero.astro` — 把 `.hero` 规则中的 `background` 声明替换为：

```css
    background:
      radial-gradient(120% 130% at 12% 18%, rgba(255, 255, 255, 0.42), transparent 60%),
      linear-gradient(160deg, var(--brand) 0%, var(--brand-strong) 100%);
```

并把 `.hero-social a` 与 `.hero-social a:hover` 的 `transition` 改为统一曲线：

```css
  .hero-social a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(11, 27, 43, 0.08);
    color: var(--brand-ink);
    transition: background var(--dur) var(--ease), transform var(--dur) var(--ease);
  }
  .hero-social a:hover {
    background: rgba(11, 27, 43, 0.16);
    transform: translateY(-2px);
  }
```

- [ ] **Step 4: 运行时间条挂上 .glass**

`UptimeBar.astro` 的根元素在 Task 7 已带 `class="uptime glass"`，`.glass` 现在有了定义，无需再改。确认该文件根元素确实是 `<p class="uptime glass" ...>`，若不是则改成这样。

- [ ] **Step 5: 构建验证**

Run: `npm run build`
Expected: 成功，19 页

- [ ] **Step 6: 断言磨砂与回退都在产物里**

Run:
```bash
node -e "
const fs=require('fs');
const dir='dist/_astro';
let css=fs.readdirSync(dir).filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(dir+'/'+f,'utf8')).join('');
// 内联样式也要一并搜，Astro 可能把小样式内联进 HTML
for (const f of fs.readdirSync('dist')) if (f.endsWith('.html')) css += fs.readFileSync('dist/'+f,'utf8');
const flat=css.replace(/\s/g,'');
if(!flat.includes('backdrop-filter:blur')){console.error('FAIL: 缺 backdrop-filter');process.exit(1)}
if(!flat.includes('@supportsnot')){console.error('FAIL: 缺 @supports 回退');process.exit(1)}
if(!flat.includes('cubic-bezier')){console.error('FAIL: 缺统一过渡曲线');process.exit(1)}
console.log('PASS: 磨砂、回退与过渡曲线齐全');
"
```
Expected: `PASS`

- [ ] **Step 7: 测试仍全绿（含磨砂对比度断言）**

Run: `npm test`
Expected: PASS —— Task 1 的「磨砂卡片上的正文仍满足对比度」断言此时才真正有意义，确认它通过

- [ ] **Step 8: Commit**

```bash
git add src/styles/base.css src/components/PostCard.astro src/components/Hero.astro
git commit -m "feat: 磨砂玻璃质感、天空渐变与统一过渡曲线"
```

---

### Task 10: 整体验收

**Files:** 无（仅验证）

- [ ] **Step 1: 全量构建与测试**

Run: `npm run build && npm test`
Expected: 19 页零报错；测试全绿

- [ ] **Step 2: 路由与 h1 结构未回退**

Run:
```bash
node -e "
const fs=require('fs'),path=require('path');
const must=['dist/index.html','dist/blog/index.html','dist/tags/index.html','dist/categories/index.html',
  'dist/archive/index.html','dist/guestbook/index.html','dist/about/index.html','dist/404.html',
  'dist/search.json','dist/rss.xml','dist/sitemap-index.xml','dist/tags/部署/index.html','dist/categories/教程/index.html'];
const miss=must.filter(p=>!fs.existsSync(p));
if(miss.length){console.error('FAIL 缺产物:\n'+miss.join('\n'));process.exit(1)}
let bad=0,n=0;
(function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);
  if(fs.statSync(p).isDirectory())walk(p);
  else if(f.endsWith('.html')){const h=fs.readFileSync(p,'utf8');const b=h.slice(h.indexOf('</head>'));
    const c=(b.match(/<h1[ >]/g)||[]).length;n++;if(c!==1){console.error('  x',p,'h1='+c);bad++}}}})('dist');
console.log('产物齐全; 检查'+n+'页, h1 异常 '+bad);
if(bad)process.exit(1);
console.log('PASS');
"
```
Expected: `PASS`

- [ ] **Step 3: 金黄色值全站无残留**

Run:
```bash
node -e "
const fs=require('fs'),path=require('path');
const old=['#fcd635','#f0a92e','#8a6100','#faf9f5','#e8e4db','#6b6459','#14120e','#1c1913','#1a1712','#2b261d','#eae4d9','#a8a096'];
const hits=[];
(function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f).replace(/\\/g,'/');
  if(fs.statSync(p).isDirectory()){if(!/node_modules|\.git|dist|\.astro/.test(p))walk(p)}
  else if(/\.(astro|css|ts)$/.test(p)){const s=fs.readFileSync(p,'utf8');
    for(const o of old) if(s.includes(o)) hits.push(p+' -> '+o);}}})('src');
if(hits.length){console.error('FAIL 源码仍残留旧配色:\n'+hits.join('\n'));process.exit(1)}
console.log('PASS: src 下无金黄残留');
"
```
Expected: `PASS`

（注意：`src/lib/contrast.test.ts` 里出现的 `#38bdf8` 等是天空色，属正常；旧色清单里不含它们。若此断言因 `contrast.test.ts` 中的历史金黄测试值失败，把那些测试值一并改为天空色。）

- [ ] **Step 4: 浏览器实测**

启动预览（本环境浏览器面板不合成帧，故读计算样式而非截图）：

```bash
npm run preview
```

在浏览器工具里逐项确认并记录实测值：

- [ ] 亮/暗两套：直接读 `getComputedStyle(document.documentElement)` 的令牌值，用 `contrastRatio` 复算，全部 ≥ 4.5:1
- [ ] 首页大卡 `aspect-ratio` 计算值为 `16 / 9`，标题 `-webkit-line-clamp` 为 `1`、摘要为 `2`
- [ ] `.is-feature` 的 `backdrop-filter` 计算值包含 `blur(14px)`
- [ ] 运行时间条数字非零且随时间变化（改系统时间不便时，确认 `setInterval` 已注册即可）
- [ ] 刷新三次首页，随机推荐显示的三条顺序/内容有变化
- [ ] 作者精选列出「把博客部署到 Cloudflare Pages」，序号 1 由 CSS counter 渲染
- [ ] 1280 / 900 / 375px 三档无横向溢出；900px 下侧栏 `display: contents` 重排仍生效（头像卡在内容之上）
- [ ] 搜索 ⌘K 仍可用，TOC 仍显示，评论区仍在

- [ ] **Step 5: Commit（若上述发现需修补则一并提交）**

若全部通过且无改动，跳过提交。若有修补：

```bash
git add -A
git commit -m "fix: 天空配色改造验收修补"
```

---

## Self-Review

**1. Spec 覆盖核对**

| Spec 章节 | 落在 |
|---|---|
| 1 天空配色（含实测对比度表） | Task 2（值）、Task 1（护栏） |
| 2 令牌测试改为断言不变量 | Task 1 |
| 3 视觉手法（磨砂/渐变/阴影/过渡） | Task 2（令牌）、Task 9（落地） |
| 4.1 运行时间条 | Task 3（`SITE_START`）、Task 4（`uptimeSince`）、Task 7 |
| 4.2 作者卡升级 | Task 3（`AUTHOR_ROLE`/可选社交）、Task 7 |
| 4.3 封面图大卡片 | Task 6 |
| 4.4 侧栏随机推荐 + 作者精选 | Task 4（逻辑）、Task 8（组件） |
| 4.5 封面兜底升级 | Task 5 |
| 5 schema 加 `featured` | Task 3 |
| 6 不改动的部分 + 纯逻辑进 `src/lib/` | Task 4（`home.ts`、`posts-core` 扩展） |
| 7 验收 | Task 10 |

无遗漏。Spec 未点明但必需的两处已补：`PostLike` 类型需加 `featured`（Task 4 Step 4），以及 `posts-core.test.ts` 的 `post()` 工厂需补 `featured` 默认值（Task 4 Step 1）——不补会导致类型错误与测试构造失败。

**2. 占位符扫描**

无 TBD/TODO。Task 1 Step 6 临时加的 `--glass-bg` 是**有意**的，并注明 Task 2 会重写其值——目的是让 Task 1 的磨砂断言在自身任务内就可运行，而不是留一个到 Task 2 才能验证的悬空测试。

**3. 类型与命名一致性**

- `Rgba`、`parseColor`、`composite`、`relativeLuminance`、`contrastRatio` 在 Task 1 定义，Task 1 Step 5 的 `tokens.test.ts` 与 Task 10 Step 4 使用，名称一致
- `filterFeatured` 在 Task 4 Step 4 定义（`posts-core.ts`），Task 4 Step 1 测试、Task 4 Step 6 被 `posts.ts` 引用
- `getFeaturedPosts` 在 Task 4 Step 6 定义，Task 8 Step 2 的 `FeaturedPosts.astro` 调用
- `uptimeSince` 在 Task 4 Step 5 定义，由 Task 7 的 `UptimeBar.astro` 调用
- `variant?: 'compact' | 'feature'` 在 Task 6 Step 1 定义，Task 6 Step 3 首页传入；`is-compact` / `is-feature` class 由 Task 6 Step 1 的 `class:list` 生成，Task 6 Step 5 与 Task 9 Step 2 依赖这两个类名
- `--glass-bg`/`--glass-border`/`--blur`/`--shadow-glass`/`--ease`/`--dur` 在 Task 2 定义，Task 7、8、9 消费
- `widget-random` / `widget-featured` 在 Task 8 定义；已在该任务的「布局契约」中说明它们不被 960px 断点的 `order` 选择器覆盖，故移动端顺序为默认的 0

**4. 已知取舍（供评审知情）**

- 随机推荐的洗牌逻辑内联在 `RandomPosts.astro` 的 `is:inline` 脚本里，没有对应的纯函数单测。这是 spec 4.4「每次访问都不同」的必然结果：服务端渲染是构建期固定的，而 `is:inline` 脚本无法 import 模块。曾考虑再写一个 `pickRandom` 纯函数供测试，但它不会有任何生产调用方——那是带测试的死代码，故不写。
- Task 1 Step 6 让 `tokens.css` 在 Task 1 与 Task 2 各改一次。代价是一次额外改动，收益是护栏与被守护的值分属两个可独立评审的提交。
