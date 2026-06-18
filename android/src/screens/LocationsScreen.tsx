import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {getLocations} from '@/services/locationService';
import {Location} from '@/types';

export default function LocationsScreen() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLocations()
      .then(res => setLocations(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={locations}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      renderItem={({item}) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.address}>{item.address}</Text>
          {item.openingHours.map((h, i) => (
            <Text key={i} style={styles.hours}>
              {h.day}: {h.open} – {h.close}
            </Text>
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  list: {padding: 16},
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  name: {fontSize: 18, fontWeight: 'bold'},
  address: {fontSize: 13, color: '#555', marginVertical: 4},
  hours: {fontSize: 12, color: '#777'},
});
