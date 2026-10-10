// components/Estrellas.tsx
// 5 estrellitas que se llenan en rosado según el promedio (4.6 = cuatro llenas y la quinta casi llena).
import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '../constants/theme';

const ROSA = colors.primary; // rosado intenso de Cookly
const GRIS = '#E3CDD2';

export default function Estrellas({ valor, tamano = 13 }: { valor: number; tamano?: number; gap?: number }) {
  const v = Math.max(0, Math.min(5, Number(valor) || 0));
  const ancho = tamano + 3; // ancho de cada estrella
  const fila = (color: string) => (
    <View style={{ flexDirection: 'row' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Text
          key={i}
          allowFontScaling={false}
          style={{ width: ancho, textAlign: 'center', fontSize: tamano + 2, lineHeight: tamano + 6, color }}
        >
          ★
        </Text>
      ))}
    </View>
  );

  return (
    <View style={{ width: ancho * 5, height: tamano + 6 }}>
      {/* Fondo gris con las 5 estrellas */}
      <View style={{ position: 'absolute', top: 0, left: 0 }}>{fila(GRIS)}</View>
      {/* Relleno rosado: se recorta según el promedio */}
      <View style={{ position: 'absolute', top: 0, left: 0, width: v * ancho, overflow: 'hidden' }}>{fila(ROSA)}</View>
    </View>
  );
}