import apiClient from './apiClient';
import {NearbyFoodPlace} from '@/types';

interface NearbyFoodResponse {
  success: boolean;
  data: NearbyFoodPlace[];
}

export interface NearbyFoodParams {
  latitude: number;
  longitude: number;
  radius_meters?: number;
  max_results?: number;
  place_type?: 'restaurant' | 'cafe' | 'bakery' | 'meal_takeaway';
}

export const getNearbyFood = (params: NearbyFoodParams) =>
  apiClient
    .get<NearbyFoodResponse>('/locations/nearby-food', {params})
    .then(response => response.data);
