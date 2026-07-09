import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { prettifyToken } from '../lib/allergens';
import { formatDishPrice } from '../lib/format';
import { MenuItem, PlaceWithDistance } from '../types';
import { fonts, palette, radii, spacing, type } from '../theme/theme';
import Chip from './Chip';

/** Warm tones keyed off the place id, matching GradientThumb. */
const BANDS = ['#FDEBDB', '#FBE3CE', '#F7E8D4', '#FCE7DF', '#F5EBDC', '#FDE6E0'];

interface Props {
  dish: MenuItem;
  place: PlaceWithDistance;
}

/** Full-size swipe card for one dish. */
export default function DishCard({ dish, place }: Props) {
  const band = BANDS[Math.abs(place.id) % BANDS.length];
  const allergens = [...new Set((dish.allergens ?? []).map(prettifyToken))];

  return (
    <View style={styles.card}>
      <View style={[styles.band, { backgroundColor: band }]}>
        {dish.category ? <Chip label={dish.category} small /> : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.name}>{dish.name}</Text>
        {dish.price != null ? <Text style={styles.price}>{formatDishPrice(dish)}</Text> : null}

        {allergens.length > 0 && (
          <View style={styles.allergenRow}>
            {allergens.slice(0, 5).map(label => (
              <Chip key={label} label={label} small />
            ))}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Feather name="map-pin" size={13} color={palette.inkMuted} />
        <Text style={styles.place} numberOfLines={1}>
          {place.name}
        </Text>
        <Text style={styles.distance}>{place.distance_text ?? ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  band: {
    height: 120,
    padding: spacing.lg,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  body: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.md,
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: fonts.semibold,
    color: palette.ink,
  },
  price: {
    ...type.title,
    color: palette.tangerineDark,
  },
  allergenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 'auto',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  place: {
    ...type.label,
    color: palette.inkMuted,
    flexShrink: 1,
  },
  distance: {
    ...type.label,
    color: palette.ink,
    marginLeft: 'auto',
  },
});
