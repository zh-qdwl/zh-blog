import { describe, it, expect } from 'vitest';
import { stripMarkdown, excerpt } from './markdown';

describe('stripMarkdown', () => {
  it('剥离 frontmatter', () => {
    expect(stripMarkdown('---\ntitle: A\n---\n正文')).toBe('正文');
  });

  it('剥离围栏代码块', () => {
    expect(stripMarkdown('前\n```js\nconst a = 1;\n```\n后')).toBe('前 后');
  });

  it('剥离行内代码但保留文字', () => {
    expect(stripMarkdown('运行 `npm run build` 命令')).toBe('运行 命令');
  });

  it('链接保留文字，图片整体移除', () => {
    expect(stripMarkdown('看 [Astro](https://astro.build) 官网')).toBe('看 Astro 官网');
    expect(stripMarkdown('图：![截图](/a.png) 结束')).toBe('图： 结束');
  });

  it('剥离标题、引用与列表符号', () => {
    expect(stripMarkdown('## 第一步\n> 提示\n- 甲\n1. 乙')).toBe('第一步 提示 甲 乙');
  });

  it('剥离强调符号', () => {
    expect(stripMarkdown('**很重要**的事')).toBe('很重要的事');
  });

  it('压缩连续空白', () => {
    expect(stripMarkdown('甲\n\n\n乙   丙')).toBe('甲 乙 丙');
  });
});

describe('excerpt', () => {
  it('短文本原样返回', () => {
    expect(excerpt('短', 10)).toBe('短');
  });

  it('超长按 max 截断', () => {
    expect(excerpt('一二三四五', 3)).toBe('一二三');
  });

  it('默认上限 500', () => {
    expect(excerpt('字'.repeat(600))).toHaveLength(500);
  });
});
