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
