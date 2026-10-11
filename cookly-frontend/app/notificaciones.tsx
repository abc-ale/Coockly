// app/notificaciones.tsx
// Lista de notificaciones (campana de Inicio), según el mockup: contador arriba, avisos agrupados por día,
// etiqueta "Nueva" en los no leídos y mini tarjeta de la receta en los avisos de receta nueva.
// Al abrirla se marcan como leídas.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EntradaSuave } from '../components/RecipeCard';
import Estrellas from '../components/Estrellas';
import EstadoVacio from '../components/EstadoVacio';
import NotificacionesVacio from '../components/NotificacionesVacio';
import { toque } from '../lib/vibracion';
import { colors, fonts, spacing } from '../constants/theme';
import { api } from '../lib/api';

type Notificacion = {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  recetaId: number | null;
  leida: boolean;
  creadoEn: string;
};

type DatosReceta = { nombre: string; minutos?: number; promedio: number };

const GRIS_TEXTO = '#7A6370';
const TEXTO_SUAVE = '#6B5360';

/** "ahora", "hace 5 min", "hace 2 h", "ayer" o la fecha corta. */
function hace(iso: string) {
  const seg = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return 'ahora';
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  if (seg < 172800) return 'ayer';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

/** Grupo del día en que llegó: Hoy, Ayer o Anteriores. */
function grupoDe(iso: string): 'Hoy' | 'Ayer' | 'Anteriores' {
  const f = new Date(iso);
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const t = new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
  const dias = Math.round((inicioHoy - t) / 86400000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  return 'Anteriores';
}

// Datos de las recetas ya consultadas (para no pedirlas dos veces).
const cacheRecetas = new Map<number, DatosReceta>();

/** Mini tarjeta de la receta: nombre, minutos, estrellitas y flecha. Pide sus datos al servidor. */
function MiniReceta({ recetaId }: { recetaId: number }) {
  const [datos, setDatos] = useState<DatosReceta | null>(cacheRecetas.get(recetaId) ?? null);

  useEffect(() => {
    if (cacheRecetas.has(recetaId)) return;
    let activo = true;
    Promise.all([api.get(`/recetas/${recetaId}`), api.get(`/recetas/${recetaId}/resenas`)])
      .then(([r, res]) => {
        const d: DatosReceta = {
          nombre: r.data?.nombre ?? 'Receta',
          minutos: r.data?.minutosPreparacion ?? undefined,
          promedio: Number(res.data?.promedio ?? 0),
        };
        cacheRecetas.set(recetaId, d);
        if (activo) setDatos(d);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [recetaId]);

  if (!datos) return null;
  return (
    <View style={st.mini}>
      <View style={st.miniIcono}>
        <Ionicons name="restaurant" size={22} color={colors.text} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.miniNombre} numberOfLines={1}>{datos.nombre}</Text>
        <View style={st.miniMeta}>
          {datos.minutos ? (
            <View style={st.miniMin}>
              <Ionicons name="time-outline" size={13} color={TEXTO_SUAVE} />
              <Text style={st.miniMinTexto}>{datos.minutos} min</Text>
            </View>
          ) : null}
          <Estrellas valor={datos.promedio} tamano={12} />
        </View>
      </View>
      <View style={st.miniFlecha}>
        <Ionicons name="arrow-forward" size={16} color={colors.white} />
      </View>
    </View>
  );
}

function Tarjeta({ n, indice }: { n: Notificacion; indice: number }) {
  const esReceta = n.tipo === 'RECETA';
  const icono: keyof typeof Ionicons.glyphMap = esReceta ? 'restaurant' : n.tipo === 'REPORTE' ? 'flag' : 'notifications';
  // Colores del cuadrito de ícono: rosa (receta nueva), pistacho (reporte) y rosadito si ya se leyó.
  const fondoIcono = !n.leida ? (esReceta ? colors.primary : colors.magic) : colors.primaryLight;
  const colorIcono = !n.leida ? (esReceta ? colors.white : colors.text) : colors.primary;

  return (
    <EntradaSuave delay={Math.min(indice, 8) * 40} distancia={10}>
      <Pressable
        disabled={!n.recetaId}
        onPress={() => {
          if (!n.recetaId) return;
          toque();
          router.push({ pathname: '/receta/[id]', params: { id: String(n.recetaId) } });
        }}
        style={({ pressed }) => [st.tarjeta, n.leida ? st.tarjetaLeida : st.tarjetaNueva, pressed && { opacity: 0.92 }]}
      >
        <View style={[st.icono, { backgroundColor: fondoIcono }]}>
          <Ionicons name={icono} size={22} color={colorIcono} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={st.filaTitulo}>
            <View style={st.tituloYEtiqueta}>
              <Text style={st.titulo} numberOfLines={1}>{n.titulo}</Text>
              {!n.leida ? (
                <View style={st.etiqueta}>
                  <Text style={st.etiquetaTexto}>Nueva</Text>
                </View>
              ) : null}
            </View>
            <Text style={st.cuando}>{hace(n.creadoEn)}</Text>
          </View>
          <Text style={st.mensaje}>{n.mensaje}</Text>
          {esReceta && n.recetaId ? <MiniReceta recetaId={n.recetaId} /> : null}
        </View>
      </Pressable>
    </EntradaSuave>
  );
}

export default function NotificacionesScreen() {
  const insets = useSafeAreaInsets();
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [sinLeer, setSinLeer] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [fallo, setFallo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/notificaciones');
      const items: Notificacion[] = data ?? [];
      setLista(items);
      setSinLeer(items.filter((n) => !n.leida).length);
      setFallo(false);
      // Al verlas se marcan como leídas; en pantalla siguen como "Nueva" hasta que se vuelva a abrir.
      if (items.some((n) => !n.leida)) api.put('/notificaciones/leer-todas').catch(() => {});
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

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  const grupos = (['Hoy', 'Ayer', 'Anteriores'] as const)
    .map((nombre) => ({ nombre, items: lista.filter((n) => grupoDe(n.creadoEn) === nombre) }))
    .filter((g) => g.items.length > 0);

  let contador = 0;

  return (
    <View style={[st.pantalla, { paddingTop: insets.top + spacing.sm }]}>
      <View style={st.cabecera}>
        <Pressable
          onPress={() => {
            toque();
            router.back();
          }}
          style={st.atras}
          hitSlop={8}
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={st.tituloPantalla}>Notificaciones</Text>
        {sinLeer > 0 ? (
          <View style={st.contador}>
            <Text style={st.contadorTexto}>{sinLeer > 9 ? '9+' : sinLeer}</Text>
          </View>
        ) : null}
      </View>

      {cargando ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: insets.bottom + spacing.xl }}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colors.primary} colors={[colors.primary]} />}
          showsVerticalScrollIndicator={false}
        >
          {fallo ? (
            <EstadoVacio
              icono="cloud-offline-outline"
              titulo="No pudimos cargarlas"
              texto="Revisa tu conexión e inténtalo de nuevo."
              etiquetaBoton="Reintentar"
              onBoton={cargar}
            />
          ) : lista.length === 0 ? (
            <NotificacionesVacio />
          ) : (
            grupos.map((g) => (
              <View key={g.nombre} style={{ marginBottom: 6 }}>
                <Text style={st.grupo}>{g.nombre}</Text>
                <View style={{ gap: 10 }}>
                  {g.items.map((n) => (
                    <Tarjeta key={n.id} n={n} indice={contador++} />
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 8, marginBottom: 6 },
  atras: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.text, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  tituloPantalla: { flex: 1, fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.text },
  contador: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  contadorTexto: { fontFamily: fonts.display, fontSize: 21, color: colors.text },

  grupo: { fontFamily: fonts.heading, fontSize: 14, color: GRIS_TEXTO, marginTop: 8, marginBottom: 8 },

  tarjeta: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.white, borderRadius: 26, padding: 14 },
  tarjetaNueva: { shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  tarjetaLeida: { shadowColor: colors.text, shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  icono: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  tituloYEtiqueta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  titulo: { fontFamily: fonts.heading, fontSize: 16, color: colors.text, flexShrink: 1 },
  etiqueta: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  etiquetaTexto: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.white },
  cuando: { fontFamily: fonts.body, fontSize: 12, color: GRIS_TEXTO },
  mensaje: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: TEXTO_SUAVE, marginTop: 2 },

  mini: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primaryLight, borderRadius: 18, padding: 8, marginTop: 10 },
  miniIcono: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  miniNombre: { fontFamily: fonts.heading, fontSize: 14, color: colors.text },
  miniMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  miniMin: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniMinTexto: { fontFamily: fonts.body, fontSize: 12, color: TEXTO_SUAVE },
  miniFlecha: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});