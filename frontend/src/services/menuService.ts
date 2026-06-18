import apiClient from './apiClient';
import {Menu} from '@/types';

interface MenusResponse {
  success: boolean;
  data: Menu[];
  pagination: {total: number; limit: number; skip: number};
}

export const getMenus = (params?: {date?: string; location?: string; limit?: number; skip?: number}) =>
  apiClient.get<MenusResponse>('/menus', {params}).then(r => r.data);

export const getMenuById = (id: string) =>
  apiClient.get<{success: boolean; data: Menu}>(`/menus/${id}`).then(r => r.data);
