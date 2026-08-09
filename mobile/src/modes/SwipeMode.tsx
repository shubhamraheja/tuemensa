import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import Chip from '../components/Chip';
import DishCard from '../components/DishCard';
import SwipeDeck, { SwipeDirection } from '../components/SwipeDeck';
import Sheet from '../components/Sheet';
import { itemPassesProfile } from '../lib/allergens';
import { formatDishPrice } from '../lib/format';
import { isAvailableToday } from '../lib/hours';
import { isServedToday, todayLabel } from '../lib/menu';
import { useProfileStore } from '../stores/useProfileStore';
import { usePlacesStore } from '../stores/usePlacesStore';
import { dishKey, useShortlistStore } from '../stores/useShortlistStore';
import { RadiusKm, useUiStore } from '../stores/useUiStore';
import { MenuItem, PlaceWithDistance } from '../types';
import { palette, radii, spacing, type } from '../theme/theme';

const RADII: RadiusKm[] = [0.5, 1, 2.5, 5];

const radiusLabel = (radius: RadiusKm) => (radius < 1 ? `${radius * 1000} m` : `${radius} km`);

/** Tiny pure PRNG so the deck order is shuffled but render-stable. */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DeckCard {
  key: string;
  dish: MenuItem;
  place: PlaceWithDistance;
}

