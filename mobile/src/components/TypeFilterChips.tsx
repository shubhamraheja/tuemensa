import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { TypeFilter, useUiStore } from '../stores/useUiStore';
import { spacing } from '../theme/theme';
import Chip from './Chip';

const FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mensa', label: 'Mensa' }, // includes cafeterias
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'cafe', label: 'Café' },
  { id: 'bistro', label: 'Bistro' },
  { id: 'bakery', label: 'Bakery' },
];

/** Horizontal place-type filter (filter #1). */
export default function TypeFilterChips() {
  const typeFilter = useUiStore(state => state.typeFilter);
  const setTypeFilter = useUiStore(state => state.setTypeFilter);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {FILTERS.map(filter => (
        <Chip
          key={filter.id}
          label={filter.label}
          active={typeFilter === filter.id}
          onPress={() => setTypeFilter(filter.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Horizontal ScrollViews expand vertically inside flex columns unless told not to.
  scroll: {
    flexGrow: 0,
  },
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
});
