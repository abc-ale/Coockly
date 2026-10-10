// app/(tabs)/home.tsx
// Inicio según el mockup: saludo con campana, buscador con filtros, categorías,
// "Receta del día", "Populares" en carrusel y debajo todas las recetas.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RecipeCard, { TarjetaReceta, EntradaSuave } from '../../components/RecipeCard';
import FiltroEtiquetas from '../../components/FiltroEtiquetas';
import ImagenReceta from '../../components/ImagenReceta';
import { Aparecer, Presionable, Rebote } from '../../components/Animaciones';
import { EsqueletoTarjetas } from '../../components/Esqueleto';
import EstadoVacio from '../../components/EstadoVacio';
import Degradado from '../../components/Degradado';
import { mostrarAlerta } from '../../components/Dialogo';
import { leerProgreso, ProgresoCocina } from '../../lib/progresoCocina';
import { seleccion, toque } from '../../lib/vibracion';
import { colors, radius, spacing, typography, fonts, shadow } from '../../constants/theme';
import { api } from '../../lib/api';

// Mismo margen superior que usan las demás pestañas (ver _layout.tsx).
const MARGEN_SUPERIOR = 24;

// Colores de las tarjetas de "Populares": rosado, mantequilla y pistacho, en ese orden.
const FONDOS_POPULARES = [colors.primaryLight, colors.accent, colors.magic];

/** Abre la receta pasando nombre, foto y minutos: así la pantalla de receta ya muestra algo mientras carga el resto. */
function abrirReceta(r: TarjetaReceta) {
  router.push({
    pathname: '/receta/[id]',
    params: {
      id: String(r.id),
      nombre: r.nombre ?? '',
      portada: r.portada ?? '',
      minutos: r.minutosPreparacion ? String(r.minutosPreparacion) : '',
    },
  });
}

