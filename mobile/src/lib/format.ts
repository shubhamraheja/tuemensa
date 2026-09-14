import { MenuItem, Place } from '../types';

// Ported from frontend/src/lib/format.ts.

/** Dish price with its unit — "€6.80" or "€1.49 / 100 g". */
export function formatDishPrice(item: MenuItem): string | null {
  if (item.price == null) return null;
  return `€${item.price.toFixed(2)}${item.price_per_100g ? ' / 100 g' : ''}`;
}

const PRICE_SYMBOLS: Record<string, string> = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '€',
  PRICE_LEVEL_MODERATE: '€€',
  PRICE_LEVEL_EXPENSIVE: '€€€',
  PRICE_LEVEL_VERY_EXPENSIVE: '€€€€',
};

export function formatType(place: Place): string {
  const raw = place.place_type ?? place.google_types?.[0];
  if (!raw) return 'Food';
  const text = raw.replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatPrice(place: Place): string | null {
  // Prefer Google's actual euro range (most widely populated).
  if (place.price_start != null && place.price_end != null) {
    return `€${place.price_start}–${place.price_end}`;
  }
  if (place.price_start != null) return `from €${place.price_start}`;
  if (place.price_end != null) return `up to €${place.price_end}`;
  if (place.price_level && PRICE_SYMBOLS[place.price_level]) {
    return PRICE_SYMBOLS[place.price_level];
  }
  if (place.price_range) {
    return `€ ${place.price_range}`;
  }
  return null;
}

export function formatRating(place: Place): string | null {
  if (place.rating == null) return null;
  const count = place.user_rating_count ? ` (${place.user_rating_count})` : '';
  return `${place.rating.toFixed(1)}${count}`;
}
