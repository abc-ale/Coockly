// app/(tabs)/home.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import RecipeCard, { Recipe } from '../../components/RecipeCard';
import FiltroEtiquetas from '../../components/FiltroEtiquetas';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { api } from '../../lib/api';

const categories = [
  { label: 'Postres', icon: '🍰' },
  { label: 'Saludables', icon: '🥗' },
  { label: 'Comida rápida', icon: '🍔' },
  { label: 'Platos fuertes', icon: '🍖' },
];

export default function HomeScreen() {
  const [texto, setTexto] = useState('');
  const [etiquetaSeleccionada, setEtiquetaSeleccionada] = useState<number | null>(null);
  const [recetas, setRecetas] = useState<Recipe[]>([]);
  const [favoritosIds, setFavoritosIds] = useState<Set<number>>(new Set());
  const [cargando, setCargando] = useState(true);

  const buscarRecetas = useCallback(async (busqueda: string, etiquetaId: number | null) => {
    setCargando(true);
    try {
      let resRecetas;
      const resFavoritos = await api.get('/recetas/favoritos');
      const idsFavoritos = new Set<number>(resFavoritos.data.map((r: any) => r.id));
      setFavoritosIds(idsFavoritos);

      if (etiquetaId !== null) {
        resRecetas = await api.get(`/recetas/por-etiqueta/${etiquetaId}`, {
          params: { pagina: 0, tamano: 20 },
        });
      } else {
        resRecetas = await api.get('/recetas/buscar', {
          params: { texto: busqueda, pagina: 0, tamano: 20 },
        });
      }

      setRecetas(resRecetas.data.content ?? []);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudieron cargar las recetas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    buscarRecetas(texto, etiquetaSeleccionada);
  }, [texto, etiquetaSeleccionada, buscarRecetas]);

  async function alternarFavorito(receta: Recipe) {
    const esFavorito = favoritosIds.has(receta.id);
    try {
      if (esFavorito) {
        await api.delete(`/recetas/${receta.id}/favorito`);
        setFavoritosIds((prev) => {
          const copia = new Set(prev);
          copia.delete(receta.id);
          return copia;
        });
      } else {
        await api.post(`/recetas/${receta.id}/favorito`);
        setFavoritosIds((prev) => new Set(prev).add(receta.id));
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo actualizar el favorito.');
    }
  }

  return (
    <View style={{ flex: 1 }}>
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
            placeholder="Buscar recetas por nombre..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={texto}
            onChangeText={(val) => {
              setTexto(val);
              if (val) setEtiquetaSeleccionada(null);
            }}
            returnKeyType="search"
          />
        </View>

      <FiltroEtiquetas 
        seleccionada={etiquetaSeleccionada}
        onCambiar={(id: number | null) => {
            setEtiquetaSeleccionada(id);
            if (id !== null) setTexto('');
        }}
         />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {texto ? `Resultados para "${texto}"` : etiquetaSeleccionada !== null ? 'Filtrado por etiqueta' : 'Todas las recetas'}
          </Text>
        </View>

        {cargando ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : recetas.length === 0 ? (
          <Text style={styles.emptyText}>
            {texto || etiquetaSeleccionada !== null ? 'No se encontraron recetas.' : 'Todavía no hay recetas cargadas. Toca el botón + para crear la primera.'}
          </Text>
        ) : (
          <View style={styles.grid}>
            {recetas.map((receta) => (
              <RecipeCard
                key={receta.id}
                recipe={{ ...receta, isFavorite: favoritosIds.has(receta.id) }}
                onPress={() => router.push(`/receta/${receta.id}`)}
                onToggleFavorite={() => alternarFavorito(receta)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push('/crear-receta')}>
        <Ionicons name="add" size={26} color={colors.white} />
      </Pressable>
    </View>
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
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3, color: colors.text },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});