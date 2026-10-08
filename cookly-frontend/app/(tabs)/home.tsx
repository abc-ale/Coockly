import React from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import RecipeCard, { Recipe } from '../../components/RecipeCard';
import { colors, radius, spacing, typography } from '../../constants/theme';

const categories = [
  { label: 'Postres', icon: '🍰' },
  { label: 'Saludables', icon: '🥗' },
  { label: 'Comida rápida', icon: '🍔' },
  { label: 'Platos fuertes', icon: '🍖' },
];

const trending: Recipe[] = [
  {
    id: '1',
    title: 'Ceviche Clásico',
    description: 'Pescado fresco marinado en limón con ají amarillo.',
    image: 'https://picsum.photos/seed/ceviche/300/200',
    rating: 4.9,
    difficulty: 'Fácil',
    minutes: 25,
    servings: 4,
    kcal: 220,
  },
  {
    id: '2',
    title: 'Torta de Chocolate',
    description: 'Bizcocho húmedo con ganache intenso de cacao.',
    image: 'https://picsum.photos/seed/torta/300/200',
    rating: 4.8,
    difficulty: 'Media',
    minutes: 50,
    servings: 8,
    kcal: 410,
  },
];

export default function HomeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>¡Hola, Chef! 👋</Text>
          <Text style={styles.subtitle}>¿Qué cocinamos hoy?</Text>
        </View>
        <Pressable style={styles.chatBubble} onPress={() => router.push('/chatbot')}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          placeholder="Buscar recetas, ingredientes..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categorías</Text>
        <Text style={styles.sectionLink}>Ver todo</Text>
      </View>

      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.label}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
        renderItem={({ item }) => (
          <View style={styles.categoryChip}>
            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            <Text style={styles.categoryLabel}>{item.label}</Text>
          </View>
        )}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🔥 Trending</Text>
        <Text style={styles.sectionLink}>Ver todo</Text>
      </View>

      <View style={styles.grid}>
        {trending.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} onPress={() => {}} onToggleFavorite={() => {}} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  greeting: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: 4 },
  chatBubble: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3, color: colors.text },
  sectionLink: { ...typography.bodySmall, color: colors.primary },
  categoryChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    width: 90,
  },
  categoryLabel: {
    ...typography.caption,
    color: colors.primaryDark,
    marginTop: 4,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
});