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
  cuisine?: string | null;
  vegetarian?: boolean;
  vegan?: boolean;
}) =>
  apiClient
    .get<PlaceWithDistance[]>('/places/distances', {params})
    .then(response => response.data);

export interface ScrapeSummary {
  success: boolean;
  total_places: number;
  created: number;
  updated: number;
  enriched: number;
  scrapers: {scraper: string; places: number; menu_items: number}[];
}

/** Debug: trigger all mensa scrapers on the backend. Can take ~10-30s. */
export const runScrapers = () =>
  apiClient
    .post<ScrapeSummary>('/places/scrape', undefined, {timeout: 120000})
    .then(response => response.data);
