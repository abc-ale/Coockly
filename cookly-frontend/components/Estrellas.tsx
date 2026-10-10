// components/Estrellas.tsx
// 5 estrellitas con borde rosado intenso; se rellenan de rosa según el promedio (4.6 = cuatro llenas y la quinta casi llena).
import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

const ROSA = colors.primary; // rosado intenso de Cookly

export default function Estrellas({ valor, tamano = 13 }: { valor: number; tamano?: number; gap?: number }) {
  const v = Math.max(0, Math.min(5, Number(valor) || 0));
  const ancho = tamano + 3; // ancho de cada estrella (con un poquito de espacio)
  const fila = (nombre: 'star' | 'star-outline') => (
    <View style={{ flexDirection: 'row' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={{ width: ancho, height: tamano + 2, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={nombre} size={tamano} color={ROSA} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={{ width: ancho * 5, height: tamano + 2 }}>
      {/* Borde rosado de las 5 estrellas (siempre visible, aunque no haya reseñas) */}
      <View style={{ position: 'absolute', top: 0, left: 0 }}>{fila('star-outline')}</View>
      {/* Relleno rosado: se recorta según el promedio */}
      {v > 0 && (
        <View style={{ position: 'absolute', top: 0, left: 0, width: v * ancho, height: tamano + 2, overflow: 'hidden' }}>
          {fila('star')}
        </View>
      )}
    </View>
  );
}