import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { effectiveCoords, TUEBINGEN_CENTER, useLocationStore } from '../stores/useLocationStore';
import { useUiStore } from '../stores/useUiStore';
import { palette, radii, spacing, type } from '../theme/theme';
import LeafletMap from './LeafletMap';
import Sheet from './Sheet';

/** Filter #3: current location · pick on a Tübingen map · saved places. */
export default function LocationSheet() {
  const open = useUiStore(state => state.locationSheetOpen);
  const setOpen = useUiStore(state => state.setLocationSheetOpen);

  const mode = useLocationStore(state => state.mode);
  const current = useLocationStore(state => state.current);
  const currentDenied = useLocationStore(state => state.currentDenied);
  const picked = useLocationStore(state => state.picked);
  const savedLocations = useLocationStore(state => state.savedLocations);
  const activeSavedId = useLocationStore(state => state.activeSavedId);
  const selectCurrent = useLocationStore(state => state.selectCurrent);
  const setPicked = useLocationStore(state => state.setPicked);
  const selectSaved = useLocationStore(state => state.selectSaved);
  const addSaved = useLocationStore(state => state.addSaved);
  const removeSaved = useLocationStore(state => state.removeSaved);
  const coords = useLocationStore(useShallow(effectiveCoords));

  const [mapExpanded, setMapExpanded] = useState(false);
  const [saveName, setSaveName] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setMapExpanded(false);
    setSaveName(null);
  };

  const handleUseCurrent = () => {
    selectCurrent();
    void useLocationStore.getState().refreshCurrent();
    close();
  };

  const handleSave = () => {
    const name = saveName?.trim();
    if (!name) return;
    addSaved(name, coords);
    setSaveName(null);
  };

  return (
    <Sheet open={open} onClose={close}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Location</Text>

        {/* Current location */}
        <Pressable
          onPress={handleUseCurrent}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.rowIcon}>
            <Feather name="navigation" size={16} color={palette.tangerineDark} />
          </View>
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle}>Use current location</Text>
            {currentDenied || !current ? (
              <Text style={styles.rowSub}>No GPS — falls back to Tübingen center</Text>
            ) : null}
          </View>
          {mode === 'current' && <Feather name="check" size={18} color={palette.tangerineDark} />}
        </Pressable>

        {/* Pick on map */}
        <Pressable
          onPress={() => setMapExpanded(expanded => !expanded)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.rowIcon}>
            <Feather name="map" size={16} color={palette.tangerineDark} />
          </View>
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle}>Pick on map</Text>
            {mode === 'picked' && picked ? (
              <Text style={styles.rowSub}>
                {picked.latitude.toFixed(4)}, {picked.longitude.toFixed(4)}
              </Text>
            ) : null}
          </View>
          <Feather
            name={mapExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={palette.inkMuted}
          />
        </Pressable>

        {mapExpanded && (
          <View style={styles.mapBox}>
            <LeafletMap
              center={picked ?? current ?? TUEBINGEN_CENTER}
              picked={picked}
              user={current}
              onMapTap={point => setPicked(point)}
              style={styles.map}
            />
            <Text style={styles.mapHint}>Tap the map to drop a pin</Text>
          </View>
        )}

        {/* Save current selection */}
        {saveName === null ? (
          <Pressable
            onPress={() => setSaveName('')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.saveTrigger, pressed && styles.pressed]}
          >
            <Feather name="plus" size={14} color={palette.tangerineDark} />
            <Text style={styles.saveTriggerText}>Save current selection…</Text>
          </Pressable>
        ) : (
          <View style={styles.saveRow}>
            <TextInput
              value={saveName}
              onChangeText={setSaveName}
              placeholder="Name it — Home, Work…"
              placeholderTextColor={palette.inkFaint}
              style={styles.saveInput}
              autoFocus
              onSubmitEditing={handleSave}
              returnKeyType="done"
            />
            <Pressable
              onPress={handleSave}
              accessibilityRole="button"
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          </View>
        )}

        {/* Saved places */}
        {savedLocations.length > 0 && (
          <View style={styles.savedSection}>
            <Text style={styles.savedHeading}>Saved places</Text>
            {savedLocations.map(saved => (
              <Pressable
                key={saved.id}
                onPress={() => {
                  selectSaved(saved.id);
                  close();
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.rowIcon}>
                  <Feather
                    name={/home/i.test(saved.name) ? 'home' : /work|office|büro/i.test(saved.name) ? 'briefcase' : 'bookmark'}
                    size={16}
                    color={palette.tangerineDark}
                  />
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{saved.name}</Text>
                </View>
                {mode === 'saved' && activeSavedId === saved.id && (
                  <Feather name="check" size={18} color={palette.tangerineDark} />
                )}
                <Pressable
                  onPress={() => removeSaved(saved.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${saved.name}`}
                  hitSlop={8}
                  style={({ pressed }) => [styles.trash, pressed && styles.pressed]}
                >
                  <Feather name="trash-2" size={15} color={palette.inkFaint} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...type.title,
    color: palette.ink,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceAlt,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: palette.tangerineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    ...type.body,
    color: palette.ink,
  },
  rowSub: {
    ...type.caption,
    color: palette.inkFaint,
  },
  mapBox: {
    gap: spacing.xs,
  },
  map: {
    height: 280,
    borderRadius: radii.lg,
  },
  mapHint: {
    ...type.caption,
    color: palette.inkFaint,
    textAlign: 'center',
  },
  saveTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  saveTriggerText: {
    ...type.label,
    color: palette.tangerineDark,
  },
  saveRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  saveInput: {
    ...type.body,
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    color: palette.ink,
    backgroundColor: palette.surface,
  },
  saveButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: palette.tangerine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    ...type.label,
    color: palette.surface,
  },
  savedSection: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  savedHeading: {
    ...type.caption,
    color: palette.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  trash: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