/** Número del día del año: la "Receta del día" cambia cada día pero es la misma para todos durante ese día. */
function diaDelAnio() {
  const ahora = new Date();
  const inicio = new Date(ahora.getFullYear(), 0, 0);
  return Math.floor((ahora.getTime() - inicio.getTime()) / 86400000);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [texto, setTexto] = useState('');
  const [etiquetaSeleccionada, setEtiquetaSeleccionada] = useState<number | null>(null);
  const [recetas, setRecetas] = useState<TarjetaReceta[]>([]);
  const [favoritosIds, setFavoritosIds] = useState<Set<number>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [progreso, setProgreso] = useState<ProgresoCocina | null>(null);
  const scroll = useRef<ScrollView>(null);
  const yTodas = useRef(0);

  // `silencioso`: al deslizar para refrescar no se muestran los esqueletos.
  const buscarRecetas = useCallback(async (busqueda: string, etiquetaId: number | null, silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      // Favoritos y recetas se piden al mismo tiempo: así carga casi la mitad de rápido.
      const pedidoRecetas =
        etiquetaId !== null
          ? api.get(`/recetas/por-etiqueta/${etiquetaId}`, { params: { pagina: 0, tamano: 20 } })
          : api.get('/recetas/buscar', { params: { texto: busqueda, pagina: 0, tamano: 20 } });
      const [resFavoritos, resRecetas] = await Promise.all([api.get('/recetas/favoritos'), pedidoRecetas]);
      setFavoritosIds(new Set<number>(resFavoritos.data.map((r: any) => r.id)));

      const lista: TarjetaReceta[] = resRecetas.data.content ?? [];
      setRecetas(lista);
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

  const filtrando = texto.length > 0 || etiquetaSeleccionada !== null;
  const buscando = texto.length > 0;
  const titulo = texto
    ? `Resultados para "${texto}"`
    : etiquetaSeleccionada !== null
    ? 'Recetas de esta categoría'
    : 'Todas las recetas';

  // Receta del día y populares: se ven siempre (también al elegir una categoría) y solo se ocultan al buscar por texto.
  const recetaDelDia = !buscando && recetas.length > 0 ? recetas[diaDelAnio() % recetas.length] : null;
  const populares = !buscando
    ? [...recetas].sort((a, b) => Number(b.promedio ?? 0) - Number(a.promedio ?? 0)).slice(0, 6)
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Parte fija: saludo, buscador y categorías. No se mueve al hacer scroll. */}
      <View style={styles.encabezadoFijo}>
        <EntradaSuave distancia={-12}>
          <View style={[styles.saludoFila, { paddingTop: insets.top + MARGEN_SUPERIOR }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>¡Hola, Chef!</Text>
              <Text style={styles.subtitle}>¿Qué cocinamos hoy?</Text>
            </View>
            <Presionable
              style={styles.campana}
              escalaAlPresionar={0.9}
              onPress={() => {
                toque();
                mostrarAlerta('Notificaciones', 'Por ahora no tienes notificaciones nuevas.');
              }}
              accessibilityLabel="Notificaciones"
            >
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
              <View style={styles.campanaPunto} />
            </Presionable>
          </View>
        </EntradaSuave>

        {/* Buscador con botón de filtros */}
        <EntradaSuave delay={100} distancia={10}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.primary} />
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
        </EntradaSuave>

        <Aparecer delay={180}>
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
        ref={scroll}
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: 110 }}
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
        {progreso && !filtrando && (
          <EntradaSuave distancia={12}>
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
          </EntradaSuave>
        )}

        {/* Receta del día */}
        {recetaDelDia && (
          <EntradaSuave delay={120} distancia={14}>
            <Presionable style={styles.heroSombra} escalaAlPresionar={0.98} onPress={() => abrirReceta(recetaDelDia)}>
              <ImagenReceta uri={recetaDelDia.portada} ancho={900} tamanoIcono={44} style={styles.hero}>
                <View style={styles.heroVelo} />
                <View style={styles.heroTextos}>
                  <View style={styles.heroPastilla}>
                    <Text style={styles.heroPastillaTexto}>Receta del día</Text>
                  </View>
                  <Text style={styles.heroTitulo} numberOfLines={2}>{recetaDelDia.nombre}</Text>
                  <View style={styles.heroBoton}>
                    <Text style={styles.heroBotonTexto}>Cocinar ahora</Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.white} />
                  </View>
                </View>
              </ImagenReceta>
            </Presionable>
          </EntradaSuave>
        )}

        {/* Populares */}
        {populares.length > 0 && (
          <Aparecer delay={220}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Populares</Text>
              <Pressable
                onPress={() => {
                  seleccion();
                  scroll.current?.scrollTo({ y: Math.max(yTodas.current - 12, 0), animated: true });
                }}
                hitSlop={10}
              >
                <Text style={styles.verTodo}>Ver todo</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carrusel}
              keyboardShouldPersistTaps="handled"
            >
              {populares.map((r, i) => (
                <Presionable
                  key={r.id}
                  escalaAlPresionar={0.96}
                  onPress={() => abrirReceta(r)}
                  style={[styles.popular, { backgroundColor: FONDOS_POPULARES[i % FONDOS_POPULARES.length] }]}
                >
                  <ImagenReceta uri={r.portada} ancho={420} style={styles.popularFoto} />
                  <Text style={styles.popularNombre} numberOfLines={2}>{r.nombre}</Text>
                  <View style={styles.popularPie}>
                    <Text style={styles.popularMin}>
                      {r.minutosPreparacion ? `${r.minutosPreparacion} min` : 'Ver receta'}
                    </Text>
                    <View style={styles.popularFlecha}>
                      <Ionicons name="arrow-forward" size={16} color={colors.white} />
                    </View>
                  </View>
                </Presionable>
              ))}
            </ScrollView>
          </Aparecer>
        )}

        {/* Todas las recetas / resultados */}
        <View
          style={styles.sectionHeader}
          onLayout={(e) => {
            yTodas.current = e.nativeEvent.layout.y;
          }}
        >
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
            titulo={filtrando ? 'Sin resultados' : 'Aún no hay recetas'}
            texto={
              filtrando
                ? 'Prueba con otra búsqueda o quita el filtro.'
                : 'Todavía no hay recetas cargadas. Vuelve pronto.'
            }
            etiquetaBoton={filtrando ? 'Ver todas las recetas' : undefined}
            onBoton={() => {
              setTexto('');
              setEtiquetaSeleccionada(null);
            }}
          />
        ) : (
          // Al cambiar de categoría la lista se vuelve a armar y las tarjetas entran una tras otra.
          // Mientras llegan los datos nuevos se sigue viendo la lista anterior, sin atenuarla.
          <View
            key={`${texto}-${etiquetaSeleccionada}`}
            style={styles.grid}
          >
            {recetas.map((receta, i) => (
              <RecipeCard
                key={receta.id}
                indice={i}
                recipe={{ ...receta, isFavorite: favoritosIds.has(receta.id) }}
                onPress={() => abrirReceta(receta)}
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
          <Ionicons name="chatbubble-ellipses" size={26} color={colors.text} />
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
  saludoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  greeting: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.text, letterSpacing: -0.4 },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: 0 },
  campana: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  campanaPunto: {
    position: 'absolute',
    top: 12,
    right: 13,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadow.card,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text, padding: 0 },

  heroSombra: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 32,
    ...shadow.card,
    shadowOpacity: 0.16,
    elevation: 6,
  },
  hero: { height: 200, borderRadius: 32 },
  heroVelo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,18,32,0.38)' },
  heroTextos: { flex: 1, justifyContent: 'center', padding: 20, gap: 10 },
  heroPastilla: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  heroPastillaTexto: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  heroTitulo: { fontFamily: fonts.display, fontSize: 28, lineHeight: 31, color: colors.white, maxWidth: '78%' },
  heroBoton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    height: 42,
  },
  heroBotonTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.white },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.text, flex: 1 },
  verTodo: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  contador: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  contadorTexto: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  carrusel: { paddingHorizontal: spacing.md, gap: 12, paddingBottom: 6 },
  popular: { width: 158, borderRadius: 28, padding: 8 },
  popularFoto: { height: 108, borderRadius: 22 },
  popularNombre: { fontFamily: fonts.heading, fontSize: 15, lineHeight: 19, color: colors.text, marginTop: 10, marginHorizontal: 4, minHeight: 38 },
  popularPie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginHorizontal: 4, marginBottom: 2 },
  popularMin: { ...typography.caption, color: colors.textMuted, fontSize: 12 },
  popularFlecha: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
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
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.accent,
    borderWidth: 4,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
    shadowOpacity: 0.22,
    elevation: 8,
  },
});