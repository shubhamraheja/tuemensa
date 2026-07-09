import { groupByDay, isServedToday } from '../lib/menu';
import { MenuItem } from '../types';

const item = (name: string, day: string | null): MenuItem => ({ name, day });

describe('groupByDay', () => {
  it('groups Mon-first with day-less items trailing', () => {
    const groups = groupByDay([
      item('elk dish', null),
      item('wed dish', 'Wed'),
      item('mon dish', 'Mon'),
      item('mon dish 2', 'Mon'),
    ]);
    expect(groups.map(g => g.day)).toEqual(['Mon', 'Wed', null]);
    expect(groups[0].items).toHaveLength(2);
  });

  it('handles empty menus', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('isServedToday', () => {
  it('matches the given day and passes day-less items', () => {
    expect(isServedToday(item('a', 'Tue'), 'Tue')).toBe(true);
    expect(isServedToday(item('b', 'Wed'), 'Tue')).toBe(false);
    expect(isServedToday(item('c', null), 'Tue')).toBe(true);
  });
});
