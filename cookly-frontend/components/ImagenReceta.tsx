// components/ImagenReceta.tsx
// Foto de receta que no "salta": mientras llega se ve un fondo rosado con el cubierto,
// y al cargar aparece con un fundido suave. Si falla, se queda el fondo (nunca un cuadro blanco).
import React, { useRef, useState } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

// Pide a Cloudinary una versión más liviana de la foto (ancho máximo y calidad 80), así carga más rápido.
// Si la dirección no es de Cloudinary, o ya trae transformaciones, se usa tal cual.
export function optimizarImagen(url?: string | null, ancho = 600): string | undefined {
  if (!url) return undefined;
  if (!url.includes('res.cloudinary.com') || !/\/upload\/v\d+\//.test(url)) return url;
  return url.replace('/upload/', `/upload/w_${ancho},q_80/`);
}

type Props = {
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  /** Ancho que se pide a Cloudinary (en píxeles). */
  ancho?: number;
  tamanoIcono?: number;
  children?: React.ReactNode;
};

export default function ImagenReceta({ uri, style, ancho = 600, tamanoIcono = 34, children }: Props) {
  const aparece = useRef(new Animated.Value(0)).current;
  const [fallo, setFallo] = useState(false);
  const url = optimizarImagen(uri, ancho);

  return (
    <View style={[st.caja, style]}>
      <View style={st.centro}>
        <Ionicons name="restaurant-outline" size={tamanoIcono} color={colors.primary} style={{ opacity: 0.55 }} />
      </View>
      {url && !fallo ? (
        <Animated.Image
          source={{ uri: url }}
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, { opacity: aparece }]}
          resizeMode="cover"
          onLoad={() => Animated.timing(aparece, { toValue: 1, duration: 320, useNativeDriver: true }).start()}
          onError={() => setFallo(true)}
        />
      ) : null}
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  caja: { overflow: 'hidden', backgroundColor: colors.primaryLight },
  centro: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});