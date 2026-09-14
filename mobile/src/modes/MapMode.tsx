import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import LeafletMap from '../components/LeafletMap';
import { MapPin } from '../lib/leafletHtml';
import { effectiveCoords, useLocationStore } from '../stores/useLocationStore';
import { useUiStore } from '../stores/useUiStore';
import { LatLng, PlaceWithDistance } from '../types';
import { palette, radii, shadow, spacing } from '../theme/theme';

interface Props {
  places: PlaceWithDistance[];
}

/** Full-bleed browse map; pin tap opens the shared detail sheet. */
export default function MapMode({ places }: Props) {
  const selectPlace = useUiStore(state => state.selectPlace);
  const selectedPlaceId = useUiStore(state => state.selectedPlaceId);
  const coords = useLocationStore(useShallow(effectiveCoords));
  const current = useLocationStore(state => state.current);
  const [center, setCenter] = useState<LatLng>(coords);

  const pins = useMemo<MapPin[]>(
    () =>
      places
        .filter(place => place.latitude != null && place.longitude != null)
        .map(place => ({
          id: place.id,
          lat: place.latitude!,
          lng: place.longitude!,
          selected: place.id === selectedPlaceId,
        })),
    [places, selectedPlaceId],
  );

  return (
    <View style={styles.host}>
      <LeafletMap
        center={center}
        zoom={15}
        pins={pins}
        user={current}
        onPinTap={id => selectPlace(id)}
        style={styles.map}
      />
      <Pressable
        onPress={() => setCenter({ ...coords })}
        accessibilityRole="button"
        accessibilityLabel="Recenter map"
        style={({ pressed }) => [styles.fab, shadow.card, pressed && styles.pressed]}
      >
        <Feather name="crosshair" size={18} color={palette.tangerineDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  pressed: {
    opacity: 0.8,
  },
});
