import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RecipeCard, { Recipe } from '../../components/RecipeCard';
import { colors, spacing, typography } from '../../constants/theme';

const favoritosIniciales: Recipe[] = [
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
    isFavorite: true,
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
    isFavorite: true,
  },
];

export default function FavoritesScreen() {
  const [favoritos, setFavoritos] = useState<Recipe[]>(favoritosIniciales);

  const quitarFavorito = (id: string) => {
    setFavoritos((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.titulo}>Favoritos</Text>

      <FlatList
        data={favoritos}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: spacing.md }}
        contentContainerStyle={{ paddingBottom: spacing.xl, paddingTop: spacing.sm }}
        renderItem={({ item }) => (
          <RecipeCard recipe={item} onPress={() => {}} onToggleFavorite={() => quitarFavorito(item.id)} />
        )}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Ionicons name="heart-outline" size={40} color={colors.textMuted} />
            <Text style={styles.vacioTexto}>Aún no tienes recetas favoritas</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.lg },
  titulo: { ...typography.h1, color: colors.text, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  vacio: { alignItems: 'center', marginTop: spacing.xl * 2, gap: spacing.sm },
  vacioTexto: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg },
});