// components/Degradado.tsx
// Fondo con degradado (expo-linear-gradient). Si el módulo nativo aún no está en tu APK,
// muestra el color sólido y la app sigue funcionando igual.
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

let LinearGradient: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch {
  LinearGradient = null;
}

type Props = {
  colores: [string, string];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export default function Degradado({ colores, style, children }: Props) {
  if (!LinearGradient) {
    return <View style={[style, { backgroundColor: colores[0] }]}>{children}</View>;
  }
  return (
    <LinearGradient colors={colores} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
      {children}
    </LinearGradient>
  );
}