import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import GradientThumb from '../components/GradientThumb';
import OpenDot from '../components/OpenDot';
import { getOpenStatus } from '../lib/hours';
import { useUiStore } from '../stores/useUiStore';
import { PlaceWithDistance } from '../types';
import { palette, radii, shadow, spacing, type } from '../theme/theme';

interface Props {
  places: PlaceWithDistance[];
}

/** 2-column gallery — thumb, name, distance, open dot. Tap → detail sheet. */
export default function CardsMode({ places }: Props) {
  const selectPlace = useUiStore(state => state.selectPlace);

  return (
    <FlatList
      data={places}
      numColumns={2}
      keyExtractor={place => String(place.id)}
      columnWrapperStyle={styles.column}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const status = getOpenStatus(item.opening_hours);
        return (
          <Pressable
            onPress={() => selectPlace(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            style={({ pressed }) => [styles.card, shadow.card, pressed && styles.pressed]}
          >
            <GradientThumb name={item.name} seed={item.id} />
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.metaRow}>
                <OpenDot state={status.state} size={7} />
                <Text style={styles.meta}>{item.distance_text ?? '—'}</Text>
              </View>
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No places match this filter.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
    gap: spacing.md,
    flexGrow: 1,
  },
  column: {
    gap: spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.8,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: {
    ...type.label,
    color: palette.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  meta: {
    ...type.caption,
    color: palette.inkMuted,
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
});
