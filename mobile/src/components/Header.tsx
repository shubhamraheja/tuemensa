import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { locationLabel, useLocationStore } from '../stores/useLocationStore';
import { useUiStore } from '../stores/useUiStore';
import { fonts, palette, radii, spacing, type } from '../theme/theme';

/** App mark · location chip (opens LocationSheet) · profile gear. */
export default function Header() {
  const label = useLocationStore(locationLabel);
  const setLocationSheetOpen = useUiStore(state => state.setLocationSheetOpen);
  const setProfileSheetOpen = useUiStore(state => state.setProfileSheetOpen);

  return (
    <View style={styles.header}>
      <Text style={styles.mark}>
        Tü<Text style={styles.markAccent}>Mensa</Text>
      </Text>

      <Pressable
        onPress={() => setLocationSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Location: ${label}. Change location`}
        style={({ pressed }) => [styles.locationChip, pressed && styles.pressed]}
      >
        <Feather name="map-pin" size={14} color={palette.tangerineDark} />
        <Text style={styles.locationText} numberOfLines={1}>
          {label}
        </Text>
        <Feather name="chevron-down" size={14} color={palette.inkMuted} />
      </Pressable>

      <Pressable
        onPress={() => setProfileSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Dietary profile"
        hitSlop={8}
        style={({ pressed }) => [styles.gear, pressed && styles.pressed]}
      >
        <Feather name="sliders" size={18} color={palette.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  mark: {
    ...type.title,
    color: palette.ink,
    fontFamily: fonts.semibold,
  },
  markAccent: {
    color: palette.tangerine,
  },
  locationChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  locationText: {
    ...type.label,
    color: palette.ink,
    flexShrink: 1,
  },
  gear: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  pressed: {
    opacity: 0.7,
  },
});
