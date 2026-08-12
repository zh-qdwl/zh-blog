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
