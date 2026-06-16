// App.tsx

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import TabNavigator from './src/navigation/TabNavigator';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import ChatScreen from './src/screens/ChatScreen';

import { signInAnonymously, getSession } from './src/services/auth';
import { useStore } from './src/store';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const { setLoggedIn } = useStore();

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    try {
      const session = await getSession();
      if (session) {
        setLoggedIn(!session.user.is_anonymous, session.user.email || undefined);
      } else {
        await signInAnonymously();
      }
    } catch (err) {
      console.warn('Auth init error:', err);
    } finally {
      setIsReady(true);
      setTimeout(() => setShowSplash(false), 1800);
    }
  }

  if (showSplash || !isReady) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}