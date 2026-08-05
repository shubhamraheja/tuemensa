// Shapes mirror the backend API (backend/app/schemas/place.py) and the web
// frontend's types (frontend/src/types/index.ts).

export type PlaceType =
  | 'mensa'
  | 'cafeteria'
  | 'restaurant'
  | 'cafe'
  | 'bistro'
  | 'bakery';

export interface MenuItem {
  name: string;
  price?: number | null;
  /** True when the price is per 100 g rather than per dish. */
  price_per_100g?: boolean;
  day?: string | null; // "Mon".."Fri" for weekly menus; null if not day-specific
  category?: string | null;
  allergens?: string[];
  image_url?: string | null;
}

export interface OpeningHours {
  day: string;
  open: string;
  close: string;
}

export interface Place {
  id: number;
  name: string;
  location: string;
  google_place_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  place_type?: PlaceType | null;
  cuisine?: string | null;
  google_types: string[];
  menu: MenuItem[];
  opening_hours: OpeningHours[];
  price_range?: string | null;
  price_level?: string | null;
  price_start?: number | null;
  price_end?: number | null;
  rating?: number | null;
  user_rating_count?: number | null;
  google_maps_uri?: string | null;
  website_uri?: string | null;
  photo_name?: string | null;
  photo_url?: string | null;
  photo_attributions?: string[];
  ignore: boolean;
}

export interface PlaceWithDistance extends Place {
  distance_meters?: number | null;
  duration_seconds?: number | null;
  distance_text?: string | null;
  duration_text?: string | null;
}

export type DisplayMode = 'list' | 'swipe' | 'cards' | 'map';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface SavedLocation extends LatLng {
  id: string;
  name: string;
}
