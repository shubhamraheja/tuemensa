import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {getNearbyFood} from '@/services/locationService';
import {MealType, NearbyFoodParams, Place, PriceTier} from '@/types';

const PRICE_LABELS: Record<PriceTier, string> = {
  '<5': '< €5',
  '5-10': '€5–10',
  '>10': '> €10',
};

const ALLERGEN_OPTIONS = ['Gluten', 'Nuts', 'Dairy', 'Eggs', 'Soy', 'Fish', 'Shellfish', 'Sesame'];

function formatDistance(m: number | null | undefined) {
  if (m == null) return '';
  return m < 1000 ? `${Math.round(m)} m away` : `${(m / 1000).toFixed(1)} km away`;
}

export default function LocationsScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(null);

  // Filters
  const [radius, setRadius] = useState(1200);
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [priceTier, setPriceTier] = useState<PriceTier | null>(null);
  const [veganOnly, setVeganOnly] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>([]);

  // Detail modal
  const [selected, setSelected] = useState<Place | null>(null);

  const search = useCallback(
    async (lat: number, lng: number, overrides?: Partial<NearbyFoodParams>) => {
      setLoading(true);
      setError(null);
      try {
        const params: NearbyFoodParams = {
          latitude: lat,
          longitude: lng,
          radius,
          meal_type: mealType,
          price_tier: priceTier,
          is_vegan_friendly: veganOnly ? true : null,
          is_vegetarian_friendly: vegOnly ? true : null,
          allergens_exclude: excludedAllergens.map(a => a.toLowerCase()),
          ...overrides,
        };
        const res = await getNearbyFood(params);
        setPlaces(res.places);
      } catch {
        setError('Could not load nearby food places.');
      } finally {
        setLoading(false);
      }
    },
    [radius, mealType, priceTier, veganOnly, vegOnly, excludedAllergens],
  );

  useEffect(() => {
    // React Native polyfills navigator.geolocation at runtime
    const geo = (navigator as unknown as {geolocation: {getCurrentPosition: (s: (p: {coords: {latitude: number; longitude: number}}) => void, e: () => void, o: object) => void}}).geolocation;
    geo.getCurrentPosition(
      pos => {
        const {latitude, longitude} = pos.coords;
        setCoords({lat: latitude, lng: longitude});
        void search(latitude, longitude);
      },
      () => {
        // Tübingen fallback
        setCoords({lat: 48.5216, lng: 9.0576});
        void search(48.5216, 9.0576);
      },
      {enableHighAccuracy: false, timeout: 8000, maximumAge: 0},
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reSearch = (overrides?: Partial<NearbyFoodParams>) => {
    if (coords) void search(coords.lat, coords.lng, overrides);
  };

  const toggleAllergen = (a: string) => {
    const next = excludedAllergens.includes(a)
      ? excludedAllergens.filter(x => x !== a)
      : [...excludedAllergens, a];
    setExcludedAllergens(next);
    reSearch({allergens_exclude: next.map(x => x.toLowerCase())});
  };

  return (
    <View style={styles.root}>
      {/* Filter bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterBarContent}>
        {/* Radius */}
        {([500, 1000, 1200, 2000] as number[]).map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.chip, radius === r && styles.chipActive]}
            onPress={() => {
              setRadius(r);
              reSearch({radius: r});
            }}
          >
            <Text style={[styles.chipText, radius === r && styles.chipTextActive]}>
              {r >= 1000 ? `${r / 1000} km` : `${r} m`}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        {/* Meal type */}
        {(['meal', 'snack'] as MealType[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, mealType === t && styles.chipActive]}
            onPress={() => {
              const next = mealType === t ? null : t;
              setMealType(next);
              reSearch({meal_type: next});
            }}
          >
            <Text style={[styles.chipText, mealType === t && styles.chipTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        {/* Price */}
        {(['<5', '5-10', '>10'] as PriceTier[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, priceTier === t && styles.chipActive]}
            onPress={() => {
              const next = priceTier === t ? null : t;
              setPriceTier(next);
              reSearch({price_tier: next});
            }}
          >
            <Text style={[styles.chipText, priceTier === t && styles.chipTextActive]}>
              {PRICE_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        {/* Dietary */}
        <TouchableOpacity
          style={[styles.chip, veganOnly && styles.chipVegan]}
          onPress={() => {
            const next = !veganOnly;
            setVeganOnly(next);
            reSearch({is_vegan_friendly: next ? true : null});
          }}
        >
          <Text style={[styles.chipText, veganOnly && styles.chipTextActive]}>Vegan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, vegOnly && styles.chipVegan]}
          onPress={() => {
            const next = !vegOnly;
            setVegOnly(next);
            reSearch({is_vegetarian_friendly: next ? true : null});
          }}
        >
          <Text style={[styles.chipText, vegOnly && styles.chipTextActive]}>Vegetarian</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Allergen row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.allergenBar} contentContainerStyle={styles.filterBarContent}>
        <Text style={styles.allergenLabel}>Exclude:</Text>
        {ALLERGEN_OPTIONS.map(a => (
          <TouchableOpacity
            key={a}
            style={[styles.chip, excludedAllergens.includes(a) && styles.chipAllergen]}
            onPress={() => toggleAllergen(a)}
          >
            <Text style={[styles.chipText, excludedAllergens.includes(a) && styles.chipTextActive]}>
              {a}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No places found. Try adjusting filters.</Text>}
          renderItem={({item}) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.badges}>
                  {item.meal_type && (
                    <View style={styles.badgeMeal}>
                      <Text style={styles.badgeText}>{item.meal_type}</Text>
                    </View>
                  )}
                  {item.price_tier && (
                    <View style={styles.badgePrice}>
                      <Text style={styles.badgeText}>{PRICE_LABELS[item.price_tier]}</Text>
                    </View>
                  )}
                  {item.is_vegan_friendly && (
                    <View style={styles.badgeVegan}>
                      <Text style={styles.badgeText}>Vegan</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.meta}>
                {item.rating != null && <Text style={styles.metaText}>★ {item.rating.toFixed(1)}</Text>}
                {item.open_now === true && <Text style={[styles.metaText, styles.open]}>Open</Text>}
                {item.open_now === false && <Text style={[styles.metaText, styles.closed]}>Closed</Text>}
                {item.distance_m != null && <Text style={styles.metaText}>{formatDistance(item.distance_m)}</Text>}
              </View>
              {item.address && <Text style={styles.address}>{item.address}</Text>}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Detail modal */}
      <Modal visible={selected != null} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <ScrollView contentContainerStyle={styles.modal}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>

            <Text style={styles.modalName}>{selected.name}</Text>
            {selected.address && <Text style={styles.modalAddress}>{selected.address}</Text>}

            <View style={styles.badges}>
              {selected.meal_type && <View style={styles.badgeMeal}><Text style={styles.badgeText}>{selected.meal_type}</Text></View>}
              {selected.price_tier && <View style={styles.badgePrice}><Text style={styles.badgeText}>{PRICE_LABELS[selected.price_tier]}</Text></View>}
              {selected.is_vegan_friendly && <View style={styles.badgeVegan}><Text style={styles.badgeText}>Vegan-friendly</Text></View>}
              {selected.is_vegetarian_friendly && <View style={styles.badgeVegan}><Text style={styles.badgeText}>Vegetarian-friendly</Text></View>}
            </View>

            <View style={styles.detailGrid}>
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>Rating</Text>
                <Text style={styles.detailValue}>
                  {selected.rating != null ? `${selected.rating.toFixed(1)} (${selected.user_rating_count ?? 0})` : 'N/A'}
                </Text>
              </View>
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[styles.detailValue, selected.open_now ? styles.open : selected.open_now === false ? styles.closed : {}]}>
                  {selected.open_now == null ? 'Unknown' : selected.open_now ? 'Open now' : 'Closed'}
                </Text>
              </View>
              {selected.cuisine && (
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Cuisine</Text>
                  <Text style={styles.detailValue}>{selected.cuisine}</Text>
                </View>
              )}
              {selected.distance_m != null && (
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Distance</Text>
                  <Text style={styles.detailValue}>{formatDistance(selected.distance_m)}</Text>
                </View>
              )}
            </View>

            {selected.opening_hours.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Opening Hours</Text>
                {selected.opening_hours.map((h, i) => (
                  <Text key={i} style={styles.hoursText}>
                    {h.description ?? `${h.day}: ${h.open}–${h.close}`}
                  </Text>
                ))}
              </View>
            )}

            {selected.allergens && selected.allergens.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Allergens</Text>
                <View style={styles.allergenTags}>
                  {selected.allergens.map(a => (
                    <View key={a} style={styles.allergenTag}>
                      <Text style={styles.allergenTagText}>{a}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selected.menu.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Menu</Text>
                {selected.menu.map((item, i) => (
                  <View key={i} style={styles.menuRow}>
                    <Text style={styles.menuName}>{item.name}</Text>
                    {item.price != null && <Text style={styles.menuPrice}>€{item.price.toFixed(2)}</Text>}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.detailActions}>
              {selected.google_maps_uri && (
                <Pressable style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>Open in Maps</Text>
                </Pressable>
              )}
              {selected.website_uri && (
                <Pressable style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>Website</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}

const BLUE = '#2563eb';

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#f5f5f5'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  list: {padding: 12},
  emptyText: {textAlign: 'center', color: '#9ca3af', marginTop: 32, fontSize: 14},
  errorText: {color: '#dc2626', fontSize: 14},

  filterBar: {backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb', maxHeight: 52},
  allergenBar: {backgroundColor: '#fafafa', borderBottomWidth: 1, borderColor: '#e5e7eb', maxHeight: 46},
  filterBarContent: {paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row', alignItems: 'center'},
  allergenLabel: {fontSize: 12, color: '#6b7280', marginRight: 4, fontWeight: '600'},

  divider: {width: 1, height: 20, backgroundColor: '#e5e7eb', marginHorizontal: 4},

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  chipActive: {backgroundColor: BLUE, borderColor: BLUE},
  chipVegan: {backgroundColor: '#dcfce7', borderColor: '#16a34a'},
  chipAllergen: {backgroundColor: '#fee2e2', borderColor: '#dc2626'},
  chipText: {fontSize: 12, color: '#374151', fontWeight: '500'},
  chipTextActive: {color: '#fff'},

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
  },
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  name: {fontSize: 15, fontWeight: '700', color: '#111', flex: 1, marginRight: 8},
  badges: {flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end'},
  badgeMeal: {backgroundColor: '#dbeafe', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2},
  badgePrice: {backgroundColor: '#f3f4f6', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2},
  badgeVegan: {backgroundColor: '#dcfce7', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2},
  badgeText: {fontSize: 10, fontWeight: '700', textTransform: 'uppercase'},

  meta: {flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap'},
  metaText: {fontSize: 12, color: '#6b7280'},
  open: {color: '#16a34a', fontWeight: '600'},
  closed: {color: '#dc2626'},
  address: {fontSize: 12, color: '#9ca3af', marginTop: 4},

  // Modal
  modal: {padding: 20, paddingTop: 48},
  closeBtn: {marginBottom: 16},
  closeBtnText: {fontSize: 14, color: BLUE, fontWeight: '600'},
  modalName: {fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 4},
  modalAddress: {fontSize: 13, color: '#6b7280', marginBottom: 12},

  detailGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16},
  detailCell: {minWidth: '45%'},
  detailLabel: {fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: 0.5},
  detailValue: {fontSize: 14, color: '#111', marginTop: 2},

  section: {marginBottom: 16},
  sectionTitle: {fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: '#6b7280', letterSpacing: 0.5, marginBottom: 6},
  hoursText: {fontSize: 13, color: '#374151', marginBottom: 2},

  allergenTags: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  allergenTag: {backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4},
  allergenTagText: {fontSize: 12, color: '#991b1b', fontWeight: '500'},

  menuRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#f3f4f6'},
  menuName: {fontSize: 13, color: '#374151', flex: 1},
  menuPrice: {fontSize: 13, fontWeight: '600', color: '#111'},

  detailActions: {flexDirection: 'row', gap: 10, marginTop: 20},
  actionBtn: {flex: 1, padding: 12, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, alignItems: 'center'},
  actionBtnText: {fontSize: 14, color: BLUE, fontWeight: '600'},
});
