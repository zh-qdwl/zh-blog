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
