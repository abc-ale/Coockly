// components/EstadoVacio.tsx
// Pantalla vacía con icono, mensaje claro y (opcional) un botón para seguir.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Aparecer } from './Animaciones';
import { colors, fonts, radius, spacing, typography } from '../constants/theme';

type Props = {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  texto: string;
  etiquetaBoton?: string;
  onBoton?: () => void;
};

export default function EstadoVacio({ icono, titulo, texto, etiquetaBoton, onBoton }: Props) {
  return (
    <Aparecer>
      <View style={styles.contenedor}>
        <View style={styles.icono}>
          <Ionicons name={icono} size={32} color={colors.primary} />
        </View>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.texto}>{texto}</Text>
        {etiquetaBoton && onBoton ? (
          <Pressable onPress={onBoton} style={({ pressed }) => [styles.boton, pressed && { opacity: 0.85 }]}>
            <Text style={styles.botonTexto}>{etiquetaBoton}</Text>
          </Pressable>
        ) : null}
      </View>
    </Aparecer>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  icono: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  titulo: { ...typography.h3, textAlign: 'center', marginBottom: 4 },
  texto: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  boton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  botonTexto: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },
});