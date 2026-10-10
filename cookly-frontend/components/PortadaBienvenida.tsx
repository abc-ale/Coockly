// components/PortadaBienvenida.tsx
// Imagen principal de la bienvenida: plato real (PNG sin fondo) inclinado, que se
// balancea suavemente, con insignias vectoriales que flotan a su alrededor.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

// 👉 PEGA AQUÍ el enlace de tu PNG en Cloudinary (déjalo entre comillas).
// La imagen viene solo de Cloudinary (no hace falta ningún archivo local).
const URL_PLATO = 'https://res.cloudinary.com/pjbmwoxn/image/upload/v1791665358/Imagen-bienvenida.png';

type Insig = { icono: keyof typeof Ionicons.glyphMap; fondo: string; color: string; x: number; y: number; fase: number };

const INSIGNIAS: Insig[] = [
  { icono: 'heart', fondo: colors.primary, color: colors.white, x: 0.76, y: 0.06, fase: 0 },
  { icono: 'timer-outline', fondo: colors.accent, color: colors.text, x: 0.8, y: 0.7, fase: 350 },
  { icono: 'leaf-outline', fondo: colors.magic, color: '#2F7A3C', x: 0.03, y: 0.86, fase: 700 },
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
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    // Descarga la imagen por adelantado para que aparezca al instante.
    Image.prefetch(URL_PLATO).catch(() => setFallo(true));
  }, []);
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
      {fallo ? (
        // Sin internet o enlace roto: un círculo suave en lugar del plato.
        <View style={{ position: 'absolute', left: ancho * 0.12, top: ancho * 0.12, width: ancho * 0.76, height: ancho * 0.76, borderRadius: ancho * 0.38, backgroundColor: colors.primaryLight }} />
      ) : (
      <Animated.Image
        source={{ uri: URL_PLATO }}
        onError={() => setFallo(true)}
        style={{
          width: ancho,
          height: ancho,
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