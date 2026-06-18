// 10.0.2.2 is the Android emulator loopback to host machine
export const API_BASE_URL =
  process.env.API_BASE_URL || 'http://10.0.2.2:8000/api/v1';

export const API_TIMEOUT = Number(process.env.API_TIMEOUT) || 30000;

export const ENDPOINTS = {
  MENUS: '/menus',
  LOCATIONS: '/locations',
} as const;
