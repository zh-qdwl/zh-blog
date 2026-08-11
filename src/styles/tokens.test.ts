import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// 使用 import.meta.dirname 定位测试文件所在目录
const __dirname = import.meta.dirname;

describe('配色令牌断言', () => {
  it('亮色模式所有令牌值正确', () => {
    const tokensPath = join(__dirname, 'tokens.css');
    const content = readFileSync(tokensPath, 'utf-8');

    // 提取亮色块 :root { ... }
    const lightMatch = content.match(/:root\s*\{([^}]+)\}/);
    expect(lightMatch, '应能找到 :root 块').toBeDefined();
    const lightBlock = lightMatch![1];

    // 亮色模式的令牌期望值
    const lightTokens: Array<[string, string]> = [
      ['--brand', '#fcd635'],
      ['--brand-strong', '#f0a92e'],
      ['--brand-ink', '#111827'],
      ['--link', '#8a6100'],
      ['--bg', '#ffffff'],
      ['--bg-soft', '#faf9f5'],
      ['--card', '#ffffff'],
      ['--border', '#e8e4db'],
      ['--text', '#1f2328'],
      ['--text-soft', '#6b6459'],
      ['--code-bg', '#f6f8fa'],
      ['--radius', '12px'],
      ['--radius-card', '16px'],
      ['--maxw-page', '1200px'],
      ['--maxw-prose', '720px'],
      ['--sidebar-w', '260px'],
      ['--toc-w', '240px'],
    ];

    lightTokens.forEach(([token, expectedValue]) => {
      // 构造正则来匹配 --token: value;（允许空白）
      const regex = new RegExp(`${token}\\s*:\\s*${expectedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*;`);
      expect(
        lightBlock,
        `亮色模式: ${token} 应该等于 ${expectedValue}`
      ).toMatch(regex);
    });
  });

  it('暗色模式所有令牌值正确', () => {
    const tokensPath = join(__dirname, 'tokens.css');
    const content = readFileSync(tokensPath, 'utf-8');

    // 提取暗色块 :root[data-theme='dark'] { ... }
    const darkMatch = content.match(/:root\[data-theme='dark'\]\s*\{([^}]+)\}/);
    expect(darkMatch, '应能找到 :root[data-theme=\'dark\'] 块').toBeDefined();
    const darkBlock = darkMatch![1];

    // 暗色模式的令牌期望值
    const darkTokens: Array<[string, string]> = [
      ['--link', '#fcd635'],
      ['--bg', '#14120e'],
      ['--bg-soft', '#1c1913'],
      ['--card', '#1a1712'],
      ['--border', '#2b261d'],
      ['--text', '#eae4d9'],
      ['--text-soft', '#a8a096'],
      ['--code-bg', '#1c1913'],
    ];

    darkTokens.forEach(([token, expectedValue]) => {
      // 构造正则来匹配 --token: value;（允许空白）
      const regex = new RegExp(`${token}\\s*:\\s*${expectedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*;`);
      expect(
        darkBlock,
        `暗色模式: ${token} 应该等于 ${expectedValue}`
      ).toMatch(regex);
    });
  });

  it('--brand 不能用作 color: 属性值', () => {
    const basePath = join(__dirname, 'base.css');
    const content = readFileSync(basePath, 'utf-8');

    // 匹配 color: var(--brand) 的严格模式
    // 允许 var(--brand-ink), var(--brand-strong), var(--brand-soft)
    // 但禁止 color: var(--brand)，不包括 border-color 等复合属性
    const invalidPattern = /(?<![a-z-])color\s*:\s*var\(--brand\)/;

    expect(
      content,
      'base.css 中不应该有 color: var(--brand) 声明（会导致低对比度）'
    ).not.toMatch(invalidPattern);
  });
});
