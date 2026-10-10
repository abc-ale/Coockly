// components/Estrellas.tsx
// 5 estrellitas: doradas las que se ganan, grises las que faltan (sin vistas encimadas, para que siempre se vean).
import React from 'react';
import { Text } from 'react-native';

const DORADO = '#F5A300';
const GRIS = '#D3BDC2';

export default function Estrellas({ valor, tamano = 13 }: { valor: number; tamano?: number; gap?: number }) {
  const llenas = Math.round(Math.max(0, Math.min(5, Number(valor) || 0)));
  return (
    <Text allowFontScaling={false} style={{ fontSize: tamano + 2, lineHeight: tamano + 6, letterSpacing: 1 }}>
      <Text style={{ color: DORADO }}>{'★'.repeat(llenas)}</Text>
      <Text style={{ color: GRIS }}>{'★'.repeat(5 - llenas)}</Text>
    </Text>
  );
}