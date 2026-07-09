import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { palette, radii, spacing, type } from '../theme/theme';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  small?: boolean;
}

/** Pill chip used for filters and tags. Static (no onPress) chips render muted. */
export default function Chip({ label, active = false, onPress, small = false }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected: active } : undefined}
      hitSlop={6}
      style={({ pressed }) => [
        styles.chip,
        small && styles.small,
        active && styles.active,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[small ? type.caption : type.label, styles.label, active && styles.labelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceAlt,
  },
  small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  active: {
    backgroundColor: palette.tangerineSoft,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    color: palette.inkMuted,
  },
  labelActive: {
    color: palette.tangerineDark,
  },
});
