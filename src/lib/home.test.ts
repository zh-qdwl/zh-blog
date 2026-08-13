import { describe, it, expect } from 'vitest';
import { uptimeSince, formatUptime } from './home';

const ZERO = { days: 0, hours: 0, minutes: 0, seconds: 0 };

describe('uptimeSince', () => {
  it('同一时刻全部为 0', () => {
    expect(uptimeSince('2026-08-09', new Date('2026-08-09T00:00:00Z'))).toEqual(ZERO);
  });

  it('拆成天/时/分/秒', () => {
    expect(uptimeSince('2026-08-09', new Date('2026-08-12T05:07:09Z'))).toEqual({
      days: 3,
      hours: 5,
      minutes: 7,
      seconds: 9,
    });
  });

  it('不足一天只有时分秒', () => {
    expect(uptimeSince('2026-08-09', new Date('2026-08-09T23:59:59Z'))).toEqual({
      days: 0,
      hours: 23,
      minutes: 59,
      seconds: 59,
    });
  });

  // 各级都是对总秒数取模，所以进位边界要单独守一条：
  // 若有人改成逐级相减，很容易在整点/整分上算出 60 或负数。
  it('整点进位时分秒归零而不是 60', () => {
    expect(uptimeSince('2026-08-09', new Date('2026-08-10T00:00:00Z'))).toEqual({
      days: 1,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it('毫秒被截断而不是四舍五入', () => {
    // 0.999 秒仍算 0 秒——否则页面会短暂显示比真实值大 1 秒的数字
    expect(uptimeSince('2026-08-09', new Date('2026-08-09T00:00:00.999Z')).seconds).toBe(0);
  });

  it('起点晚于当前时间时归零，不返回负数', () => {
    expect(uptimeSince('2026-08-20', new Date('2026-08-12T00:00:00Z'))).toEqual(ZERO);
  });

  // 这条守着 Number.isFinite 判空：无法解析的日期会让 getTime() 返回 NaN，
  // 而 NaN <= 0 为 false——若日后有人把守卫简化成只判 <= 0，NaN 就会漏过去，
  // 页面上会显示「已运行 NaN 天」。
  it('起点无法解析时归零，不返回 NaN', () => {
    expect(uptimeSince('not-a-date', new Date('2026-08-12T00:00:00Z'))).toEqual(ZERO);
  });
});

describe('formatUptime', () => {
  it('时分秒补两位，天数不补', () => {
    // 补零是为了让每秒跳动时宽度恒定，否则 9→10 会让整条胶囊抽动一下
    expect(formatUptime('2026-08-09', new Date('2026-08-12T05:07:09Z'))).toEqual({
      days: '3',
      hours: '05',
      minutes: '07',
      seconds: '09',
    });
  });

  it('两位数不会被补成三位', () => {
    expect(formatUptime('2026-08-09', new Date('2026-08-12T23:45:59Z'))).toEqual({
      days: '3',
      hours: '23',
      minutes: '45',
      seconds: '59',
    });
  });

  it('天数超过两位也照常输出', () => {
    expect(formatUptime('2026-01-01', new Date('2027-01-01T00:00:00Z')).days).toBe('365');
  });
});
