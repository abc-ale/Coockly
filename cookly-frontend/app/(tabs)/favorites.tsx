// app/(tabs)/favorites.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import RecipeCard, { TarjetaReceta } from '../../components/RecipeCard';
import { EsqueletoTarjetas } from '../../components/Esqueleto';
import FavoritosVacio from '../../components/FavoritosVacio';
import { colors, fonts, spacing } from '../../constants/theme';
import { api } from '../../lib/api';
import { useConPromedios } from '../../lib/promedios';

// Fotos fijas (Cloudinary) que decoran la pantalla vacía: así siempre se ven distintas entre sí.
const PORTADAS_VACIO = [
  'https://res.cloudinary.com/pjbmwoxn/image/upload/v1791697703/Notificaciones-1.png',
  'https://res.cloudinary.com/pjbmwoxn/image/upload/v1791697698/Notificaciones-2.png',
  'https://res.cloudinary.com/pjbmwoxn/image/upload/v1791697699/Notificaciones-3.png',
  'https://res.cloudinary.com/pjbmwoxn/image/upload/v1791697699/Notificaciones-4.png',
  'https://res.cloudinary.com/pjbmwoxn/image/upload/v1791697700/Notificaciones-5.png',
  'https://res.cloudinary.com/pjbmwoxn/image/upload/v1791697699/Notificaciones-6.png',
];

export default function FavoritesScreen() {
  const [recetasBase, setRecetas] = useState<TarjetaReceta[]>([]);
  const recetas = useConPromedios(recetasBase);
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
      {recetas.length === 0 && !cargando && <Text style={styles.kicker}>Tus recetas guardadas</Text>}
      <Text style={styles.title}>Favoritos</Text>

      {cargando && recetas.length === 0 ? (
        <View style={{ marginHorizontal: -spacing.md }}>
          <EsqueletoTarjetas cantidad={2} />
        </View>
      ) : recetas.length === 0 ? (
        <FavoritosVacio portadas={PORTADAS_VACIO} onExplorar={() => router.push('/(tabs)/home')} />
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
  kicker: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.text, marginBottom: spacing.md },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});