/** Tinder mode: today's dishes from nearby mensas that fit your profile. */
export default function SwipeMode() {
  const places = usePlacesStore(state => state.places);
  const radiusKm = useUiStore(state => state.radiusKm);
  const setRadiusKm = useUiStore(state => state.setRadiusKm);
  const openTodayOnly = useUiStore(state => state.openTodayOnly);
  const setOpenTodayOnly = useUiStore(state => state.setOpenTodayOnly);
  const profile = useProfileStore(
    useShallow(state => ({ diet: state.diet, excludedAllergens: state.excludedAllergens })),
  );
  const entries = useShortlistStore(state => state.entries);
  const addEntry = useShortlistStore(state => state.add);
  const removeLast = useShortlistStore(state => state.removeLast);
  const clearShortlist = useShortlistStore(state => state.clear);
  const removeAt = useShortlistStore(state => state.removeAt);
  const addSkip = useShortlistStore(state => state.addSkip);
  const removeSkip = useShortlistStore(state => state.removeSkip);

  const [deckState, setDeckState] = useState<{
    deck: DeckCard[];
    index: number;
    lastAction: SwipeDirection | null;
  }>({ deck: [], index: 0, lastAction: null });
  // Bumped on "start over" to force a deck rebuild (saved dishes re-enter the pool).
  const [round, setRound] = useState(0);
  const [shortlistOpen, setShortlistOpen] = useState(false);

  // Shortlist is a per-day thing.
  useEffect(() => {
    useShortlistStore.getState().ensureFresh(new Date().toISOString().slice(0, 10));
  }, []);

  const deck = useMemo<DeckCard[]>(() => {
    const today = todayLabel();
    // Snapshot (not a subscription): dishes already decided today — saved OR
    // skipped — never re-enter the pool when the deck rebuilds (e.g. after a
    // radius change). Snapshotting means decisions during a run don't trigger
    // a rebuild that would reset progress.
    const shortlist = useShortlistStore.getState();
    const decidedKeys = new Set([
      ...shortlist.entries.map(entry => dishKey(entry.placeId, entry.dish.name)),
      ...shortlist.skipped,
    ]);
    const withMenus = places.filter(
      place =>
        place.menu.length > 0 &&
        place.distance_meters != null &&
        (!openTodayOnly || isAvailableToday(place.opening_hours)),
    );
    // The radius is a hard limit — no "nearest anyway" fallback. An empty deck
    // shows the explanatory empty state instead.
    const sources = withMenus.filter(place => place.distance_meters! <= radiusKm * 1000);

    const cards = sources.flatMap(place =>
      place.menu
        .filter(
          dish =>
            isServedToday(dish, today) &&
            itemPassesProfile(dish, profile) &&
            !decidedKeys.has(dishKey(place.id, dish.name)),
        )
        .map((dish, dishIndex) => ({
          key: `${place.id}-${dishIndex}`,
          dish,
          place,
        })),
    );
    // Shuffle so the deck mixes places and categories. Seeded (pure): stable
    // within a run, different per day/round/radius; "start over" reshuffles.
    const rand = mulberry32(hashSeed(`${today}:${round}:${radiusKm}:${cards.length}`));
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }, [places, radiusKm, profile, openTodayOnly, round]);

  // New deck → start from the top (render-phase adjustment, not an effect).
  if (deckState.deck !== deck) {
    setDeckState({ deck, index: 0, lastAction: null });
  }
  const { index, lastAction } = deckState.deck === deck ? deckState : { index: 0, lastAction: null };

  const handleSwipe = (card: DeckCard, direction: SwipeDirection) => {
    if (direction === 'like') {
      addEntry({
        placeId: card.place.id,
        placeName: card.place.name,
        distanceText: card.place.distance_text,
        dish: card.dish,
      });
    } else {
      addSkip(dishKey(card.place.id, card.dish.name)); // skips persist too
    }
    setDeckState(state => ({ ...state, index: state.index + 1, lastAction: direction }));
  };

  const handleUndo = () => {
    if (index === 0 || !lastAction) return;
    const undone = deck[index - 1];
    if (lastAction === 'like') removeLast();
    else if (undone) removeSkip(dishKey(undone.place.id, undone.dish.name));
    setDeckState(state => ({ ...state, index: state.index - 1, lastAction: null }));
  };

  const done = index >= deck.length;

  return (
    <View style={styles.host}>
      <View style={styles.toolbar}>
        <View style={styles.radiusRow}>
          {RADII.map(radius => (
            <Chip
              key={radius}
              label={radiusLabel(radius)}
              small
              active={radiusKm === radius}
              onPress={() => setRadiusKm(radius)}
            />
          ))}
        </View>
        {!done && deck.length > 0 && (
          <Text style={styles.progress}>
            {index + 1} / {deck.length}
          </Text>
        )}
      </View>

      <View style={styles.toggleRow}>
        <Chip
          label={openTodayOnly ? '⏰ Open today' : '⏰ Ignoring hours'}
          small
          active={openTodayOnly}
          onPress={() => setOpenTodayOnly(!openTodayOnly)}
        />
      </View>

      {deck.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No dishes today</Text>
          <Text style={styles.emptyText}>
            No menu-bearing places within {radiusKm} km match your profile
            {openTodayOnly ? ' and are still open today' : ''}. Try a wider radius
            {openTodayOnly ? ', turn off "Open today",' : ''} or relax the profile.
          </Text>
        </View>
      ) : done ? (
        <ScrollView contentContainerStyle={styles.recap} showsVerticalScrollIndicator={false}>
          <Text style={styles.recapTitle}>
            {entries.length > 0 ? 'Your shortlist' : 'That was all of them'}
          </Text>
          {entries.length === 0 && (
            <Text style={styles.emptyText}>Nothing caught your eye — start over?</Text>
          )}
          {entries.map((entry, entryIndex) => (
            <View key={entryIndex} style={styles.recapRow}>
              <View style={styles.recapMain}>
                <Text style={styles.recapDish} numberOfLines={2}>
                  {entry.dish.name}
                </Text>
                <Text style={styles.recapMeta}>
                  {entry.placeName}
                  {entry.distanceText ? ` · ${entry.distanceText}` : ''}
                </Text>
              </View>
              {entry.dish.price != null && (
                <Text style={styles.recapPrice}>{formatDishPrice(entry.dish)}</Text>
              )}
            </View>
          ))}
          <Pressable
            onPress={() => {
              clearShortlist(); // fresh round — old choices don't carry over
              setRound(current => current + 1); // rebuild deck; index resets with it
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.restart, pressed && styles.pressed]}
          >
            <Feather name="rotate-ccw" size={14} color={palette.surface} />
            <Text style={styles.restartText}>Start over</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <>
          <View style={styles.deck}>
            <SwipeDeck
              cards={deck}
              index={index}
              renderCard={card => <DishCard dish={card.dish} place={card.place} />}
              onSwipe={handleSwipe}
            />
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={handleUndo}
              disabled={index === 0}
              accessibilityRole="button"
              accessibilityLabel="Undo last swipe"
              style={({ pressed }) => [
                styles.undo,
                index === 0 && styles.undoDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Feather name="rotate-ccw" size={14} color={palette.inkMuted} />
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
            {entries.length > 0 && (
              <Pressable
                onPress={() => setShortlistOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Show saved dishes"
                style={({ pressed }) => [styles.shortlistButton, pressed && styles.pressed]}
              >
                <Feather name="heart" size={12} color={palette.tangerineDark} />
                <Text style={styles.shortlistCount}>{entries.length} saved</Text>
                <Feather name="chevron-up" size={12} color={palette.tangerineDark} />
              </Pressable>
            )}
          </View>
        </>
      )}

      <Sheet open={shortlistOpen} onClose={() => setShortlistOpen(false)}>
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.recapTitle}>Saved today</Text>
          {entries.length === 0 && (
            <Text style={styles.emptyText}>Nothing saved yet — swipe right on a dish.</Text>
          )}
          {entries.map((entry, entryIndex) => (
            <View key={entryIndex} style={styles.recapRow}>
              <View style={styles.recapMain}>
                <Text style={styles.recapDish} numberOfLines={2}>
                  {entry.dish.name}
                </Text>
                <Text style={styles.recapMeta}>
                  {entry.placeName}
                  {entry.distanceText ? ` · ${entry.distanceText}` : ''}
                </Text>
              </View>
              {entry.dish.price != null && (
                <Text style={styles.recapPrice}>{formatDishPrice(entry.dish)}</Text>
              )}
              <Pressable
                onPress={() => removeAt(entryIndex)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${entry.dish.name}`}
                hitSlop={8}
                style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
              >
                <Feather name="x" size={15} color={palette.inkFaint} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  progress: {
    ...type.caption,
    color: palette.inkFaint,
  },
  deck: {
    flex: 1,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 108, // clears the floating dock
  },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceAlt,
  },
  undoDisabled: {
    opacity: 0.4,
  },
  undoText: {
    ...type.label,
    color: palette.inkMuted,
  },
  shortlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: palette.tangerineSoft,
  },
  shortlistCount: {
    ...type.label,
    color: palette.tangerineDark,
  },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  remove: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...type.title,
    color: palette.ink,
  },
  emptyText: {
    ...type.body,
    color: palette.inkFaint,
    textAlign: 'center',
  },
  recap: {
    gap: spacing.sm,
    paddingBottom: 120,
  },
  recapTitle: {
    ...type.title,
    color: palette.ink,
    marginBottom: spacing.xs,
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  recapMain: {
    flex: 1,
    gap: 2,
  },
  recapDish: {
    ...type.body,
    color: palette.ink,
  },
  recapMeta: {
    ...type.caption,
    color: palette.inkFaint,
  },
  recapPrice: {
    ...type.label,
    color: palette.tangerineDark,
  },
  restart: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    borderRadius: radii.pill,
    backgroundColor: palette.ink,
    marginTop: spacing.sm,
  },
  restartText: {
    ...type.label,
    color: palette.surface,
  },
  pressed: {
    opacity: 0.75,
  },
});
