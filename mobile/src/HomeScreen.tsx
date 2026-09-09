import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import Header from './components/Header';
import LocationSheet from './components/LocationSheet';
import PillDock from './components/PillDock';
import PlaceDetailSheet from './components/PlaceDetailSheet';
import ProfileSheet from './components/ProfileSheet';
import CuisineFilterChips from './components/CuisineFilterChips';
import TypeFilterChips from './components/TypeFilterChips';
import CardsMode from './modes/CardsMode';
import ListMode from './modes/ListMode';
import MapMode from './modes/MapMode';
import SwipeMode from './modes/SwipeMode';
import { effectiveCoords, useLocationStore } from './stores/useLocationStore';
import { usePlacesStore } from './stores/usePlacesStore';
import { useProfileStore } from './stores/useProfileStore';
import { TYPE_FILTER_SETS, useUiStore } from './stores/useUiStore';
import { palette, spacing, type } from './theme/theme';

export default function HomeScreen() {
  const displayMode = useUiStore(state => state.displayMode);
  const typeFilter = useUiStore(state => state.typeFilter);
  const cuisineFilter = useUiStore(state => state.cuisineFilter);
  const diet = useProfileStore(state => state.diet);
  const places = usePlacesStore(state => state.places);
  const error = usePlacesStore(state => state.error);
  const fetchFor = usePlacesStore(state => state.fetchFor);
  const coords = useLocationStore(useShallow(effectiveCoords));

  // Resolve the device position once on launch (lazy permission prompt).
  useEffect(() => {
    void useLocationStore.getState().refreshCurrent();
  }, []);

  // Refetch whenever location, cuisine filter, or diet profile changes.
  useEffect(() => {
    void fetchFor(coords, true, cuisineFilter, diet);
  }, [coords, fetchFor, cuisineFilter, diet]);

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return places;
    const matching = TYPE_FILTER_SETS[typeFilter];
    return places.filter(
      place => place.place_type != null && matching.includes(place.place_type),
    );
  }, [places, typeFilter]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Header />
      {/* The type filter applies to place views; the swipe deck curates dishes. */}
      {displayMode !== 'swipe' && <TypeFilterChips />}
      {displayMode !== 'swipe' && <CuisineFilterChips />}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        {displayMode === 'list' && <ListMode places={filtered} />}
        {displayMode === 'swipe' && <SwipeMode />}
        {displayMode === 'cards' && <CardsMode places={filtered} />}
        {displayMode === 'map' && <MapMode places={filtered} />}
      </View>

      <PillDock />
      <PlaceDetailSheet />
      <LocationSheet />
      <ProfileSheet />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  body: {
    flex: 1,
  },
  errorBanner: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: '#FDECEC',
  },
  errorText: {
    ...type.caption,
    color: palette.closed,
  },
});
