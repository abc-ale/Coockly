// components/ImagenReceta.tsx
// Foto de receta que no "salta": mientras llega se ve un fondo rosado con el cubierto,
// y al cargar aparece con un fundido suave. Si falla, se queda el fondo (nunca un cuadro blanco).
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

// Pide a Cloudinary una versión más liviana de la foto (ancho máximo y calidad 80), así carga más rápido.
// Si la dirección no es de Cloudinary, o ya trae transformaciones, se usa tal cual.
export function optimizarImagen(url?: string | null, ancho = 600): string | undefined {
  if (!url) return undefined;
  if (!url.includes('res.cloudinary.com') || !/\/upload\/v\d+\//.test(url)) return url;
  return url.replace('/upload/', `/upload/w_${ancho},q_80/`);
}

// Fotos que ya se mostraron: al volver a verlas aparecen de golpe, sin fundido ni parpadeo.
const yaCargadas = new Set<string>();

// Descarga las fotos por adelantado para que al mostrarse ya estén en memoria.
export function precargarImagenes(urls: (string | null | undefined)[], ancho = 500) {
  urls.forEach((u) => {
    const url = optimizarImagen(u, ancho);
    if (url) Image.prefetch(url).catch(() => {});
  });
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
  const url = optimizarImagen(uri, ancho);
  const aparece = useRef(new Animated.Value(url && yaCargadas.has(url) ? 1 : 0)).current;
  const [fallo, setFallo] = useState(false);

  // Si la misma tarjeta recibe otra foto, se parte de cero (o ya visible si esa foto ya se vio).
  useEffect(() => {
    setFallo(false);
    aparece.setValue(url && yaCargadas.has(url) ? 1 : 0);
  }, [url, aparece]);

  return (
    <View style={[st.caja, style]}>
      {/* El cubierto solo aparece si no hay foto o si falló; mientras carga se ve el fondo liso. */}
      {!url || fallo ? (
        <View style={st.centro}>
          <Ionicons name="restaurant-outline" size={tamanoIcono} color={colors.primary} style={{ opacity: 0.55 }} />
        </View>
      ) : null}
      {url && !fallo ? (
        <Animated.Image
          source={{ uri: url }}
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, { opacity: aparece }]}
          resizeMode="cover"
          onLoad={() => {
            yaCargadas.add(url);
            Animated.timing(aparece, { toValue: 1, duration: 160, useNativeDriver: true }).start();
          }}
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