// app/(tabs)/home.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RecipeCard, { TarjetaReceta } from '../../components/RecipeCard';
import FiltroEtiquetas from '../../components/FiltroEtiquetas';
import Logo from '../../components/Logo';
import { Aparecer, Presionable, Rebote } from '../../components/Animaciones';
import { EsqueletoTarjetas } from '../../components/Esqueleto';
import EstadoVacio from '../../components/EstadoVacio';
import Degradado from '../../components/Degradado';
import { leerProgreso, ProgresoCocina } from '../../lib/progresoCocina';
import { seleccion } from '../../lib/vibracion';
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
  const [refrescando, setRefrescando] = useState(false);
  const [progreso, setProgreso] = useState<ProgresoCocina | null>(null);

  // `silencioso`: al deslizar para refrescar no se muestran los esqueletos.
  const buscarRecetas = useCallback(async (busqueda: string, etiquetaId: number | null, silencioso = false) => {
    if (!silencioso) setCargando(true);
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

  async function refrescar() {
    setRefrescando(true);
    await buscarRecetas(texto, etiquetaSeleccionada, true);
    setRefrescando(false);
  }

  // Al volver a Inicio (desde Favoritos o desde una receta) se actualizan los corazones.
  useFocusEffect(
    useCallback(() => {
      api
        .get('/recetas/favoritos')
        .then((r) => setFavoritosIds(new Set<number>(r.data.map((x: any) => x.id))))
        .catch(() => {});
      // Receta que el usuario dejó a medias en Cocina guiada.
      leerProgreso().then(setProgreso);
    }, [])
  );

  // El corazón cambia al instante; si el servidor falla, vuelve a como estaba.
  async function alternarFavorito(receta: TarjetaReceta) {
    const eraFavorito = favoritosIds.has(receta.id);
    setFavoritosIds((prev) => {
      const copia = new Set(prev);
      if (eraFavorito) copia.delete(receta.id);
      else copia.add(receta.id);
      return copia;
    });
    try {
      if (eraFavorito) await api.delete(`/recetas/${receta.id}/favorito`);
      else await api.post(`/recetas/${receta.id}/favorito`);
    } catch (error: any) {
      setFavoritosIds((prev) => {
        const copia = new Set(prev);
        if (eraFavorito) copia.add(receta.id);
        else copia.delete(receta.id);
        return copia;
      });
      Alert.alert('No se pudo actualizar', error?.response?.data?.mensaje || 'No pudimos actualizar tu favorito. Inténtalo de nuevo.');
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
            <Logo size={38} variante="rosa" colorTexto={colors.primary} />
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
              seleccion();
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
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={refrescar}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Continuar cocinando */}
        {progreso && !texto && etiquetaSeleccionada === null && (
          <Aparecer>
            <Presionable
              onPress={() => router.push(`/receta/${progreso.recetaId}?continuar=1`)}
              escalaAlPresionar={0.98}
              style={styles.continuarSombra}
            >
              <Degradado colores={[colors.primary, '#FF7A9E']} style={styles.continuar}>
                <Ionicons name="timer-outline" size={24} color={colors.white} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.continuarEtiqueta}>Continuar cocinando</Text>
                  <Text style={styles.continuarTitulo} numberOfLines={1}>
                    {progreso.nombre} · paso {progreso.paso + 1} de {progreso.total}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.white} />
              </Degradado>
            </Presionable>
          </Aparecer>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{titulo}</Text>
          {!cargando && recetas.length > 0 && (
            <View style={styles.contador}>
              <Text style={styles.contadorTexto}>{recetas.length}</Text>
            </View>
          )}
        </View>

        {cargando && recetas.length === 0 ? (
          <EsqueletoTarjetas cantidad={4} />
        ) : recetas.length === 0 ? (
          <EstadoVacio
            icono="restaurant-outline"
            titulo={texto || etiquetaSeleccionada !== null ? 'Sin resultados' : 'Aún no hay recetas'}
            texto={
              texto || etiquetaSeleccionada !== null
                ? 'Prueba con otra búsqueda o quita el filtro.'
                : 'Todavía no hay recetas cargadas. Vuelve pronto.'
            }
            etiquetaBoton={texto || etiquetaSeleccionada !== null ? 'Ver todas las recetas' : undefined}
            onBoton={() => {
              setTexto('');
              setEtiquetaSeleccionada(null);
            }}
          />
        ) : (
          // Al cambiar de categoría la lista se vuelve a armar y las tarjetas entran una tras otra.
          // Mientras llegan los datos nuevos, la lista anterior se atenúa en vez de desaparecer.
          <View
            key={`${texto}-${etiquetaSeleccionada}`}
            style={[styles.grid, cargando && { opacity: 0.45 }]}
          >
            {recetas.map((receta, i) => (
              <RecipeCard
                key={receta.id}
                indice={i}
                recipe={{ ...receta, isFavorite: favoritosIds.has(receta.id) }}
                onPress={() => router.push(`/receta/${receta.id}`)}
                onToggleFavorite={() => alternarFavorito(receta)}
              />
            ))}
          </View>
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
  continuarSombra: { marginHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: radius.lg, ...shadow.card },
  continuar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  continuarEtiqueta: { ...typography.caption, color: colors.onPrimary, textTransform: 'uppercase', letterSpacing: 1 },
  continuarTitulo: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },
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