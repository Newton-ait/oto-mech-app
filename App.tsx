// App.tsx — root entry point

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import crashlytics from '@react-native-firebase/crashlytics';

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
    crashlytics().log('App started');
    initApp();
  }, []);

  async function initApp() {
    try {
      // Check existing session
      const session = await getSession();
      if (session) {
        setLoggedIn(!session.user.is_anonymous, session.user.email || undefined);
      } else {
        // Auto sign in anonymously
        await signInAnonymously();
      }
    } catch (err) {
      crashlytics().recordError(err as Error);
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
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
