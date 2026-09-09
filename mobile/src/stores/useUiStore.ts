import { create } from 'zustand';
import { DisplayMode, PlaceType } from '../types';

export type TypeFilter = 'all' | 'mensa' | 'restaurant' | 'cafe' | 'bistro' | 'bakery';

/** Which place_type values each filter chip matches. Mensa covers cafeterias too. */
export const TYPE_FILTER_SETS: Record<Exclude<TypeFilter, 'all'>, PlaceType[]> = {
  mensa: ['mensa', 'cafeteria'],
  restaurant: ['restaurant'],
  cafe: ['cafe'],
  bistro: ['bistro'],
  bakery: ['bakery'],
};

export type RadiusKm = 0.5 | 1 | 2.5 | 5;

interface UiState {
  displayMode: DisplayMode;
  typeFilter: TypeFilter;
  cuisineFilter: string | null;
  radiusKm: RadiusKm;
  /** Swipe deck: only dishes from places open now or opening again today. */
  openTodayOnly: boolean;
  selectedPlaceId: number | null;
  locationSheetOpen: boolean;
  profileSheetOpen: boolean;
  setDisplayMode: (mode: DisplayMode) => void;
  setTypeFilter: (filter: TypeFilter) => void;
  setCuisineFilter: (cuisine: string | null) => void;
  setRadiusKm: (radius: RadiusKm) => void;
  setOpenTodayOnly: (on: boolean) => void;
  selectPlace: (id: number | null) => void;
  setLocationSheetOpen: (open: boolean) => void;
  setProfileSheetOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>(set => ({
  displayMode: 'list',
  typeFilter: 'all',
  cuisineFilter: null,
  radiusKm: 2.5,
  openTodayOnly: true,
  selectedPlaceId: null,
  locationSheetOpen: false,
  profileSheetOpen: false,
  setDisplayMode: displayMode => set({ displayMode }),
  setTypeFilter: typeFilter => set({ typeFilter }),
  setCuisineFilter: cuisineFilter => set({ cuisineFilter }),
  setRadiusKm: radiusKm => set({ radiusKm }),
  setOpenTodayOnly: openTodayOnly => set({ openTodayOnly }),
  selectPlace: selectedPlaceId => set({ selectedPlaceId }),
  setLocationSheetOpen: locationSheetOpen => set({ locationSheetOpen }),
  setProfileSheetOpen: profileSheetOpen => set({ profileSheetOpen }),
}));
