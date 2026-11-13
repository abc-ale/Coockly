// components/CargandoReceta.tsx
// Lo que se ve al abrir una receta mientras llegan los datos: la foto y el nombre aparecen de inmediato
// (vienen de la tarjeta que tocaste) y el resto son bloques que laten. Así no hay pantalla en blanco ni saltos.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ImagenReceta from './ImagenReceta';
import Button from './Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, spacing } from '../constants/theme';

type Props = {
  portada?: string;
  nombre?: string;
  minutos?: number;
  /** Si es true, falló la carga: se muestra el botón para reintentar. */
  fallo?: boolean;
  onReintentar?: () => void;
};

export default function CargandoReceta({ portada, nombre, minutos, fallo, onReintentar }: Props) {
  const insets = useSafeAreaInsets();
  const pulso = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    bucle.start();
    return () => bucle.stop();
  }, [pulso]);
  const opacidad = pulso.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

  return (
    <View style={st.pantalla}>
      <View style={st.fotoMarco}>
        <ImagenReceta uri={portada} ancho={900} sinIcono style={st.foto} />
        <Pressable style={[st.atras, { top: Math.max(insets.top, 12) + 8 }]} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={st.cuerpo}>
        {nombre ? <Text style={st.titulo}>{nombre}</Text> : <Animated.View style={[st.bloque, { width: '60%', height: 28, opacity: opacidad }]} />}

        {fallo ? (
          <View style={st.fallo}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.primary} />
            <Text style={st.falloTexto}>No pudimos cargar la receta. Revisa tu conexión e inténtalo de nuevo.</Text>
            <Button label="Reintentar" onPress={onReintentar} style={{ alignSelf: 'stretch' }} />
          </View>
        ) : (
          <Animated.View style={{ opacity: opacidad }}>
            <View style={st.fila}>
              <View style={[st.bloque, { width: 120, height: 34, borderRadius: 17, backgroundColor: colors.accent, opacity: 0.55 }]} />
              <View style={[st.bloque, { width: 80, height: 34, borderRadius: 17 }]} />
              <View style={[st.bloque, { width: 54, height: 34, borderRadius: 17, backgroundColor: colors.magic, opacity: 0.55 }]} />
            </View>
            <View style={[st.bloque, { width: '45%', height: 22, marginTop: spacing.lg }]} />
            <View style={[st.bloque, { height: 44, borderRadius: 22, marginTop: spacing.md }]} />
            <View style={[st.bloque, { width: '90%', marginTop: spacing.md }]} />
            <View style={[st.bloque, { width: '80%', marginTop: spacing.md }]} />
            <View style={[st.bloque, { width: '40%', height: 22, marginTop: spacing.lg }]} />
            <View style={[st.bloque, { height: 84, borderRadius: 28, marginTop: spacing.sm }]} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  // Igual que la foto de la pantalla de receta (sin marco, esquinas de abajo muy redondeadas): al cargar no se mueve nada.
  // El fondo es rosado (no blanco), así mientras llega la foto no se ve un destello blanco.
  fotoMarco: { width: '100%', height: 330, borderBottomLeftRadius: 44, borderBottomRightRadius: 44, overflow: 'hidden', backgroundColor: colors.primaryLight },
  foto: { width: '100%', height: '100%' },
  atras: {
    position: 'absolute', left: 16,
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  cuerpo: { paddingHorizontal: 20, paddingTop: spacing.lg },
  titulo: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 36, color: colors.text },
  fila: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  bloque: { height: 14, borderRadius: 7, backgroundColor: colors.primaryLight },
  pastilla: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 14, height: 34 },
  pastillaTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  fallo: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  falloTexto: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },
});