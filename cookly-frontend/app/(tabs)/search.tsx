import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RecipeCard, { Recipe } from '../../components/RecipeCard';
import { colors, radius, spacing, typography } from '../../constants/theme';

const todasLasRecetas: Recipe[] = [
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
  {
    id: '3',
    title: 'Ají de Gallina',
    description: 'Pollo deshilachado en cremosa salsa de ají amarillo.',
    image: 'https://picsum.photos/seed/ajidegallina/300/200',
    rating: 4.7,
    difficulty: 'Media',
    minutes: 40,
    servings: 4,
    kcal: 380,
  },
  {
    id: '4',
    title: 'Lomo Saltado',
    description: 'Salteado de carne con papas fritas y cebolla.',
    image: 'https://picsum.photos/seed/lomosaltado/300/200',
    rating: 4.9,
    difficulty: 'Fácil',
    minutes: 30,
    servings: 3,
    kcal: 450,
  },
];

export default function SearchScreen() {
  const [busqueda, setBusqueda] = useState('');
  const [favoritos, setFavoritos] = useState<string[]>([]);

  const resultados = todasLasRecetas.filter((r) =>
    r.title.toLowerCase().includes(busqueda.toLowerCase())
  );

  const alternarFavorito = (id: string) => {
    setFavoritos((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.titulo}>Buscar</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          placeholder="Buscar recetas, ingredientes..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      <FlatList
        data={resultados}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: spacing.md }}
        contentContainerStyle={{ paddingBottom: spacing.xl, paddingTop: spacing.sm }}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={{ ...item, isFavorite: favoritos.includes(item.id) }}
            onPress={() => {}}
            onToggleFavorite={() => alternarFavorito(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Ionicons name="search-outline" size={40} color={colors.textMuted} />
            <Text style={styles.vacioTexto}>No encontramos recetas con "{busqueda}"</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.lg },
  titulo: { ...typography.h1, color: colors.text, paddingHorizontal: spacing.md, marginBottom: spacing.md },
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
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text },
  vacio: { alignItems: 'center', marginTop: spacing.xl * 2, gap: spacing.sm },
  vacioTexto: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg },
});