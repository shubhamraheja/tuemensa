import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUiStore } from '../stores/useUiStore';
import { DisplayMode } from '../types';
import { palette, radii, shadow, spacing, type } from '../theme/theme';

const MODES: { id: DisplayMode; icon: React.ComponentProps<typeof Feather>['name']; label: string }[] = [
  { id: 'list', icon: 'list', label: 'List' },
  { id: 'swipe', icon: 'zap', label: 'Swipe' },
  { id: 'cards', icon: 'grid', label: 'Cards' },
  { id: 'map', icon: 'map', label: 'Map' },
];

/** Floating bottom pill — swaps display modes (not a navigator). */
export default function PillDock() {
  const displayMode = useUiStore(state => state.displayMode);
  const setDisplayMode = useUiStore(state => state.setDisplayMode);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.host, { bottom: insets.bottom + spacing.md }]} pointerEvents="box-none">
      <View style={[styles.dock, shadow.card]}>
        {MODES.map(mode => {
          const active = displayMode === mode.id;
          return (
            <Pressable
              key={mode.id}
              onPress={() => setDisplayMode(mode.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={mode.label}
              style={({ pressed }) => [
                styles.segment,
                active && styles.segmentActive,
                pressed && styles.pressed,
              ]}
            >
              <Feather
                name={mode.icon}
                size={18}
                color={active ? palette.tangerineDark : palette.inkFaint}
              />
              {active && <Text style={styles.segmentLabel}>{mode.label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: palette.tangerineSoft,
  },
  segmentLabel: {
    ...type.label,
    color: palette.tangerineDark,
  },
  pressed: {
    opacity: 0.7,
  },
});
