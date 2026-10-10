import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, shadow } from '../constants/theme';
import { Aparecer, Presionable } from './Animaciones';
import ImagenReceta from './ImagenReceta';
import { toque } from '../lib/vibracion';

/** Forma de los datos de ejemplo que usa la pantalla Buscar. */
export type Recipe = {
  id: number;
  title: string;
  description: string;
  image: string;
  rating: number;
  difficulty: 'Fácil' | 'Media' | 'Difícil';
  minutes: number;
  servings: number;
  kcal: number;
  isFavorite?: boolean;
};

/** Forma que devuelve el servidor en las listas de recetas (buscar, por etiqueta y favoritos). */
export type TarjetaReceta = {
  id: number;
  nombre: string;
  descripcion?: string;
  minutosPreparacion?: number;
  portada?: string;
  promedio?: number;
  isFavorite?: boolean;
};

type Props = {
  recipe: Recipe | TarjetaReceta;
  onPress?: () => void;
  onToggleFavorite?: () => void;
  /** Posición en la lista: las tarjetas entran una tras otra. */
  indice?: number;
};

function RecipeCard({ recipe, onPress, onToggleFavorite, indice = 0 }: Props) {
  // Acepta las dos formas: la del servidor (nombre, portada…) y la de ejemplo (title, image…).
  const r = recipe as any;
  const titulo: string = r.title ?? r.nombre ?? '';
  const descripcion: string = r.description ?? r.descripcion ?? '';
  const imagen: string | undefined = r.image ?? r.portada;
  const puntuacion: number = Number(r.rating ?? r.promedio ?? 0);
  const minutos: number | undefined = r.minutes ?? r.minutosPreparacion ?? undefined;
  const dificultad: string | undefined = r.difficulty;
  const personas: number | undefined = r.servings;
  const kcal: number | undefined = r.kcal;

  // El corazón "late" cada vez que cambia (no al aparecer por primera vez).
  const escalaCorazon = useRef(new Animated.Value(1)).current;
  const primeraVez = useRef(true);
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    Animated.sequence([
      Animated.timing(escalaCorazon, { toValue: 1.4, duration: 110, useNativeDriver: true }),
      Animated.spring(escalaCorazon, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [r.isFavorite, escalaCorazon]);

  return (
    <Aparecer delay={Math.min(indice, 8) * 70} distancia={14} style={styles.envoltura}>
    <Presionable onPress={onPress} escalaAlPresionar={0.97} style={[styles.card, shadow.card]}>
      <View style={styles.fotoCaja}>
        {/* Foto liviana (Cloudinary) con fundido: nunca queda un cuadro blanco mientras carga */}
        <ImagenReceta uri={imagen} ancho={500} style={styles.image} />

        {puntuacion > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={11} color={colors.warning} />
            <Text style={styles.ratingText}>{puntuacion.toFixed(1)}</Text>
          </View>
        )}

        <Pressable
          style={styles.favoriteBadge}
          onPress={() => {
            toque();
            onToggleFavorite?.();
          }}
          hitSlop={8}
        >
          <Animated.View style={{ transform: [{ scale: escalaCorazon }] }}>
            <Ionicons
              name={r.isFavorite ? 'heart' : 'heart-outline'}
              size={16}
              color={r.isFavorite ? colors.primary : colors.textMuted}
            />
          </Animated.View>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{titulo}</Text>
          {dificultad ? (
            <View style={styles.difficultyChip}>
              <Text style={styles.difficultyText}>{dificultad}</Text>
            </View>
          ) : null}
        </View>

        {descripcion ? <Text style={styles.description} numberOfLines={2}>{descripcion}</Text> : null}

        <View style={styles.pieFila}>
          <View style={styles.metaRow}>
            {minutos ? <Meta icon="time-outline" text={`${minutos} min`} /> : null}
            {personas ? <Meta icon="people-outline" text={`${personas}`} /> : null}
            {kcal ? <Meta icon="flame-outline" text={`${kcal} kcal`} /> : null}
          </View>
          <View style={styles.flecha}>
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </View>
        </View>
      </View>
    </Presionable>
    </Aparecer>
  );
}

export default React.memo(RecipeCard);

function Meta({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  envoltura: {
    width: '48%',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    width: '100%',
    padding: 8,
  },
  fotoCaja: { borderRadius: 22, overflow: 'hidden' },
  image: {
    width: '100%',
    height: 124,
  },
  sinFoto: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: { ...typography.caption, color: colors.text },
  favoriteBadge: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...typography.h3, color: colors.text, flexShrink: 1 },
  difficultyChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  difficultyText: { ...typography.caption, color: colors.primaryDark },
  description: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  pieFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  metaRow: { flexDirection: 'row', gap: spacing.sm, flexShrink: 1 },
  flecha: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { ...typography.caption, color: colors.textMuted },
});