import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, shadow } from '../constants/theme';

export type Recipe = {
  id: string;
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

type Props = {
  recipe: Recipe;
  onPress?: () => void;
  onToggleFavorite?: () => void;
};

export default function RecipeCard({ recipe, onPress, onToggleFavorite }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.card, shadow.card]}>
      <View>
        <Image source={{ uri: recipe.image }} style={styles.image} />

        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={11} color={colors.warning} />
          <Text style={styles.ratingText}>{recipe.rating.toFixed(1)}</Text>
        </View>

        <Pressable style={styles.favoriteBadge} onPress={onToggleFavorite} hitSlop={8}>
          <Ionicons
            name={recipe.isFavorite ? 'heart' : 'heart-outline'}
            size={16}
            color={recipe.isFavorite ? colors.primary : colors.textMuted}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{recipe.title}</Text>
          <View style={styles.difficultyChip}>
            <Text style={styles.difficultyText}>{recipe.difficulty}</Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>{recipe.description}</Text>

        <View style={styles.metaRow}>
          <Meta icon="time-outline" text={`${recipe.minutes} min`} />
          <Meta icon="people-outline" text={`${recipe.servings} personas`} />
          <Meta icon="flame-outline" text={`${recipe.kcal} kcal`} />
        </View>
      </View>
    </Pressable>
  );
}

function Meta({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    width: '48%',
    marginBottom: spacing.md,
  },
  image: {
    width: '100%',
    height: 110,
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
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...typography.h3, color: colors.text, flexShrink: 1 },
  difficultyChip: {
    backgroundColor: colors.primaryLight,
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
  metaRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { ...typography.caption, color: colors.textMuted },
});