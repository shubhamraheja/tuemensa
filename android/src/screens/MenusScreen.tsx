import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import apiClient from '@/services/apiClient';
import {Place} from '@/types';

export default function MenusScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{places: Place[]}>('/places/nearby-food', {
        params: {latitude: 48.5216, longitude: 9.0576, radius: 5000},
      })
      .then(res => {
        setPlaces(res.data.places.filter(p => p.menu && p.menu.length > 0));
      })
      .catch(() => setError('Could not load menus.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (places.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No menus available yet. Run the seed script to populate places.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={places}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.list}
      renderItem={({item}) => (
        <View style={styles.card}>
          <Text style={styles.placeName}>{item.name}</Text>
          {item.address && <Text style={styles.address}>{item.address}</Text>}
          {item.menu.map((menuItem, i) => (
            <View key={i} style={styles.menuRow}>
              <Text style={styles.menuName}>{menuItem.name}</Text>
              {menuItem.price != null && (
                <Text style={styles.menuPrice}>€{menuItem.price.toFixed(2)}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20},
  list: {padding: 12},
  emptyText: {textAlign: 'center', color: '#9ca3af', fontSize: 14, lineHeight: 22},
  errorText: {color: '#dc2626', fontSize: 14},
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
  },
  placeName: {fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 2},
  address: {fontSize: 12, color: '#9ca3af', marginBottom: 10},
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
  },
  menuName: {fontSize: 14, color: '#374151', flex: 1},
  menuPrice: {fontSize: 14, fontWeight: '600', color: '#111'},
});
