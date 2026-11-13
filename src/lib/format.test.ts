import { describe, it, expect } from 'vitest';
import { monthDayUTC, estimateReadMinutes } from './format';

describe('monthDayUTC', () => {
  it('用 UTC 分量补零，不受本地时区影响', () => {
    // 2026-01-01T00:00:00Z 在 UTC-5 会是 2025-12-31 本地时间
    const d = new Date('2026-01-01T00:00:00Z');
    expect(monthDayUTC(d)).toBe('01-01');
  });

  it('月日均需两位补零', () => {
    expect(monthDayUTC(new Date('2026-03-05T12:00:00Z'))).toBe('03-05');
    expect(monthDayUTC(new Date('2026-12-31T12:00:00Z'))).toBe('12-31');
  });
});

describe('estimateReadMinutes', () => {
  it('空内容至少 1 分钟', () => {
    expect(estimateReadMinutes('')).toBe(1);
  });

  it('短文本至少 1 分钟', () => {
    expect(estimateReadMinutes('你好')).toBe(1);
  });

  it('中文按 300 字/分钟', () => {
    const cjk = String.fromCodePoint(0x6d4b); // 测
    const text = cjk.repeat(600);
    expect(estimateReadMinutes(text)).toBe(2);
  });

  it('代码块不计入', () => {
    const fence = String.fromCharCode(96).repeat(3); // ```
    const withCode = '前言\n\n' + fence + 'js\n' + 'const a = 1;\n'.repeat(200) + fence + '\n\n后记';
    // 去掉代码块后只剩十几个字 → 1 分钟
    expect(estimateReadMinutes(withCode)).toBe(1);
  });
});
