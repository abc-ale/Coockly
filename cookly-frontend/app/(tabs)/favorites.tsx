// app/(tabs)/favorites.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import RecipeCard, { TarjetaReceta } from '../../components/RecipeCard';
import { EsqueletoTarjetas } from '../../components/Esqueleto';
import EstadoVacio from '../../components/EstadoVacio';
import { colors, spacing, typography } from '../../constants/theme';
import { api } from '../../lib/api';

export default function FavoritesScreen() {
  const [recetas, setRecetas] = useState<TarjetaReceta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const { data } = await api.get('/recetas/favoritos');
      setRecetas(data);
    } catch (error: any) {
      Alert.alert('No se pudieron cargar', error?.response?.data?.mensaje || 'No pudimos cargar tus favoritos. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(recetas.length > 0); // si ya había lista, se actualiza sin mostrar esqueletos
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cargar])
  );

  async function refrescar() {
    setRefrescando(true);
    await cargar(true);
    setRefrescando(false);
  }

  // La receta sale de la lista al instante; si el servidor falla, vuelve a su lugar.
  async function quitarFavorito(receta: TarjetaReceta) {
    const anterior = recetas;
    setRecetas((prev) => prev.filter((r) => r.id !== receta.id));
    try {
      await api.delete(`/recetas/${receta.id}/favorito`);
    } catch (error: any) {
      setRecetas(anterior);
      Alert.alert('No se pudo quitar', error?.response?.data?.mensaje || 'No pudimos quitar el favorito. Inténtalo de nuevo.');
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      <Text style={styles.title}>Favoritos</Text>

      {cargando && recetas.length === 0 ? (
        <View style={{ marginHorizontal: -spacing.md }}>
          <EsqueletoTarjetas cantidad={2} />
        </View>
      ) : recetas.length === 0 ? (
        <EstadoVacio
          icono="heart-outline"
          titulo="Aún no tienes favoritos"
          texto="Toca el corazón en una receta para guardarla aquí."
          etiquetaBoton="Explorar recetas"
          onBoton={() => router.push('/(tabs)/home')}
        />
      ) : (
        <View style={styles.grid}>
          {recetas.map((receta, i) => (
            <RecipeCard
              key={receta.id}
              indice={i}
              recipe={{ ...receta, isFavorite: true }}
              onPress={() => router.push(`/receta/${receta.id}`)}
              onToggleFavorite={() => quitarFavorito(receta)}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});