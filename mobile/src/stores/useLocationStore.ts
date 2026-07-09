import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { LatLng, SavedLocation } from '../types';

/** Fallback when no location is available: Tübingen city center. */
export const TUEBINGEN_CENTER: LatLng = { latitude: 48.5216, longitude: 9.0576 };

type LocationMode = 'current' | 'picked' | 'saved';

interface LocationState {
  mode: LocationMode;
  current: LatLng | null;
  currentDenied: boolean;
  picked: LatLng | null;
  savedLocations: SavedLocation[];
  activeSavedId: string | null;
  selectCurrent: () => void;
  setPicked: (point: LatLng) => void;
  selectSaved: (id: string) => void;
  addSaved: (name: string, point: LatLng) => void;
  renameSaved: (id: string, name: string) => void;
  removeSaved: (id: string) => void;
  /** Ask for permission (lazily) and resolve the device position. */
  refreshCurrent: () => Promise<void>;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      mode: 'current',
      current: null,
      currentDenied: false,
      picked: null,
      savedLocations: [],
      activeSavedId: null,
      selectCurrent: () => set({ mode: 'current', activeSavedId: null }),
      setPicked: point => set({ mode: 'picked', picked: point, activeSavedId: null }),
      selectSaved: id => set({ mode: 'saved', activeSavedId: id }),
      addSaved: (name, point) =>
        set(state => ({
          savedLocations: [
            ...state.savedLocations,
            { id: `${Date.now()}`, name, ...point },
          ],
        })),
      renameSaved: (id, name) =>
        set(state => ({
          savedLocations: state.savedLocations.map(loc =>
            loc.id === id ? { ...loc, name } : loc,
          ),
        })),
      removeSaved: id =>
        set(state => ({
          savedLocations: state.savedLocations.filter(loc => loc.id !== id),
          activeSavedId: state.activeSavedId === id ? null : state.activeSavedId,
          mode: state.activeSavedId === id ? 'current' : state.mode,
        })),
      refreshCurrent: async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            set({ currentDenied: true });
            return;
          }
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          set({
            current: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            currentDenied: false,
          });
        } catch {
          set({ currentDenied: true });
        }
      },
    }),
    {
      name: 'tuemensa-locations',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ savedLocations: state.savedLocations }),
    },
  ),
);

/** The coordinates everything else should use right now. */
export function effectiveCoords(state: LocationState): LatLng {
  if (state.mode === 'picked' && state.picked) return state.picked;
  if (state.mode === 'saved') {
    const saved = state.savedLocations.find(loc => loc.id === state.activeSavedId);
    if (saved) return { latitude: saved.latitude, longitude: saved.longitude };
  }
  return state.current ?? TUEBINGEN_CENTER;
}

/** Label for the header chip. */
export function locationLabel(state: LocationState): string {
  if (state.mode === 'picked' && state.picked) return 'Pinned point';
  if (state.mode === 'saved') {
    const saved = state.savedLocations.find(loc => loc.id === state.activeSavedId);
    if (saved) return saved.name;
  }
  return state.currentDenied || !state.current ? 'Tübingen center' : 'Current location';
}
