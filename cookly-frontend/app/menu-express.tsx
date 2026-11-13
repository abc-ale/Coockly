// app/menu-express.tsx
// Menú express según el mockup: recetas listas en 10, 15 o 20 minutos, "Sorpréndeme" y "Enviar a mi lista".
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../constants/theme';
import { api } from '../lib/api';
import { PORCIONES_BASE } from '../lib/cantidades';
import { exito } from '../lib/vibracion';
import { mostrarAviso } from '../components/Aviso';
import { Aparecer, Presionable } from '../components/Animaciones';
import ImagenReceta from '../components/ImagenReceta';

type RecetaExpress = {
  id: number;
  nombre: string;
  minutosPreparacion?: number;
  portada?: string;
  detallesIngredientes?: unknown[];
};

const OPCIONES = [10, 15, 20];
const FONDOS = ['#F3D9DC', '#FFE9A6', '#D6EFC4'];

export default function MenuExpressScreen() {
  const insets = useSafeAreaInsets();
  const [minutos, setMinutos] = useState(15);
  const [recetas, setRecetas] = useState<RecetaExpress[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [enviando, setEnviando] = useState<number | null>(null);
  const [enviadas, setEnviadas] = useState<Set<number>>(new Set());

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(false);
    try {
      const { data } = await api.get('/recetas/buscar', { params: { texto: '', pagina: 0, tamano: 100 } });
      setRecetas((data?.content ?? []) as RecetaExpress[]);
    } catch {
      setFallo(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Recetas que se hacen en el tiempo elegido o menos, de la más rápida a la más lenta.
  const visibles = useMemo(
    () =>
      recetas
        .filter((r) => !!r.minutosPreparacion && (r.minutosPreparacion as number) <= minutos)
        .sort((a, b) => (a.minutosPreparacion as number) - (b.minutosPreparacion as number)),
    [recetas, minutos]
  );

  const sorprender = () => {
    if (visibles.length === 0) {
      mostrarAviso('No hay recetas en ese tiempo. Prueba con más minutos.', 'info');
      return;
    }
    const r = visibles[Math.floor(Math.random() * visibles.length)];
    router.push(`/receta/${r.id}`);
  };

  const enviarALista = async (r: RecetaExpress) => {
    if (enviando !== null || enviadas.has(r.id)) return;
    setEnviando(r.id);
    try {
      const { data: det } = await api.get(`/recetas/${r.id}`);
      const lineas: { ingrediente: { id: number }; cantidad: number; unidad: string }[] = det.detallesIngredientes ?? [];
      const { data: lista } = await api.post('/listas-compra', { nombre: `${r.nombre} (${PORCIONES_BASE} personas)`.slice(0, 80) });
      for (const i of lineas) {
        await api.post(`/listas-compra/${lista.id}/elementos`, {
          ingredienteId: i.ingrediente.id,
          cantidad: i.cantidad,
          unidad: i.unidad,
        });
      }
      exito();
      setEnviadas((prev) => new Set(prev).add(r.id));
      mostrarAviso('Ingredientes enviados a tu lista', 'exito');
    } catch {
      mostrarAviso('No se pudo enviar a tu lista. Inténtalo de nuevo.', 'info');
    } finally {
      setEnviando(null);
    }
  };

  const portadaBanner = visibles.find((r) => r.portada)?.portada ?? recetas.find((r) => r.portada)?.portada;

  return (
    <View style={st.pantalla}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {/* Cabecera */}
        <View style={[st.cabecera, { paddingTop: insets.top + 14 }]}>
          <View style={st.decoGrande} />
          <View style={st.decoVerde} />
          <View style={st.cabeceraFila}>
            <Presionable onPress={() => router.back()} style={st.volver} accessibilityLabel="Volver">
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Presionable>
          </View>
          <View style={st.tituloCaja}>
            <View style={st.resaltado} />
            <Text style={st.titulo}>Menú express</Text>
          </View>
          <Text style={st.subtitulo}>Ideas listas en 15 minutos</Text>
        </View>

        <View style={st.cuerpo}>
          {/* Banner */}
          <Aparecer>
            <View style={st.banner}>
              <View style={st.bannerTexto}>
                <Text style={st.bannerTitulo}>¿Poco tiempo?</Text>
                <Text style={st.bannerSub}>Recetas listas en {minutos} minutos o menos.</Text>
                <Presionable onPress={sorprender} style={st.sorprende} escalaAlPresionar={0.95}>
                  <Ionicons name="flash" size={12} color={colors.accent} />
                  <Text style={st.sorprendeTexto}>Sorpréndeme</Text>
                </Presionable>
              </View>
              <View style={st.bannerFoto}>
                <ImagenReceta uri={portadaBanner} ancho={400} style={{ width: 150, height: 108 }} />
              </View>
            </View>
          </Aparecer>

          {/* Tiempos */}
          <View style={st.chips}>
            {OPCIONES.map((m) => {
              const on = m === minutos;
              return (
                <Pressable key={m} onPress={() => setMinutos(m)} style={[st.chip, on && st.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Text style={[st.chipTexto, on && { color: colors.white }]}>{m} min</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Lista */}
          {cargando ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
          ) : fallo ? (
            <View style={{ alignItems: 'center', marginTop: 30 }}>
              <Text style={st.vacio}>No pudimos cargar las recetas.</Text>
              <Presionable onPress={cargar} style={st.reintentar}>
                <Text style={st.reintentarTexto}>Reintentar</Text>
              </Presionable>
            </View>
          ) : visibles.length === 0 ? (
            <Text style={st.vacio}>Aún no hay recetas de {minutos} minutos o menos. Prueba con más tiempo.</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {visibles.map((r, i) => {
                const ya = enviadas.has(r.id);
                const n = r.detallesIngredientes?.length;
                return (
                  <Aparecer key={r.id} delay={Math.min(i, 6) * 50}>
                    <Presionable
                      escalaAlPresionar={0.97}
                      onPress={() => router.push(`/receta/${r.id}`)}
                      style={[st.tarjeta, { backgroundColor: FONDOS[i % FONDOS.length] }]}
                    >
                      <View style={st.foto}>
                        <ImagenReceta uri={r.portada} ancho={300} style={{ width: '100%', height: '100%' }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.nombre} numberOfLines={2}>{r.nombre}</Text>
                        <View style={st.meta}>
                          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                          <Text style={st.metaTexto}>
                            {r.minutosPreparacion} min{n ? ` · ${n} ingredientes` : ''}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => enviarALista(r)}
                          disabled={enviando !== null || ya}
                          style={[st.enviar, ya && st.enviarListo]}
                          hitSlop={6}
                        >
                          {enviando === r.id ? (
                            <ActivityIndicator size="small" color={colors.white} />
                          ) : (
                            <>
                              {ya && <Ionicons name="checkmark" size={14} color={colors.text} />}
                              <Text style={[st.enviarTexto, ya && { color: colors.text }]}>{ya ? 'Enviado' : 'Enviar a mi lista'}</Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    </Presionable>
                  </Aparecer>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  cabecera: {
    backgroundColor: colors.primaryLight, borderBottomLeftRadius: 44, borderBottomRightRadius: 44,
    paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden',
  },
  decoGrande: { position: 'absolute', top: -70, right: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: '#FBE9EC' },
  decoVerde: { position: 'absolute', top: 150, left: 238, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.magic },
  cabeceraFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  volver: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.text, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  tituloCaja: { alignSelf: 'flex-start', marginTop: 10 },
  resaltado: { position: 'absolute', left: -6, right: -6, bottom: 4, height: 16, borderRadius: 8, backgroundColor: colors.accent },
  titulo: { fontFamily: fonts.display, fontSize: 34, lineHeight: 42, color: colors.text },
  subtitulo: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, marginTop: 2 },
  cuerpo: { paddingHorizontal: 20, paddingTop: 22 },
  banner: { flexDirection: 'row', backgroundColor: colors.accent, borderRadius: 30, overflow: 'hidden', height: 108 },
  bannerTexto: { flex: 1, paddingVertical: 8, paddingLeft: 16, paddingRight: 4, justifyContent: 'center' },
  bannerTitulo: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.text },
  bannerSub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.text, marginTop: 2 },
  sorprende: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.text,
    borderRadius: 12, height: 24, paddingHorizontal: 9, paddingVertical: 0, marginTop: 4,
  },
  sorprendeTexto: { fontFamily: fonts.heading, fontSize: 12, lineHeight: 15, color: colors.accent, includeFontPadding: false },
  bannerFoto: { width: 150, height: 108, backgroundColor: colors.primaryLight, overflow: 'hidden' },
  chips: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 20 },
  chip: { flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  chipOn: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  chipTexto: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 28, padding: 10 },
  foto: { width: 88, height: 88, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.primaryLight },
  nombre: { fontFamily: fonts.heading, fontSize: 18, lineHeight: 23, color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  metaTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  enviar: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 124, height: 32, justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 14, marginTop: 8,
  },
  enviarListo: { backgroundColor: colors.white },
  enviarTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.white },
  vacio: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center', marginTop: 30, paddingHorizontal: 20 },
  reintentar: { marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 28 },
  reintentarTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.white },
});