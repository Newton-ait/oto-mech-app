// src/components/RobotAvatar.tsx
// Shared robot avatar — the orange-eyed robot head (ai-avatar.png)

import React from 'react';
import { Image, StyleSheet, ImageStyle } from 'react-native';

interface Props {
  size?: number;
  style?: ImageStyle;
}

const AI_AVATAR = require('../../assets/ai-avatar.png');

export default function RobotAvatar({ size = 32, style }: Props) {
  return (
    <Image
      source={AI_AVATAR}
      style={[
        s.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
      resizeMode="cover"
    />
  );
}

const s = StyleSheet.create({
  avatar: {
    borderWidth: 1.5,
    borderColor: '#ff6b00',
  },
});
