// components/TarjetaBusqueda.tsx
// Tarjeta compacta de la pantalla Buscar: fondo de color, foto, nombre, minutos y flecha rosada.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts } from '../constants/theme';
import { Presionable } from './Animaciones';
import { EntradaSuave } from './RecipeCard';
import ImagenReceta from './ImagenReceta';

// Los fondos se turnan: rosa, mantequilla, pistacho.
const FONDOS = [colors.primaryLight, colors.accent, colors.magic];
const FONDOS_SUAVES = ['#F3D9DC', '#FFE9A6', '#D6EFC4'];

type Props = {
  nombre: string;
  portada?: string;
  minutos?: number;
  indice: number;
  onPress: () => void;
};

function TarjetaBusqueda({ nombre, portada, minutos, indice, onPress }: Props) {
  const fondo = FONDOS_SUAVES[indice % FONDOS.length];
  return (
    <EntradaSuave delay={Math.min(indice, 8) * 60} distancia={14} style={styles.envoltura}>
      <Presionable onPress={onPress} escalaAlPresionar={0.97} style={[styles.card, { backgroundColor: fondo }]}>
        <View style={styles.fotoCaja}>
          <ImagenReceta uri={portada} ancho={500} style={styles.foto} />
        </View>
        <View style={styles.pie}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nombre} numberOfLines={2}>{nombre}</Text>
            {!!minutos && (
              <View style={styles.minutos}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={styles.minutosTexto}>{minutos} min</Text>
              </View>
            )}
          </View>
          <View style={styles.flecha}>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </View>
        </View>
      </Presionable>
    </EntradaSuave>
  );
}

export default React.memo(TarjetaBusqueda);

const styles = StyleSheet.create({
  envoltura: { width: '48%', marginBottom: 16 },
  card: { width: '100%', borderRadius: radius.lg, padding: 8 },
  fotoCaja: { borderRadius: 22, overflow: 'hidden' },
  foto: { width: '100%', height: 124 },
  pie: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 4, paddingTop: 10, paddingBottom: 2 },
  nombre: { fontFamily: fonts.heading, fontSize: 16, lineHeight: 20, color: colors.text, minHeight: 40 },
  minutos: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  minutosTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  flecha: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});