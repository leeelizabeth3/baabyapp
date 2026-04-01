// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import CardMakerScreen from './src/screens/CardMakerScreen';
import AlbumScreen from './src/screens/AlbumScreen';
import GrowthScreen from './src/screens/GrowthScreen';
import PremiumScreen from './src/screens/PremiumScreen';
import CelebrationScreen from './src/screens/CelebrationScreen';

import { useFonts } from 'expo-font';
import { GamjaFlower_400Regular } from '@expo-google-fonts/gamja-flower';
import { CuteFont_400Regular } from '@expo-google-fonts/cute-font';
import { HiMelody_400Regular } from '@expo-google-fonts/hi-melody';
import { Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Gaegu_400Regular } from '@expo-google-fonts/gaegu';
import { Jua_400Regular } from '@expo-google-fonts/jua';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Tab = createBottomTabNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    GamjaFlower_400Regular,
    CuteFont_400Regular,
    HiMelody_400Regular,
    Nunito_700Bold,
    Gaegu_400Regular,
    Jua_400Regular,
  });

  React.useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#FFF8E0' }} />;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" backgroundColor="#FFE070" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopColor: '#F0E0A0',
              borderTopWidth: 1.5,
              paddingBottom: 6,
              paddingTop: 6,
              height: 64,
            },
            tabBarActiveTintColor: '#C87820',
            tabBarInactiveTintColor: '#A09070',
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
          }}
        >
          <Tab.Screen
            name="CardMaker"
            component={CardMakerScreen}
            options={{
              tabBarLabel: '카드 만들기',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>📸</Text>,
            }}
          />
          <Tab.Screen
            name="Album"
            component={AlbumScreen}
            options={{
              tabBarLabel: '앨범',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>📖</Text>,
            }}
          />
          <Tab.Screen
            name="Growth"
            component={GrowthScreen}
            options={{
              tabBarLabel: '성장 추적',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>📈</Text>,
            }}
          />
          <Tab.Screen
            name="Celebration"
            component={CelebrationScreen}
            options={{
              tabBarLabel: '기념일',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 22 }}>🎊</Text>,
            }}
          />
          <Tab.Screen
            name="Premium"
            component={PremiumScreen}
            options={{
              tabBarLabel: '프리미엄',
              tabBarIcon: () => <Text style={{ fontSize: 22 }}>✨</Text>,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
