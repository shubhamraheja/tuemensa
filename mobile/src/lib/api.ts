import { Place, PlaceWithDistance } from '../types';

// EXPO_PUBLIC_* vars are inlined at bundle time (restart expo after changes).
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export function resolveApiUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE_URL.replace(/\/$/, '')}${path.replace(/^\/api\/v1/, '')}`;
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`API ${path} failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

/** All places stored in the DB (no distances). Fallback when the distance call fails. */
export const getPlaces = () => request<Place[]>('/places/');

/** Places with live travel distances from the given location, nearest first. */
export const getPlacesWithDistances = (params: {
  latitude: number;
  longitude: number;
  mode?: 'walking' | 'driving' | 'bicycling' | 'transit';
}) => {
  const query = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    mode: params.mode ?? 'walking',
  });
  return request<PlaceWithDistance[]>(`/places/distances?${query}`);
};
