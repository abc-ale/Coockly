// app/historial.tsx
// Historial según el mockup: recetas agrupadas en "Hoy" y "Esta semana" (y "Antes" al tocar "Ver historial completo").
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../constants/theme';
import { api } from '../lib/api';
import { Aparecer, Presionable } from '../components/Animaciones';
import ImagenReceta from '../components/ImagenReceta';
import EstadoVacio from '../components/EstadoVacio';

type EntradaHistorial = {
  id: number;
  receta: { id: number; nombre: string; minutosPreparacion?: number | null; portada?: string };
  vistoEn: string;
};
type Extra = { portada?: string; promedio?: number };

const FONDOS = ['#F3D9DC', '#FFE9A6', '#D6EFC4'];
const ORO = '#FFB400';
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function inicioDelDia(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function haceCuanto(fecha: Date) {
  const min = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 60000));
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  return `hace ${Math.floor(min / 60)} h`;
}

function Estrellitas({ valor }: { valor: number }) {
  const llenas = Math.round(Math.max(0, Math.min(5, valor)));
  return (
    <View style={{ flexDirection: 'row', gap: 2, marginTop: 6 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Ionicons key={i} name="star" size={16} color={i < llenas ? ORO : '#EBD3D8'} />
      ))}
    </View>
  );
}

export default function HistorialScreen() {
  const insets = useSafeAreaInsets();
  const [entradas, setEntradas] = useState<EntradaHistorial[]>([]);
  const [extras, setExtras] = useState<Record<number, Extra>>({});
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [verTodo, setVerTodo] = useState(false);

  const cargar = useCallback(async () => {
    setFallo(false);
    try {
      const [h, b] = await Promise.all([
        api.get('/historial'),
        api.get('/recetas/buscar', { params: { texto: '', pagina: 0, tamano: 100 } }).catch(() => null),
      ]);
      setEntradas(Array.isArray(h.data) ? h.data : []);
      const mapa: Record<number, Extra> = {};
      for (const r of b?.data?.content ?? []) mapa[r.id] = { portada: r.portada, promedio: r.promedio };
      setExtras(mapa);
    } catch {
      setFallo(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  // Una sola vez cada receta (la vista más reciente), agrupadas por antigüedad.
  const grupos = useMemo(() => {
    const vistas = new Set<number>();
    const unicas = entradas
      .slice()
      .sort((a, b) => new Date(b.vistoEn).getTime() - new Date(a.vistoEn).getTime())
      .filter((e) => (vistas.has(e.receta.id) ? false : (vistas.add(e.receta.id), true)));

    const hoy0 = inicioDelDia(new Date());
    const semana0 = hoy0 - 6 * 86400000;
    const hoy: EntradaHistorial[] = [];
    const semana: EntradaHistorial[] = [];
    const antes: EntradaHistorial[] = [];
    for (const e of unicas) {
      const t = new Date(e.vistoEn).getTime();
      if (t >= hoy0) hoy.push(e);
      else if (t >= semana0) semana.push(e);
      else antes.push(e);
    }
    return { hoy, semana, antes };
  }, [entradas]);

  const etiqueta = (e: EntradaHistorial, grupo: 'hoy' | 'semana' | 'antes') => {
    const f = new Date(e.vistoEn);
    const min = e.receta.minutosPreparacion ? ` · ${e.receta.minutosPreparacion} min` : '';
    if (grupo === 'hoy') return `Vista ${haceCuanto(f)}`;
    if (grupo === 'semana') return `${DIAS[f.getDay()]}${min}`;
    return `${f.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}${min}`;
  };

  let contador = 0;
  const bloque = (titulo: string, lista: EntradaHistorial[], grupo: 'hoy' | 'semana' | 'antes') =>
    lista.length === 0 ? null : (
      <View key={grupo} style={{ marginTop: 22 }}>
        <Text style={st.grupo}>{titulo}</Text>
        <View style={{ gap: 12 }}>
          {lista.map((e) => {
            const i = contador++;
            const x = extras[e.receta.id];
            const portada = e.receta.portada ?? x?.portada;
            return (
              <Aparecer key={e.id} delay={Math.min(i, 6) * 50}>
                <Presionable
                  escalaAlPresionar={0.97}
                  onPress={() => router.push(`/receta/${e.receta.id}`)}
                  style={[st.tarjeta, { backgroundColor: FONDOS[i % FONDOS.length] }]}
                >
                  <View style={st.foto}>
                    <ImagenReceta uri={portada} ancho={300} style={{ width: '100%', height: '100%' }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.nombre} numberOfLines={2}>{e.receta.nombre}</Text>
                    <Text style={st.sub}>{etiqueta(e, grupo)}</Text>
                    {typeof x?.promedio === 'number' && x.promedio > 0 ? <Estrellitas valor={x.promedio} /> : null}
                  </View>
                </Presionable>
              </Aparecer>
            );
          })}
        </View>
      </View>
    );

  const hayAntes = grupos.antes.length > 0;
  const vacio = grupos.hoy.length + grupos.semana.length + grupos.antes.length === 0;

  return (
    <View style={st.pantalla}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
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
            <Text style={st.titulo}>Historial</Text>
          </View>
          <Text style={st.subtitulo}>Las recetas que has visto en Cookly</Text>
        </View>

        <View style={st.cuerpo}>
          {cargando ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : fallo ? (
            <EstadoVacio
              icono="cloud-offline-outline"
              titulo="No pudimos cargarlo"
              texto="Revisa tu conexión e inténtalo de nuevo."
              etiquetaBoton="Reintentar"
              onBoton={() => {
                setCargando(true);
                cargar();
              }}
            />
          ) : vacio ? (
            <EstadoVacio
              icono="time-outline"
              titulo="Aún no hay nada por aquí"
              texto="Las recetas que abras aparecerán en este historial."
              etiquetaBoton="Explorar recetas"
              onBoton={() => router.push('/(tabs)/home')}
            />
          ) : (
            <>
              {bloque('HOY', grupos.hoy, 'hoy')}
              {bloque('ESTA SEMANA', grupos.semana, 'semana')}
              {verTodo && bloque('ANTES', grupos.antes, 'antes')}
              {hayAntes && (
                <Pressable onPress={() => setVerTodo((v) => !v)} style={st.verMas} hitSlop={10}>
                  <Text style={st.verMasTexto}>{verTodo ? 'Ver menos' : 'Ver historial completo'}</Text>
                </Pressable>
              )}
            </>
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
  decoVerde: { position: 'absolute', top: 128, left: 242, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.magic },
  cabeceraFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  volver: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.text, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  tituloCaja: { alignSelf: 'flex-start', marginTop: 10 },
  resaltado: { position: 'absolute', left: -6, right: -6, bottom: 4, height: 16, borderRadius: 8, backgroundColor: colors.magic },
  titulo: { fontFamily: fonts.display, fontSize: 34, lineHeight: 42, color: colors.text },
  subtitulo: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, marginTop: 2 },
  cuerpo: { paddingHorizontal: 20 },
  grupo: { fontFamily: fonts.heading, fontSize: 13, letterSpacing: 1, color: colors.textMuted, marginBottom: 10 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 28, padding: 10 },
  foto: { width: 92, height: 76, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.primaryLight },
  nombre: { fontFamily: fonts.heading, fontSize: 19, lineHeight: 24, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  verMas: { alignSelf: 'center', marginTop: 24, paddingVertical: 6 },
  verMasTexto: { fontFamily: fonts.heading, fontSize: 16, color: colors.primary },
});