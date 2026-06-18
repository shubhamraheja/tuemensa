import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import MenusScreen from '@/screens/MenusScreen';
import LocationsScreen from '@/screens/LocationsScreen';

export type MainTabParamList = {
  Menus: undefined;
  Locations: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Menus" component={MenusScreen} />
        <Tab.Screen name="Locations" component={LocationsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
