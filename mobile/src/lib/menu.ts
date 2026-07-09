import { MenuItem } from '../types';
import { berlinNow, DAY_LABEL } from './hours';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Group menu items by weekday (Mon-first); day-less items go in one trailing group. */
export function groupByDay(menu: MenuItem[]): { day: string | null; items: MenuItem[] }[] {
  const groups = new Map<string, MenuItem[]>();
  for (const item of menu) {
    const key = item.day ?? '';
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(item);
  }
  return [...groups.keys()]
    .sort((a, b) => (a ? DAY_ORDER.indexOf(a) : 99) - (b ? DAY_ORDER.indexOf(b) : 99))
    .map(key => ({ day: key || null, items: groups.get(key)! }));
}

/** Today's weekday label ("Mon".."Sun") in Berlin time. */
export function todayLabel(): string {
  return DAY_LABEL[berlinNow().dayIndex];
}

/** Day-less items (e.g. Hungry Elk's weekly PDF) count as served today. */
export function isServedToday(item: MenuItem, today: string = todayLabel()): boolean {
  return item.day == null || item.day === today;
}
