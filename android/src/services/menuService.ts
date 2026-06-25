import apiClient from './apiClient';
import {Place} from '@/types';

export const getPlacesWithMenus = async (): Promise<Place[]> => {
  const response = await apiClient.get<{places: Place[]}>('/places/nearby-food', {
    params: {latitude: 48.5216, longitude: 9.0576, radius: 5000},
  });
  return response.data.places.filter(p => p.menu && p.menu.length > 0);
};
