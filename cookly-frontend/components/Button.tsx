// components/Button.tsx
// Botón de Cookly con respuesta visual clara en cada estado:
//  - al tocar: se encoge con un resorte, vibra suave y la sombra se hunde
//  - cargando: el texto se desvanece y aparece el spinner
//  - éxito (prop `exito`): aparece un check que "salta"
//  - deshabilitado: se ve apagado
//  - variante "flecha": texto a la izquierda y círculo blanco con flecha que se desliza al tocar
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, PressableProps, StyleProp, StyleSheet, Text, ViewStyle, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../constants/theme';
import { toque } from '../lib/vibracion';

type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'flecha';
  loading?: boolean;
  exito?: boolean;
  icono?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

// Estas propiedades de estilo van al contenedor animado (posición/tamaño); el resto al botón.
const CLAVES_LAYOUT = [
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width', 'minWidth', 'maxWidth',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'position', 'top', 'left', 'right', 'bottom',
];

function separarEstilo(style?: StyleProp<ViewStyle>) {
  const plano: any = StyleSheet.flatten(style) || {};
  const layout: any = {};
  const visual: any = {};
  Object.keys(plano).forEach((k) => {
    (CLAVES_LAYOUT.includes(k) ? layout : visual)[k] = plano[k];
  });
  return { layout, visual };
}

export default function Button({
  label,
  variant = 'primary',
  loading,
  exito,
  icono,
  disabled,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const esOutline = variant === 'outline';
  const esGhost = variant === 'ghost';
  const esFlecha = variant === 'flecha';
  const inactivo = disabled || loading;

  const escala = useRef(new Animated.Value(1)).current;
  const flecha = useRef(new Animated.Value(0)).current;
  const carga = useRef(new Animated.Value(loading ? 1 : 0)).current;
  const salto = useRef(new Animated.Value(exito ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(carga, { toValue: loading ? 1 : 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [loading, carga]);

  useEffect(() => {
    if (exito) Animated.spring(salto, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
    else salto.setValue(0);
  }, [exito, salto]);

  const resorte = (valor: number) =>
    Animated.spring(escala, { toValue: valor, friction: 6, tension: 240, useNativeDriver: true }).start();

  const { layout, visual } = separarEstilo(style);
  const colorTexto = esOutline || esGhost ? colors.primary : colors.white;

  const contenido = (
    <>
      <Animated.View
        style={[
          esFlecha ? st.filaFlecha : st.fila,
          { opacity: Animated.multiply(carga.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), salto.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })) },
        ]}
      >
        {icono && !esFlecha ? <Ionicons name={icono} size={20} color={colorTexto} /> : null}
        <Text style={[st.label, { color: colorTexto }]}>{label}</Text>
        {esFlecha ? (
          <Animated.View style={[st.circulo, { transform: [{ translateX: flecha }] }]}>
            <Ionicons name="arrow-forward" size={22} color={colors.primary} />
          </Animated.View>
        ) : null}
      </Animated.View>

      {/* Cargando */}
      <Animated.View style={[StyleSheet.absoluteFill, st.centro, { opacity: carga }]} pointerEvents="none">
        <ActivityIndicator color={colorTexto} />
      </Animated.View>

      {/* Éxito */}
      <Animated.View
        style={[StyleSheet.absoluteFill, st.centro, { opacity: salto, transform: [{ scale: salto.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]}
        pointerEvents="none"
      >
        <Ionicons name="checkmark-circle" size={28} color={colorTexto} />
      </Animated.View>
    </>
  );

  return (
    <Animated.View style={[layout, { transform: [{ scale: escala }] }, inactivo && !loading && { opacity: 0.5 }]}>
      <Pressable
        disabled={inactivo}
        onPressIn={(e) => {
          resorte(0.95);
          Animated.timing(flecha, { toValue: 8, duration: 140, useNativeDriver: true }).start();
          if (!inactivo) toque();
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          resorte(1);
          Animated.spring(flecha, { toValue: 0, friction: 5, useNativeDriver: true }).start();
          onPressOut?.(e);
        }}
        style={({ pressed }) => [
          st.base,
          esFlecha && st.baseFlecha,
          esOutline && st.outline,
          esGhost && st.ghost,
          !esOutline && !esGhost && st.primary,
          pressed && !esOutline && !esGhost && { backgroundColor: colors.primaryDark, shadowOpacity: 0.12, elevation: 2 },
          pressed && (esOutline || esGhost) && { backgroundColor: colors.primaryLight },
          visual,
        ]}
        {...rest}
      >
        {contenido}
      </Pressable>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  baseFlecha: {
    height: 62,
    paddingVertical: 0,
    paddingLeft: 28,
    paddingRight: 8,
    alignItems: 'stretch',
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 6,
  },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  ghost: { backgroundColor: 'transparent' },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  filaFlecha: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  centro: { alignItems: 'center', justifyContent: 'center' },
  circulo: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.h3 },
});