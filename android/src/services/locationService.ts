import apiClient from './apiClient';
import {NearbyFoodParams, NearbySearchResponse} from '@/types';

export const getNearbyFood = async (params: NearbyFoodParams): Promise<NearbySearchResponse> => {
  const {allergens_exclude, ...rest} = params;

  const query: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v != null) query[k] = v;
  }
  if (allergens_exclude && allergens_exclude.length > 0) {
    query['allergens_exclude'] = allergens_exclude.join(',');
  }

  const response = await apiClient.get<NearbySearchResponse>('/places/nearby-food', {params: query});
  return response.data;
};
