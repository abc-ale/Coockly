// components/Stars.tsx
import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

type Props = {
  value: number; // 0 a 5, puede tener decimales si solo se muestra (sin onChange)
  size?: number;
  onChange?: (nuevoValor: number) => void; // si se pasa, las estrellas se pueden tocar
};

export default function Stars({ value, size = 18, onChange }: Props) {
  const estrellas = [1, 2, 3, 4, 5];

  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {estrellas.map((n) => {
        const llena = value >= n;
        const Contenedor = onChange ? Pressable : View;
        return (
          <Contenedor key={n} onPress={onChange ? () => onChange(n) : undefined} hitSlop={6}>
            <Ionicons
              name={llena ? 'star' : 'star-outline'}
              size={size}
              color={llena ? colors.warning : colors.textMuted}
            />
          </Contenedor>
        );
      })}
    </View>
  );
}
