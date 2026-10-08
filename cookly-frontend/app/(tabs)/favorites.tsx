// app/(tabs)/favorites.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import RecipeCard, { Recipe } from '../../components/RecipeCard';
import { colors, spacing, typography } from '../../constants/theme';
import { api } from '../../lib/api';

export default function FavoritesScreen() {
  const [recetas, setRecetas] = useState<Recipe[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/recetas/favoritos');
      setRecetas(data);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudieron cargar tus favoritos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function quitarFavorito(id: number) {
    try {
      await api.delete(`/recetas/${id}/favorito`);
      setRecetas((prev) => prev.filter((r) => r.id !== id));
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo quitar el favorito.');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Text style={styles.title}>Favoritos</Text>

      {cargando ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : recetas.length === 0 ? (
        <Text style={styles.emptyText}>Todavía no tienes recetas favoritas.</Text>
      ) : (
        <View style={styles.grid}>
          {recetas.map((receta) => (
            <RecipeCard
              key={receta.id}
              recipe={{ ...receta, isFavorite: true }}
              onPress={() => router.push(`/receta/${receta.id}`)}
              onToggleFavorite={() => quitarFavorito(receta.id)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md, paddingTop: spacing.xl },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted, marginTop: spacing.lg },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
