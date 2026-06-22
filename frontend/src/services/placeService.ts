import apiClient from './apiClient';

export interface MapsConfig {
  googleMapsApiKey: string | null;
}

export interface NearbyFoodPlace {
  id: string;
  name: string;
  address?: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  rating?: number | null;
  user_rating_count?: number | null;
  price_level?: string | null;
  open_now?: boolean | null;
  types: string[];
  google_maps_uri?: string | null;
  website_uri?: string | null;
}

export interface NearbyFoodResponse {
  places: NearbyFoodPlace[];
}

export const getMapsConfig = () =>
  apiClient.get<MapsConfig>('/config/maps').then(response => response.data);

export const getNearbyFood = (params: {
  latitude: number;
  longitude: number;
  radius: number;
  max_results?: number;
}) => apiClient.get<NearbyFoodResponse>('/places/nearby-food', {params}).then(response => response.data);
