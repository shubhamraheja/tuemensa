import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MenuItem } from '../types';

export interface ShortlistEntry {
  placeId: number;
  placeName: string;
  distanceText?: string | null;
  dish: MenuItem;
}

/** Stable identity for a dish within a day. */
export const dishKey = (placeId: number, dishName: string) => `${placeId}:${dishName}`;

interface ShortlistState {
  /** ISO date the state belongs to — swiping is a per-day activity. */
  dateKey: string;
  entries: ShortlistEntry[];
  /** dishKeys swiped left — kept so they don't reappear on deck rebuilds. */
  skipped: string[];
  add: (entry: ShortlistEntry) => void;
  removeLast: () => void;
  removeAt: (index: number) => void;
  addSkip: (key: string) => void;
  removeSkip: (key: string) => void;
  clear: () => void;
  /** Drops yesterday's decisions; call before reading. */
  ensureFresh: (todayKey: string) => void;
}

export const useShortlistStore = create<ShortlistState>()(
  persist(
    set => ({
      dateKey: '',
      entries: [],
      skipped: [],
      add: entry => set(state => ({ entries: [...state.entries, entry] })),
      removeLast: () => set(state => ({ entries: state.entries.slice(0, -1) })),
      removeAt: index =>
        set(state => ({ entries: state.entries.filter((_, i) => i !== index) })),
      addSkip: key =>
        set(state =>
          state.skipped.includes(key) ? state : { skipped: [...state.skipped, key] },
        ),
      removeSkip: key =>
        set(state => ({ skipped: state.skipped.filter(k => k !== key) })),
      clear: () => set({ entries: [], skipped: [] }),
      ensureFresh: todayKey =>
        set(state =>
          state.dateKey === todayKey
            ? state
            : { dateKey: todayKey, entries: [], skipped: [] },
        ),
    }),
    {
      name: 'tuemensa-shortlist',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        dateKey: state.dateKey,
        entries: state.entries,
        skipped: state.skipped,
      }),
    },
  ),
);
