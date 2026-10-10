// components/Aviso.tsx
// Aviso breve que aparece abajo y se va solo (no bloquea la pantalla como un Alert).
// Uso: mostrarAviso('Tu reseña se guardó');
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, spacing } from '../constants/theme';
import { exito } from '../lib/vibracion';

type Tipo = 'exito' | 'info';
type Manejador = (texto: string, tipo?: Tipo) => void;

let manejador: Manejador | null = null;

export function mostrarAviso(texto: string, tipo: Tipo = 'exito') {
  manejador?.(texto, tipo);
}

export function AvisoProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [aviso, setAviso] = useState<{ texto: string; tipo: Tipo } | null>(null);
  const progreso = useRef(new Animated.Value(0)).current;
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback(
    (texto: string, tipo: Tipo = 'exito') => {
      if (temporizador.current) clearTimeout(temporizador.current);
      setAviso({ texto, tipo });
      if (tipo === 'exito') exito();
      Animated.spring(progreso, { toValue: 1, friction: 8, tension: 120, useNativeDriver: true }).start();
      temporizador.current = setTimeout(() => {
        Animated.timing(progreso, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setAviso(null));
      }, 2400);
    },
    [progreso]
  );

  useEffect(() => {
    manejador = mostrar;
    return () => {
      if (manejador === mostrar) manejador = null;
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [mostrar]);

  return (
    <>
      {children}
      {aviso && (
        <View pointerEvents="none" style={[styles.zona, { bottom: insets.bottom + 92 }]}>
          <Animated.View
            style={[
              styles.aviso,
              {
                opacity: progreso,
                transform: [{ translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
              },
            ]}
          >
            <Ionicons
              name={aviso.tipo === 'exito' ? 'checkmark-circle' : 'information-circle'}
              size={22}
              color={aviso.tipo === 'exito' ? colors.magic : colors.accent}
            />
            <Text style={styles.texto}>{aviso.texto}</Text>
          </Animated.View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  zona: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: spacing.md },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  texto: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.white, flexShrink: 1 },
});