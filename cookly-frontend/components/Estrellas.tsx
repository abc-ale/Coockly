// components/Estrellas.tsx
// Fila de 5 estrellitas según el promedio (llenas, media o vacías).
import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

export default function Estrellas({ valor, tamano = 12, gap = 1 }: { valor: number; tamano?: number; gap?: number }) {
  const v = Math.max(0, Math.min(5, Number(valor) || 0));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const nombre = v >= n - 0.25 ? 'star' : v >= n - 0.75 ? 'star-half' : 'star-outline';
        return <Ionicons key={n} name={nombre} size={tamano} color={colors.warning} />;
      })}
    </View>
  );
}