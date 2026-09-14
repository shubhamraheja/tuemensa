import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { resolveApiUrl } from '../lib/api';
import { getOpenStatus } from '../lib/hours';
import { formatType } from '../lib/format';
import { PlaceWithDistance } from '../types';
import { palette, radii, spacing, type } from '../theme/theme';
import OpenDot from './OpenDot';

interface Props {
  place: PlaceWithDistance;
  onPress: () => void;
}

/** Deliberately minimal row: dot · name · type · distance. Details live in the sheet. */
function PlaceRow({ place, onPress }: Props) {
  const status = getOpenStatus(place.opening_hours);
  const photoUrl = resolveApiUrl(place.photo_url);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${place.name}, ${formatType(place)}, ${place.distance_text ?? ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
      ) : (
        <OpenDot state={status.state} />
      )}
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {place.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatType(place)}
        </Text>
      </View>
      <Text style={styles.distance}>{place.distance_text ?? '—'}</Text>
    </Pressable>
  );
}

export default React.memo(PlaceRow);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  pressed: {
    opacity: 0.75,
  },
  main: {
    flex: 1,
    gap: 2,
  },
  photo: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceAlt,
  },
  name: {
    ...type.body,
    fontFamily: 'Inter_500Medium',
    color: palette.ink,
  },
  meta: {
    ...type.caption,
    color: palette.inkFaint,
  },
  distance: {
    ...type.label,
    color: palette.inkMuted,
  },
});
