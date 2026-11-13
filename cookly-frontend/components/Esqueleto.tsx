// components/Esqueleto.tsx
// Cuadros grises que laten mientras carga el contenido (en vez de la rueda de carga).
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

/** Una cuadrícula de tarjetas de receta "fantasma". */
export function EsqueletoTarjetas({ cantidad = 4 }: { cantidad?: number }) {
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

  return (
    <Animated.View
      style={[styles.grid, { opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }]}
      accessibilityLabel="Cargando recetas"
    >
      {Array.from({ length: cantidad }).map((_, i) => (
        <View key={i} style={styles.tarjeta}>
          <View style={styles.foto} />
          <View style={styles.cuerpo}>
            <View style={[styles.linea, { width: '70%', height: 14 }]} />
            <View style={[styles.linea, { width: '95%' }]} />
            <View style={[styles.linea, { width: '40%' }]} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  tarjeta: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  foto: { height: 110, backgroundColor: colors.primaryLight },
  cuerpo: { padding: spacing.sm, gap: 8 },
  linea: { height: 10, borderRadius: 6, backgroundColor: colors.primaryLight },
});