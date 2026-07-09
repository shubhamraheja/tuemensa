import { getOpenStatus, isAvailableToday, manualBerlinNow, BerlinNow } from '../lib/hours';
import { OpeningHours } from '../types';

const at = (dayIndex: number, hour: number, minute = 0): BerlinNow => ({
  weekMinutes: dayIndex * 1440 + hour * 60 + minute,
  dayIndex,
});

const WURST: OpeningHours[] = [
  { day: 'Mon', open: '11:30', close: '15:00' },
  { day: 'Mon', open: '17:30', close: '22:00' },
  { day: 'Sat', open: '11:30', close: '22:00' },
];

describe('getOpenStatus', () => {
  it('returns unknown without hours', () => {
    expect(getOpenStatus(undefined).state).toBe('unknown');
    expect(getOpenStatus([]).state).toBe('unknown');
  });

  it('detects open with closing time', () => {
    expect(getOpenStatus(WURST, at(0, 12))).toEqual({ state: 'open', detail: 'until 15:00' });
  });

  it('detects gap between lunch and dinner', () => {
    expect(getOpenStatus(WURST, at(0, 16))).toEqual({ state: 'closed', detail: 'opens 17:30' });
  });

  it('names the day when next opening is not today', () => {
    expect(getOpenStatus(WURST, at(2, 12))).toEqual({
      state: 'closed',
      detail: 'opens Sat 11:30',
    });
  });

  it('handles past-midnight spans', () => {
    const bar: OpeningHours[] = [{ day: 'Fri', open: '18:00', close: '02:00' }];
    expect(getOpenStatus(bar, at(4, 23))).toEqual({ state: 'open', detail: 'until 02:00' });
    expect(getOpenStatus(bar, at(5, 1))).toEqual({ state: 'open', detail: 'until 02:00' });
    expect(getOpenStatus(bar, at(5, 3)).state).toBe('closed');
  });

  it('handles 24h entries', () => {
    const allDay: OpeningHours[] = [{ day: 'Mon', open: '00:00', close: '24h' }];
    expect(getOpenStatus(allDay, at(0, 13))).toEqual({ state: 'open', detail: 'Open 24h' });
  });
});

describe('isAvailableToday (swipe-deck availability)', () => {
  const MENSA: OpeningHours[] = [{ day: 'Mon', open: '11:30', close: '14:00' }];

  it('true while open', () => {
    expect(isAvailableToday(MENSA, at(0, 12))).toBe(true);
  });

  it('true before opening on the same day (morning browsing)', () => {
    expect(isAvailableToday(MENSA, at(0, 9))).toBe(true);
  });

  it('false after closing for the day', () => {
    expect(isAvailableToday(MENSA, at(0, 15))).toBe(false);
  });

  it('false on days without any opening', () => {
    expect(isAvailableToday(MENSA, at(2, 12))).toBe(false);
  });

  it('lunch + dinner split: available in the gap', () => {
    expect(isAvailableToday(WURST, at(0, 16))).toBe(true); // dinner still coming
    expect(isAvailableToday(WURST, at(0, 23))).toBe(false); // done for today
  });

  it('past-midnight span counts as available while it runs', () => {
    const bar: OpeningHours[] = [{ day: 'Fri', open: '18:00', close: '02:00' }];
    expect(isAvailableToday(bar, at(5, 1))).toBe(true); // Sat 01:00, still open
    expect(isAvailableToday(bar, at(5, 3))).toBe(false); // Sat 03:00, next is Fri
  });

  it('no hours data never hides a place', () => {
    expect(isAvailableToday([], at(0, 12))).toBe(true);
    expect(isAvailableToday(undefined, at(0, 12))).toBe(true);
  });
});

describe('manualBerlinNow (Hermes Intl fallback)', () => {
  it('uses CET (UTC+1) in winter', () => {
    // Wed 2026-01-14 11:00 UTC -> 12:00 Berlin
    const now = manualBerlinNow(new Date(Date.UTC(2026, 0, 14, 11, 0)));
    expect(now.dayIndex).toBe(2);
    expect(now.weekMinutes % 1440).toBe(12 * 60);
  });

  it('uses CEST (UTC+2) in summer', () => {
    // Wed 2026-07-08 11:00 UTC -> 13:00 Berlin
    const now = manualBerlinNow(new Date(Date.UTC(2026, 6, 8, 11, 0)));
    expect(now.weekMinutes % 1440).toBe(13 * 60);
  });

  it('switches exactly on the last Sunday of March at 01:00 UTC', () => {
    // 2026-03-29 is the last Sunday of March 2026.
    const before = manualBerlinNow(new Date(Date.UTC(2026, 2, 29, 0, 59)));
    const after = manualBerlinNow(new Date(Date.UTC(2026, 2, 29, 1, 0)));
    expect(before.weekMinutes % 1440).toBe(1 * 60 + 59); // 01:59 CET
    expect(after.weekMinutes % 1440).toBe(3 * 60); // 03:00 CEST
  });

  it('switches back on the last Sunday of October at 01:00 UTC', () => {
    // 2026-10-25 is the last Sunday of October 2026.
    const before = manualBerlinNow(new Date(Date.UTC(2026, 9, 25, 0, 59)));
    const after = manualBerlinNow(new Date(Date.UTC(2026, 9, 25, 1, 0)));
    expect(before.weekMinutes % 1440).toBe(2 * 60 + 59); // 02:59 CEST
    expect(after.weekMinutes % 1440).toBe(2 * 60); // 02:00 CET
  });

  it('maps JS Sunday to dayIndex 6', () => {
    const now = manualBerlinNow(new Date(Date.UTC(2026, 6, 12, 10, 0))); // Sun
    expect(now.dayIndex).toBe(6);
  });
});
