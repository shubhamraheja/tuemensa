import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useUiStore } from '../stores/useUiStore';
import { spacing } from '../theme/theme';
import Chip from './Chip';

const CUISINES = [
  'Turkish',
  'Indian',
  'Italian',
  'German',
  'Asian',
  'Greek',
  'American',
  'Mediterranean',
  'Middle Eastern',
];

/** Horizontal cuisine filter chips (filter #2). */
export default function CuisineFilterChips() {
  const cuisineFilter = useUiStore(state => state.cuisineFilter);
  const setCuisineFilter = useUiStore(state => state.setCuisineFilter);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {CUISINES.map(cuisine => (
        <Chip
          key={cuisine}
          label={cuisine}
          active={cuisineFilter === cuisine}
          onPress={() => setCuisineFilter(cuisineFilter === cuisine ? null : cuisine)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
