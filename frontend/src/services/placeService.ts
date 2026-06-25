import apiClient from './apiClient';
import {Place, PlaceWithDistance} from '@/types';

/** All places stored in the DB (no distances). Fallback when location is unavailable. */
export const getPlaces = () =>
  apiClient.get<Place[]>('/places/').then(response => response.data);

/**
 * Call 2 — places from the DB with live travel distances from the given
 * location, nearest first.
 */
export const getPlacesWithDistances = (params: {
  latitude: number;
  longitude: number;
  mode?: 'walking' | 'driving' | 'bicycling' | 'transit';
}) =>
  apiClient
    .get<PlaceWithDistance[]>('/places/distances', {params})
    .then(response => response.data);
