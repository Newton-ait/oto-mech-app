// src/screens/SplashScreen.tsx
// Uses helmet image (assets/icon.png) as the hero visual

import React, { useEffect, useRef } from 'react';
import {
  View, Text, Animated, StyleSheet, Image,
} from 'react-native';

const APP_ICON = require('../../assets/icon.png');

export default function SplashScreen() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(20)).current;
  const iconScale = useRef(new Animated.Value(0.85)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo + icon entrance
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(logoY, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(iconOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    // Pulse rings
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();

    pulse(ring1, 200);
    pulse(ring2, 700);
  }, []);

  const ringStyle = (anim: Animated.Value, size: number) => ({
    position: 'absolute' as const,
    width: size, height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: '#ff6b00',
    opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.2, 0] }),
    transform: [{
      scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.2] }),
    }],
  });

  return (
    <View style={s.container}>
      {/* Background glow */}
      <View style={s.glow} />

      {/* Logo text */}
      <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ translateY: logoY }] }]}>
        <Text style={s.logoText}>
          <Text style={s.logoOto}>OTO</Text>
          <Text style={s.logoMech}>-MECH</Text>
        </Text>
        <Text style={s.tagline}>SOUND-FIRST CAR DIAGNOSIS</Text>
      </Animated.View>

      {/* Helmet hero with pulse rings */}
      <View style={s.heroWrap}>
        <Animated.View style={ringStyle(ring1, 180)} />
        <Animated.View style={ringStyle(ring2, 220)} />
        <Animated.Image
          source={APP_ICON}
          style={[
            s.heroIcon,
            { opacity: iconOpacity, transform: [{ scale: iconScale }] },
          ]}
          resizeMode="contain"
        />
      </View>

      {/* Tagline copy */}
      <Animated.Text style={[s.heroText, { opacity: logoOpacity }]}>
        Tap record. Hold near car.{'\n'}Get diagnosis in 3 seconds.
      </Animated.Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0d0f14',
    alignItems: 'center', justifyContent: 'center', gap: 32,
  },
  glow: {
    position: 'absolute', top: 80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(255,107,0,0.07)',
  },
  logoWrap: { alignItems: 'center', gap: 6 },
  logoText: { fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  logoOto: { color: '#ff6b00' },
  logoMech: { color: '#ffffff' },
  tagline: {
    color: '#3d4558', fontSize: 10,
    letterSpacing: 3, fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroWrap: {
    width: 220, height: 220,
    alignItems: 'center', justifyContent: 'center',
  },
  heroIcon: {
    width: 160, height: 160, zIndex: 2,
  },
  heroText: {
    color: '#5b6880', fontSize: 16,
    textAlign: 'center', lineHeight: 26,
  },
});
