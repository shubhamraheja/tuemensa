import { create } from 'zustand';
import { getPlaces, getPlacesWithDistances } from '../lib/api';
import { formatDistance, haversineMeters, walkDurationText } from '../lib/geo';
import { LatLng, PlaceWithDistance } from '../types';

/** Coords closer than this to the last fetch don't trigger a refetch. */
const REFETCH_THRESHOLD_M = 100;

interface PlacesState {
  places: PlaceWithDistance[];
  loading: boolean;
  error: string | null;
  lastCoords: LatLng | null;
  fetchFor: (coords: LatLng, force?: boolean) => Promise<void>;
}

/** Fill any missing distance fields locally so the UI can always show one. */
function withLocalDistances(places: PlaceWithDistance[], origin: LatLng): PlaceWithDistance[] {
  return places
    .map(place => {
      if (place.distance_meters != null || place.latitude == null || place.longitude == null) {
        return place;
      }
      const meters = haversineMeters(origin, {
        latitude: place.latitude,
        longitude: place.longitude,
      });
      return {
        ...place,
        distance_meters: meters,
        distance_text: formatDistance(meters),
        duration_text: walkDurationText(meters),
      };
    })
    .sort(
      (a, b) => (a.distance_meters ?? Number.MAX_VALUE) - (b.distance_meters ?? Number.MAX_VALUE),
    );
}

export const usePlacesStore = create<PlacesState>((set, get) => ({
  places: [],
  loading: false,
  error: null,
  lastCoords: null,
  fetchFor: async (coords, force = false) => {
    const { lastCoords, places } = get();
    if (
      !force &&
      lastCoords &&
      places.length > 0 &&
      haversineMeters(lastCoords, coords) < REFETCH_THRESHOLD_M
    ) {
      return;
    }
    set({ loading: true, error: null });
    try {
      let result: PlaceWithDistance[];
      try {
        result = await getPlacesWithDistances(coords);
      } catch {
        // Distance endpoint down — plain list + local straight-line distances.
        result = await getPlaces();
      }
      const usable = withLocalDistances(
        result.filter(place => !place.ignore),
        coords,
      );
      set({ places: usable, lastCoords: coords, loading: false });
    } catch {
      set({
        loading: false,
        error: 'Could not reach the TüMensa API. Is the backend running?',
      });
    }
  },
}));
