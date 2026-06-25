export type MealType = 'meal' | 'snack';
export type PriceTier = '<5' | '5-10' | '>10';

export interface MenuItem {
  name: string;
  price?: number | null;
}

export interface OpeningHours {
  day?: string;
  open?: string;
  close?: string;
  description?: string;
}

export interface Place {
  id: number;
  google_place_id?: string | null;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  user_rating_count?: number | null;
  price_tier?: PriceTier | null;
  meal_type?: MealType | null;
  cuisine?: string | null;
  is_vegan_friendly?: boolean | null;
  is_vegetarian_friendly?: boolean | null;
  allergens?: string[] | null;
  menu: MenuItem[];
  opening_hours: OpeningHours[];
  google_maps_uri?: string | null;
  website_uri?: string | null;
  open_now?: boolean | null;
  distance_m?: number | null;
}

export interface NearbySearchResponse {
  places: Place[];
}

export interface NearbyFoodParams {
  latitude: number;
  longitude: number;
  radius?: number;
  meal_type?: MealType | null;
  price_tier?: PriceTier | null;
  is_vegan_friendly?: boolean | null;
  is_vegetarian_friendly?: boolean | null;
  allergens_exclude?: string[];
}
