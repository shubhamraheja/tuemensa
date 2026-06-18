import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {getMenus} from '@/services/menuService';
import {Menu} from '@/types';

export default function MenusScreen() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    getMenus({date: today})
      .then(res => setMenus(res.data))
      .catch(() => setError('Failed to load menus'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={menus}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      renderItem={({item}) => (
        <View style={styles.card}>
          <Text style={styles.location}>{item.location}</Text>
          <Text style={styles.date}>{item.date}</Text>
          {item.items.map(menuItem => (
            <View key={menuItem.id} style={styles.menuItem}>
              <Text style={styles.itemName}>{menuItem.name}</Text>
              <Text style={styles.itemPrice}>€{menuItem.price.toFixed(2)}</Text>
            </View>
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
  location: {fontSize: 18, fontWeight: 'bold'},
  date: {fontSize: 12, color: '#666', marginBottom: 8},
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {fontSize: 14, flex: 1},
  itemPrice: {fontSize: 14, fontWeight: '600'},
  error: {color: 'red'},
});
