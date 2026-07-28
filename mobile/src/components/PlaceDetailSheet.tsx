import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { filterMenu } from '../lib/allergens';
import { resolveApiUrl } from '../lib/api';
import { formatDishPrice, formatPrice, formatRating, formatType } from '../lib/format';
import { getOpenStatus } from '../lib/hours';
import { groupByDay, isServedToday, todayLabel } from '../lib/menu';
import { useProfileStore } from '../stores/useProfileStore';
import { usePlacesStore } from '../stores/usePlacesStore';
import { useUiStore } from '../stores/useUiStore';
import { palette, radii, spacing, type } from '../theme/theme';
import Chip from './Chip';
import OpenDot from './OpenDot';
import Sheet from './Sheet';

const STATUS_COLOR = {
  open: palette.open,
  closed: palette.closed,
  unknown: palette.unknown,
} as const;

/** On-demand detail: status, price/rating, hours, today's menu, links. */
export default function PlaceDetailSheet() {
  const selectedPlaceId = useUiStore(state => state.selectedPlaceId);
  const selectPlace = useUiStore(state => state.selectPlace);
  const place = usePlacesStore(state =>
    state.places.find(p => p.id === selectedPlaceId),
  );
  const diet = useProfileStore(state => state.diet);
  const excludedAllergens = useProfileStore(state => state.excludedAllergens);

  const [showWeek, setShowWeek] = useState(false);
  const [showHours, setShowHours] = useState(false);

  const menu = useMemo(() => {
    if (!place) return { groups: [], hidden: 0 };
    const today = todayLabel();
    const scoped = showWeek
      ? place.menu
      : place.menu.filter(item => isServedToday(item, today));
    const { visible, hidden } = filterMenu(scoped, { diet, excludedAllergens });
    return { groups: groupByDay(visible), hidden };
  }, [place, showWeek, diet, excludedAllergens]);

  if (!place) {
    return <Sheet open={false} onClose={() => selectPlace(null)}>{null}</Sheet>;
  }

  const status = getOpenStatus(place.opening_hours);
  const price = formatPrice(place);
  const rating = formatRating(place);
  const photoUrl = resolveApiUrl(place.photo_url);
  const statusText =
    status.state === 'unknown'
      ? 'Hours unknown'
      : status.state === 'open'
        ? `Open · ${status.detail}`
        : `Closed · ${status.detail}`;

  return (
    <Sheet open onClose={() => selectPlace(null)}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {photoUrl ? (
          <>
            <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
            {(place.photo_attributions ?? []).length > 0 ? (
              <Text style={styles.photoAttribution}>
                Photo: {(place.photo_attributions ?? []).join(', ')}
              </Text>
            ) : null}
          </>
        ) : null}

        <Text style={styles.name}>{place.name}</Text>

        <View style={styles.tagRow}>
          <Chip label={formatType(place)} small />
          {place.cuisine ? <Chip label={place.cuisine} small /> : null}
          {price ? <Chip label={price} small /> : null}
          {rating ? <Chip label={`★ ${rating}`} small /> : null}
        </View>

        <View style={styles.statusRow}>
          <OpenDot state={status.state} />
          <Text style={[styles.statusText, { color: STATUS_COLOR[status.state] }]}>
            {statusText}
          </Text>
          {place.distance_text ? (
            <Text style={styles.statusDistance}>
              {place.distance_text}
              {place.duration_text ? ` · ${place.duration_text}` : ''}
            </Text>
          ) : null}
        </View>

        {place.address ? <Text style={styles.address}>{place.address}</Text> : null}

        {place.opening_hours.length > 0 && (
          <View style={styles.section}>
            <Pressable
              onPress={() => setShowHours(open => !open)}
              accessibilityRole="button"
              style={styles.sectionHeader}
            >
              <Text style={styles.sectionTitle}>Hours</Text>
              <Feather
                name={showHours ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={palette.inkMuted}
              />
            </Pressable>
            {showHours &&
              place.opening_hours.map((hours, index) => (
                <View key={index} style={styles.hoursRow}>
                  <Text style={styles.hoursDay}>{hours.day}</Text>
                  <Text style={styles.hoursTime}>
                    {hours.open}–{hours.close}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {place.menu.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{showWeek ? 'Menu · week' : 'Menu · today'}</Text>
              <Pressable onPress={() => setShowWeek(week => !week)} accessibilityRole="button">
                <Text style={styles.sectionAction}>
                  {showWeek ? 'Show today' : 'Show full week'}
                </Text>
              </Pressable>
            </View>

            {menu.groups.length === 0 ? (
              <Text style={styles.emptyMenu}>Nothing on the menu for today.</Text>
            ) : (
              menu.groups.map((group, groupIndex) => (
                <View key={groupIndex} style={styles.menuGroup}>
                  {group.day && showWeek ? (
                    <Text style={styles.menuDay}>{group.day}</Text>
                  ) : null}
                  {group.items.map((item, index) => (
                    <View key={index} style={styles.menuRow}>
                      <View style={styles.menuMain}>
                        <Text style={styles.menuName}>{item.name}</Text>
                        {item.category ? (
                          <Text style={styles.menuCategory}>{item.category}</Text>
                        ) : null}
                      </View>
                      {item.price != null ? (
                        <Text style={styles.menuPrice}>{formatDishPrice(item)}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))
            )}

            {menu.hidden > 0 && (
              <Text style={styles.hiddenNote}>
                {menu.hidden} {menu.hidden === 1 ? 'dish' : 'dishes'} hidden by your profile
              </Text>
            )}
          </View>
        )}

        <View style={styles.linkRow}>
          {place.google_maps_uri ? (
            <Pressable
              onPress={() => Linking.openURL(place.google_maps_uri!)}
              accessibilityRole="link"
              style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
            >
              <Feather name="map-pin" size={14} color={palette.surface} />
              <Text style={styles.linkText}>Maps</Text>
            </Pressable>
          ) : null}
          {place.website_uri ? (
            <Pressable
              onPress={() => Linking.openURL(place.website_uri!)}
              accessibilityRole="link"
              style={({ pressed }) => [styles.linkButton, styles.linkSecondary, pressed && styles.pressed]}
            >
              <Feather name="globe" size={14} color={palette.ink} />
              <Text style={[styles.linkText, styles.linkTextSecondary]}>Website</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  name: {
    ...type.display,
    color: palette.ink,
  },
  photo: {
    width: '100%',
    height: 190,
    borderRadius: radii.lg,
    backgroundColor: palette.surfaceAlt,
  },
  photoAttribution: {
    ...type.caption,
    color: palette.inkFaint,
    marginTop: -spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    ...type.label,
  },
  statusDistance: {
    ...type.label,
    color: palette.inkMuted,
    marginLeft: 'auto',
  },
  address: {
    ...type.caption,
    color: palette.inkFaint,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...type.label,
    color: palette.ink,
  },
  sectionAction: {
    ...type.caption,
    color: palette.tangerineDark,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hoursDay: {
    ...type.caption,
    color: palette.inkMuted,
  },
  hoursTime: {
    ...type.caption,
    color: palette.ink,
  },
  menuGroup: {
    gap: spacing.sm,
  },
  menuDay: {
    ...type.caption,
    color: palette.tangerineDark,
    marginTop: spacing.xs,
  },
  menuRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  menuMain: {
    flex: 1,
    gap: 1,
  },
  menuName: {
    ...type.body,
    color: palette.ink,
  },
  menuCategory: {
    ...type.caption,
    color: palette.inkFaint,
  },
  menuPrice: {
    ...type.label,
    color: palette.inkMuted,
  },
  emptyMenu: {
    ...type.caption,
    color: palette.inkFaint,
  },
  hiddenNote: {
    ...type.caption,
    color: palette.inkFaint,
    fontStyle: 'italic',
  },
  linkRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: palette.ink,
  },
  linkSecondary: {
    backgroundColor: palette.surfaceAlt,
  },
  linkText: {
    ...type.label,
    color: palette.surface,
  },
  linkTextSecondary: {
    color: palette.ink,
  },
  pressed: {
    opacity: 0.75,
  },
});
