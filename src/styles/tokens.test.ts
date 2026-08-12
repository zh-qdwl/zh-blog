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
