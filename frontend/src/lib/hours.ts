import {OpeningHours} from '@/types';

// Opening hours are stored in Tübingen local time, so status is computed
// against the current time in Europe/Berlin (not the visitor's timezone).

const DAY_INDEX: Record<string, number | undefined> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};
const DAY_LABEL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY = 1440;
const WEEK = 7 * DAY;

export type OpenStatus =
  | {state: 'open'; detail: string}
  | {state: 'closed'; detail: string}
  | {state: 'unknown'};

interface Interval {
  start: number; // minutes from Monday 00:00
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

function berlinNow(): {weekMinutes: number; dayIndex: number} {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  const dayIndex = DAY_INDEX[get('weekday')] ?? 0;
  const minutes = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10);
  return {weekMinutes: dayIndex * DAY + minutes, dayIndex};
}

function buildIntervals(hours: OpeningHours[]): Interval[] {
  const intervals: Interval[] = [];
  for (const entry of hours) {
    if (!(entry.day in DAY_INDEX)) continue;
    const day = DAY_INDEX[entry.day];
    if (day === undefined) continue;
    const open = parseMinutes(entry.open);
    if (open === null) continue;
    const start = day * DAY + open;

    if (entry.close === '24h') {
      intervals.push({start, duration: DAY - open, closeMinuteOfDay: 0, is24h: true});
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

export function getOpenStatus(hours: OpeningHours[] | undefined): OpenStatus {
  if (!hours || hours.length === 0) return {state: 'unknown'};
  const intervals = buildIntervals(hours);
  if (intervals.length === 0) return {state: 'unknown'};

  const {weekMinutes: now, dayIndex: _dayIndex} = berlinNow();

  // Open right now?
  for (const iv of intervals) {
    const offset = (((now - iv.start) % WEEK) + WEEK) % WEEK;
    if (offset < iv.duration) {
      return {
        state: 'open',
        detail: iv.is24h ? 'Open 24h' : `until ${fmt(iv.closeMinuteOfDay)}`,
      };
    }
  }

  // Closed — find the soonest upcoming opening.
  let best: {delta: number; start: number} | null = null;
  for (const iv of intervals) {
    const delta = (((iv.start - now) % WEEK) + WEEK) % WEEK;
    if (best === null || delta < best.delta) best = {delta, start: iv.start};
  }
  if (best === null) return {state: 'closed', detail: ''};

  const startDay = Math.floor(best.start / DAY) % 7;
  const openClock = fmt(best.start % DAY);
  const laterToday = best.delta < DAY - (now % DAY);
  const detail = laterToday
    ? `opens ${openClock}`
    : `opens ${DAY_LABEL[startDay]} ${openClock}`;
  return {state: 'closed', detail};
}
