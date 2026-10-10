// app/(tabs)/home.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RecipeCard, { TarjetaReceta } from '../../components/RecipeCard';
import FiltroEtiquetas from '../../components/FiltroEtiquetas';
import Logo from '../../components/Logo';
import { Aparecer, Presionable, Rebote } from '../../components/Animaciones';
import { colors, radius, spacing, typography, fonts, shadow } from '../../constants/theme';
import { api } from '../../lib/api';

// Mismo margen superior que usan las demás pestañas (ver _layout.tsx).
const MARGEN_SUPERIOR = 24;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [texto, setTexto] = useState('');
  const [etiquetaSeleccionada, setEtiquetaSeleccionada] = useState<number | null>(null);
  const [recetas, setRecetas] = useState<TarjetaReceta[]>([]);
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
      // Muestra la causa real en la terminal de Expo (estado HTTP y mensaje del servidor).
      console.log('ERROR RECETAS', error?.response?.status, JSON.stringify(error?.response?.data), error?.message);
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudieron cargar las recetas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    buscarRecetas(texto, etiquetaSeleccionada);
  }, [texto, etiquetaSeleccionada, buscarRecetas]);

  async function alternarFavorito(receta: TarjetaReceta) {
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

  const titulo = texto
    ? `Resultados para "${texto}"`
    : etiquetaSeleccionada !== null
    ? 'Filtrado por etiqueta'
    : 'Todas las recetas';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Parte fija: logo, saludo, buscador y categorías. No se mueve al hacer scroll. */}
      <View style={styles.encabezadoFijo}>
        {/* Encabezado con logo */}
        <Aparecer distancia={-12}>
          <View style={[styles.topBar, { paddingTop: insets.top + MARGEN_SUPERIOR }]}>
            <Logo size={38} variante="rosa" />
          </View>
        </Aparecer>

        {/* Saludo */}
        <Aparecer delay={80}>
          <View style={styles.hero}>
            <Text style={styles.greeting}>¡Hola, Chef!</Text>
            <Text style={styles.subtitle}>¿Qué cocinamos hoy?</Text>
          </View>
        </Aparecer>

        {/* Buscador */}
        <Aparecer delay={160}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.primary} />
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
            {texto.length > 0 && (
              <Pressable onPress={() => setTexto('')} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </Aparecer>

        <Aparecer delay={240}>
          <FiltroEtiquetas
            seleccionada={etiquetaSeleccionada}
            onCambiar={(id: number | null) => {
              setEtiquetaSeleccionada(id);
              if (id !== null) setTexto('');
            }}
          />
        </Aparecer>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: 96 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{titulo}</Text>
          {!cargando && recetas.length > 0 && (
            <View style={styles.contador}>
              <Text style={styles.contadorTexto}>{recetas.length}</Text>
            </View>
          )}
        </View>

        {cargando ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : recetas.length === 0 ? (
          <Aparecer>
            <View style={styles.vacio}>
              <View style={styles.vacioIcono}>
                <Ionicons name="restaurant-outline" size={30} color={colors.primary} />
              </View>
              <Text style={styles.vacioTitulo}>
                {texto || etiquetaSeleccionada !== null ? 'Sin resultados' : 'Aún no hay recetas'}
              </Text>
              <Text style={styles.emptyText}>
                {texto || etiquetaSeleccionada !== null
                  ? 'Prueba con otra búsqueda o quita el filtro.'
                  : 'Todavía no hay recetas cargadas. Vuelve pronto.'}
              </Text>
            </View>
          </Aparecer>
        ) : (
          <Aparecer key={`${texto}-${etiquetaSeleccionada}`} delay={60}>
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
          </Aparecer>
        )}
      </ScrollView>

      {/* Botón flotante del asistente de cocina */}
      <Rebote delay={600} style={styles.fabContenedor}>
        <Presionable
          style={styles.fab}
          onPress={() => router.push('/chatbot')}
          accessibilityLabel="Abrir asistente de cocina"
        >
          <Ionicons name="chatbubble-ellipses" size={26} color={colors.white} />
        </Presionable>
      </Rebote>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  encabezadoFijo: {
    backgroundColor: colors.background,
    paddingBottom: spacing.xs,
    zIndex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  hero: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  greeting: { ...typography.h1 },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadow.card,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text, padding: 0 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h2, flexShrink: 1 },
  contador: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  contadorTexto: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  vacio: { alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  vacioIcono: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  vacioTitulo: { ...typography.h3, marginBottom: 4 },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  fabContenedor: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
    shadowOpacity: 0.22,
    elevation: 6,
  },
});