export const APP_NAME = 'TUE Mensa';
export const APP_VERSION = '1.0.0';

export const CACHE_DURATION = {
  MENUS: 3600000,     // 1 hour
  LOCATIONS: 86400000, // 24 hours
  USER: 300000,        // 5 minutes
};

export const DIETARY_OPTIONS = [
  'vegan',
  'vegetarian',
  'gluten-free',
  'lactose-free',
  'halal',
] as const;
