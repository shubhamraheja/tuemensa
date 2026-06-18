export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  allergens?: string[];
  nutritionInfo?: NutritionInfo;
  available: boolean;
  image?: string;
}

export interface Menu {
  id: string;
  date: string;
  location: string;
  items: MenuItem[];
}

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  openingHours: {day: string; open: string; close: string}[];
  phone?: string;
  email?: string;
  active: boolean;
}
