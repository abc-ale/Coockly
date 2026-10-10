// components/CargandoReceta.tsx
// Lo que se ve al abrir una receta mientras llegan los datos: la foto y el nombre aparecen de inmediato
// (vienen de la tarjeta que tocaste) y el resto son bloques que laten. Así no hay pantalla en blanco ni saltos.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ImagenReceta from './ImagenReceta';
import Button from './Button';
import { colors, radius, spacing, typography } from '../constants/theme';

type Props = {
  portada?: string;
  nombre?: string;
  minutos?: number;
  /** Si es true, falló la carga: se muestra el botón para reintentar. */
  fallo?: boolean;
  onReintentar?: () => void;
};

export default function CargandoReceta({ portada, nombre, minutos, fallo, onReintentar }: Props) {
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
        <ImagenReceta uri={portada} ancho={900} tamanoIcono={48} style={st.foto} />
        <Pressable style={st.atras} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
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
              <View style={[st.bloque, { width: 86, height: 30, borderRadius: 15 }]} />
              {minutos ? (
                <View style={st.pastilla}>
                  <Ionicons name="time-outline" size={14} color={colors.primary} />
                  <Text style={st.pastillaTexto}>{minutos} min</Text>
                </View>
              ) : (
                <View style={[st.bloque, { width: 70, height: 30, borderRadius: 15 }]} />
              )}
            </View>
            <View style={[st.bloque, { width: '95%', marginTop: spacing.md }]} />
            <View style={[st.bloque, { width: '75%', marginTop: 8 }]} />
            <View style={[st.bloque, { height: 62, borderRadius: radius.lg, marginTop: spacing.md, backgroundColor: colors.primaryLight }]} />
            <View style={[st.bloque, { width: '40%', height: 20, marginTop: spacing.lg }]} />
            <View style={[st.bloque, { height: 120, borderRadius: radius.lg, marginTop: spacing.sm, backgroundColor: colors.primaryLight }]} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  // Mismo marco que la foto de la pantalla de receta, para que al terminar de cargar no se mueva nada.
  fotoMarco: { width: '100%', height: 300, padding: 12, backgroundColor: colors.primaryLight, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  foto: { width: '100%', height: '100%', borderRadius: 30, backgroundColor: colors.surface },
  atras: {
    position: 'absolute', top: spacing.lg + 12, left: spacing.md + 12,
    width: 42, height: 42, borderRadius: radius.pill, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  cuerpo: { padding: spacing.md },
  titulo: { ...typography.h1, color: colors.text },
  fila: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  bloque: { height: 14, borderRadius: 7, backgroundColor: colors.primaryLight },
  pastilla: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 12, height: 30, borderWidth: 1, borderColor: colors.border },
  pastillaTexto: { ...typography.caption, color: colors.text, fontSize: 13 },
  fallo: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  falloTexto: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },
});