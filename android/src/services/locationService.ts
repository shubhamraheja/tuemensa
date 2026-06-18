import apiClient from './apiClient';
import {ENDPOINTS} from '@/constants/api';
import {Location, ApiResponse} from '@/types';

export const getLocations = async (): Promise<ApiResponse<Location[]>> => {
  const response = await apiClient.get<ApiResponse<Location[]>>(
    ENDPOINTS.LOCATIONS,
  );
  return response.data;
};
