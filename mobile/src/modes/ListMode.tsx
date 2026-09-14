import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import PlaceRow from '../components/PlaceRow';
import { effectiveCoords, useLocationStore } from '../stores/useLocationStore';
import { usePlacesStore } from '../stores/usePlacesStore';
import { useUiStore } from '../stores/useUiStore';
import { PlaceWithDistance } from '../types';
import { palette, spacing, type } from '../theme/theme';

interface Props {
  places: PlaceWithDistance[];
}

/** Static placeholder rows shown on first load. */
function SkeletonRows() {
  return (
    <View style={styles.skeletonHost}>
      {Array.from({ length: 7 }, (_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonDot} />
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonLine, { width: `${55 + (index % 3) * 12}%` }]} />
            <View style={[styles.skeletonLine, styles.skeletonLineThin]} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Nearest-first minimal list. Row tap opens the detail sheet. */
export default function ListMode({ places }: Props) {
  const loading = usePlacesStore(state => state.loading);
  const fetchFor = usePlacesStore(state => state.fetchFor);
  const selectPlace = useUiStore(state => state.selectPlace);
  const coords = useLocationStore(useShallow(effectiveCoords));

  if (loading && places.length === 0) {
    return <SkeletonRows />;
  }

  return (
    <FlatList
      data={places}
      keyExtractor={place => String(place.id)}
      renderItem={({ item }) => (
        <PlaceRow place={item} onPress={() => selectPlace(item.id)} />
      )}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={Separator}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => void fetchFor(coords, true)}
          tintColor={palette.tangerine}
          colors={[palette.tangerine]}
        />
      }
      ListEmptyComponent={
        loading ? null : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No places match this filter.</Text>
          </View>
        )
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120, // clears the floating dock
    flexGrow: 1,
  },
  separator: {
    height: spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xxxl * 2,
  },
  emptyText: {
    ...type.body,
    color: palette.inkFaint,
  },
  skeletonHost: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  skeletonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.surfaceAlt,
  },
  skeletonLines: {
    flex: 1,
    gap: 6,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.surfaceAlt,
  },
  skeletonLineThin: {
    height: 8,
    width: '30%',
  },
});
