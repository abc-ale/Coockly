// components/PortadaBienvenida.tsx
// Imagen principal de la bienvenida: plato real (PNG sin fondo) inclinado, que se
// balancea suavemente, con insignias vectoriales que flotan a su alrededor.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

// Imagen del plato en Cloudinary. Se pide ya reducida y optimizada (w_800, f_auto, q_auto) para que cargue rápido.
// Si esa versión falla, se prueba con el enlace original.
const BASE = 'https://res.cloudinary.com/pjbmwoxn/image/upload';
const ID = 'v1791666314/Imagen-bienvenida.png';
const URL_OPTIMIZADA = `${BASE}/f_auto,q_auto,w_800/${ID}`;
const URL_ORIGINAL = `${BASE}/${ID}`;

/** Llámala lo antes posible (por ejemplo al abrir la app) para que el plato ya esté descargado al llegar a la bienvenida. */
export function precargarPlato() {
  Image.prefetch(URL_OPTIMIZADA).catch(() => {});
}

type Insig = { icono: keyof typeof Ionicons.glyphMap; fondo: string; color: string; x: number; y: number; fase: number };

const INSIGNIAS: Insig[] = [
  { icono: 'heart', fondo: colors.primary, color: colors.white, x: 0.77, y: 0.07, fase: 0 },
  { icono: 'timer-outline', fondo: colors.accent, color: colors.text, x: 0.8, y: 0.74, fase: 350 },
  { icono: 'leaf-outline', fondo: colors.magic, color: '#2F7A3C', x: 0.085, y: 0.77, fase: 700 },
];

function Insignia({ i, lado }: { i: Insig; lado: number }) {
  const flota = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(flota, { toValue: 1, duration: 1600, delay: i.fase, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flota, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    bucle.start();
    return () => bucle.stop();
  }, [flota, i.fase]);
  const d = lado * 0.145;
  return (
    <Animated.View
      style={[
        st.insignia,
        {
          left: lado * i.x,
          top: lado * i.y,
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: i.fondo,
          transform: [{ translateY: flota.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }],
        },
      ]}
    >
      <Ionicons name={i.icono} size={d * 0.48} color={i.color} />
    </Animated.View>
  );
}

export default function PortadaBienvenida({ ancho }: { ancho: number }) {
  const [uri, setUri] = useState(URL_OPTIMIZADA);
  const [fallo, setFallo] = useState(false);
  const aparece = useRef(new Animated.Value(0)).current;
  const alCargar = () => Animated.timing(aparece, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  const alFallar = () => {
    if (uri === URL_OPTIMIZADA) setUri(URL_ORIGINAL);
    else setFallo(true);
  };
  const balanceo = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // El plato se mece unos grados, como si respirara.
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(balanceo, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(balanceo, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    bucle.start();
    return () => bucle.stop();
  }, [balanceo]);

  return (
    <View style={{ width: ancho, height: ancho }}>
      {/* Mientras carga (o si falla) se ve un círculo suave en lugar de un espacio vacío */}
      <View
        style={{ position: 'absolute', left: ancho * 0.1, top: ancho * 0.1, width: ancho * 0.8, height: ancho * 0.8, borderRadius: ancho * 0.4, backgroundColor: colors.primaryLight, opacity: 0.55 }}
      />
      {!fallo && (
        <Animated.Image
          source={{ uri }}
          onLoad={alCargar}
          onError={alFallar}
          style={{
            width: ancho,
            height: ancho,
            opacity: aparece,
            transform: [{ rotate: balanceo.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '-6deg'] }) }],
          }}
          resizeMode="contain"
        />
      )}
      {INSIGNIAS.map((i) => (
        <Insignia key={i.icono} i={i} lado={ancho} />
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  insignia: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.background,
    shadowColor: colors.text,
    shadowOpacity: 0.14,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
});