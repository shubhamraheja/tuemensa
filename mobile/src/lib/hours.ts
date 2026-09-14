import { OpeningHours } from '../types';

// Opening hours are stored in Tübingen local time, so status is computed
// against the current time in Europe/Berlin (not the device's timezone).
// Ported from frontend/src/lib/hours.ts with a Hermes-safe fallback: if
// Intl.DateTimeFormat with a timeZone isn't fully supported, we compute the
// Berlin offset manually (CET/CEST via the last-Sunday-of-March/October rule).

const DAY_INDEX: Record<string, number | undefined> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};
export const DAY_LABEL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY = 1440;
const WEEK = 7 * DAY;

export type OpenStatus =
  | { state: 'open'; detail: string }
  | { state: 'closed'; detail: string }
  | { state: 'unknown' };

export interface BerlinNow {
  weekMinutes: number; // minutes since Monday 00:00, Berlin time
  dayIndex: number; // 0 = Monday
}

interface Interval {
  start: number;
  duration: number;
  closeMinuteOfDay: number;
  is24h: boolean;
}

function parseMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function fmt(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function intlBerlinNow(): BerlinNow | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
    const dayIndex = DAY_INDEX[get('weekday')];
    const hours = parseInt(get('hour'), 10);
    const minutes = parseInt(get('minute'), 10);
    if (dayIndex === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }
    return { weekMinutes: dayIndex * DAY + hours * 60 + minutes, dayIndex };
  } catch {
    return null;
  }
}

/** 01:00 UTC on the last Sunday of the given month (0-based). */
function lastSundayUtc(year: number, month: number): number {
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const sunday = lastDay.getUTCDate() - lastDay.getUTCDay();
  return Date.UTC(year, month, sunday, 1, 0, 0);
}

/** Manual CET/CEST fallback; exported for direct unit testing. */
export function manualBerlinNow(now: Date): BerlinNow {
  const year = now.getUTCFullYear();
  const dst = now.getTime() >= lastSundayUtc(year, 2) && now.getTime() < lastSundayUtc(year, 9);
  const local = new Date(now.getTime() + (dst ? 2 : 1) * 3_600_000);
  const dayIndex = (local.getUTCDay() + 6) % 7; // JS 0=Sun -> our 0=Mon
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  return { weekMinutes: dayIndex * DAY + minutes, dayIndex };
}

export function berlinNow(): BerlinNow {
  return intlBerlinNow() ?? manualBerlinNow(new Date());
}

function buildIntervals(hours: OpeningHours[]): Interval[] {
  const intervals: Interval[] = [];
  for (const entry of hours) {
    const day = DAY_INDEX[entry.day];
    if (day === undefined) continue;
    const open = parseMinutes(entry.open);
    if (open === null) continue;
    const start = day * DAY + open;

    if (entry.close === '24h') {
      intervals.push({ start, duration: DAY - open, closeMinuteOfDay: 0, is24h: true });
      continue;
    }
    const close = parseMinutes(entry.close);
    if (close === null) continue;
    let end = day * DAY + close;
    if (close <= open) end += DAY; // spans past midnight
    intervals.push({
      start,
      duration: end - start,
      closeMinuteOfDay: end % DAY,
      is24h: false,
    });
  }
  return intervals;
}

/**
 * True when the place is open right now OR opens again later today —
 * i.e. its dishes are still realistically obtainable today. Places without
 * hours data are never hidden.
 */
export function isAvailableToday(
  hours: OpeningHours[] | undefined,
  now: BerlinNow = berlinNow(),
): boolean {
  if (!hours || hours.length === 0) return true;
  const intervals = buildIntervals(hours);
  if (intervals.length === 0) return true;
  const current = now.weekMinutes;
  const endOfToday = (now.dayIndex + 1) * DAY;
  for (const iv of intervals) {
    const offset = (((current - iv.start) % WEEK) + WEEK) % WEEK;
    if (offset < iv.duration) return true; // open right now
    const delta = (((iv.start - current) % WEEK) + WEEK) % WEEK;
    if (current + delta < endOfToday) return true; // opens later today
  }
  return false;
}

export function getOpenStatus(
  hours: OpeningHours[] | undefined,
  now: BerlinNow = berlinNow(),
): OpenStatus {
  if (!hours || hours.length === 0) return { state: 'unknown' };
  const intervals = buildIntervals(hours);
  if (intervals.length === 0) return { state: 'unknown' };

  const current = now.weekMinutes;

  // Open right now?
  for (const iv of intervals) {
    const offset = (((current - iv.start) % WEEK) + WEEK) % WEEK;
    if (offset < iv.duration) {
      return {
        state: 'open',
        detail: iv.is24h ? 'Open 24h' : `until ${fmt(iv.closeMinuteOfDay)}`,
      };
    }
  }

  // Closed — find the soonest upcoming opening.
  let best: { delta: number; start: number } | null = null;
  for (const iv of intervals) {
    const delta = (((iv.start - current) % WEEK) + WEEK) % WEEK;
    if (best === null || delta < best.delta) best = { delta, start: iv.start };
  }
  if (best === null) return { state: 'closed', detail: '' };

  const startDay = Math.floor(best.start / DAY) % 7;
  const openClock = fmt(best.start % DAY);
  const laterToday = best.delta < DAY - (current % DAY);
  const detail = laterToday ? `opens ${openClock}` : `opens ${DAY_LABEL[startDay]} ${openClock}`;
  return { state: 'closed', detail };
}
