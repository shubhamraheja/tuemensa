import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ALLERGEN_KEYS, ALLERGENS, Diet } from '../lib/allergens';
import { useProfileStore } from '../stores/useProfileStore';
import { useUiStore } from '../stores/useUiStore';
import { palette, radii, spacing, type } from '../theme/theme';
import Chip from './Chip';
import Sheet from './Sheet';

const DIETS: { id: Diet; label: string }[] = [
  { id: 'none', label: 'Everything' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
];

/** Filter #2: dietary profile — set once, persisted, applied where data exists. */
export default function ProfileSheet() {
  const open = useUiStore(state => state.profileSheetOpen);
  const setOpen = useUiStore(state => state.setProfileSheetOpen);
  const diet = useProfileStore(state => state.diet);
  const setDiet = useProfileStore(state => state.setDiet);
  const excludedAllergens = useProfileStore(state => state.excludedAllergens);
  const toggleAllergen = useProfileStore(state => state.toggleAllergen);

  return (
    <Sheet open={open} onClose={() => setOpen(false)}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your profile</Text>
        <Text style={styles.subtitle}>
          Applied only where menu data exists — dishes without info stay visible.
        </Text>

        <Text style={styles.heading}>Diet</Text>
        <View style={styles.segmented}>
          {DIETS.map(option => {
            const active = diet === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setDiet(option.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={({ pressed }) => [
                  styles.segment,
                  active && styles.segmentActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.heading}>Avoid allergens</Text>
        <View style={styles.allergenGrid}>
          {ALLERGEN_KEYS.map(key => (
            <Chip
              key={key}
              label={ALLERGENS[key].label}
              active={excludedAllergens.includes(key)}
              onPress={() => toggleAllergen(key)}
            />
          ))}
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  title: {
    ...type.title,
    color: palette.ink,
  },
  subtitle: {
    ...type.caption,
    color: palette.inkFaint,
  },
  heading: {
    ...type.label,
    color: palette.ink,
    marginTop: spacing.sm,
  },
  segmented: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceAlt,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: palette.surface,
  },
  segmentLabel: {
    ...type.label,
    color: palette.inkMuted,
  },
  segmentLabelActive: {
    color: palette.tangerineDark,
  },
  allergenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
