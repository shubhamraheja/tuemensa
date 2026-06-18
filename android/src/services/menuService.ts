import apiClient from './apiClient';
import {ENDPOINTS} from '@/constants/api';
import {Menu, PaginatedResponse, ApiResponse} from '@/types';

export const getMenus = async (params?: {
  date?: string;
  location?: string;
  limit?: number;
  skip?: number;
}): Promise<PaginatedResponse<Menu[]>> => {
  const response = await apiClient.get<PaginatedResponse<Menu[]>>(
    ENDPOINTS.MENUS,
    {params},
  );
  return response.data;
};

export const getMenuById = async (id: string): Promise<ApiResponse<Menu>> => {
  const response = await apiClient.get<ApiResponse<Menu>>(
    `${ENDPOINTS.MENUS}/${id}`,
  );
  return response.data;
};
