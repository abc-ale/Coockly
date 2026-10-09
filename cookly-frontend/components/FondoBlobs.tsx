import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

type Props = { variante?: 'bienvenida' | 'login' };

export default function FondoBlobs({ variante = 'bienvenida' }: Props) {
  const grande = variante === 'bienvenida';
  const tam = grande ? 280 : 210;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={require('../assets/images/decor-blob.png')}
        style={{ position: 'absolute', top: -10, left: -10, width: tam, height: tam }}
        resizeMode="contain"
      />
      <Image
        source={require('../assets/images/decor-blob.png')}
        style={{
          position: 'absolute', bottom: -10, right: -10, width: tam, height: tam,
          transform: [{ rotate: '180deg' }],
        }}
        resizeMode="contain"
      />
    </View>
  );
}