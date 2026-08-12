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

  // 这条守着 Number.isFinite 判空：无法解析的日期会让 getTime() 返回 NaN，
  // 而 NaN <= 0 为 false——若日后有人把守卫简化成只判 <= 0，NaN 就会漏过去，
  // 页面上会显示「已运行 NaN 天」。
  it('起点无法解析时归零，不返回 NaN', () => {
    expect(uptimeSince('not-a-date', new Date('2026-08-12T00:00:00Z'))).toEqual({
      days: 0,
      hours: 0,
    });
  });
});
