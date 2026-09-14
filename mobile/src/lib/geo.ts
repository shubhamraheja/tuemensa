import { LatLng } from '../types';

const EARTH_RADIUS_M = 6_371_000;
/** Average walking speed used for local estimates (~5 km/h). */
const WALK_METERS_PER_MIN = 83;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`.replace('.0 km', ' km');
}

export function walkDurationText(meters: number): string {
  const minutes = Math.max(1, Math.round(meters / WALK_METERS_PER_MIN));
  if (minutes < 60) return `≈${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `≈${h} h ${m} min` : `≈${h} h`;
}
