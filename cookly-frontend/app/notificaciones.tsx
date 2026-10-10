// app/notificaciones.tsx
// Lista de notificaciones (campana de Inicio). Al abrirla se marcan como leídas.
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EntradaSuave } from '../components/RecipeCard';
import EstadoVacio from '../components/EstadoVacio';
import { toque } from '../lib/vibracion';
import { colors, fonts, radius, spacing, shadow } from '../constants/theme';
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

const ICONO: Record<string, keyof typeof Ionicons.glyphMap> = {
  RECETA: 'restaurant',
  REPORTE: 'flag',
};

/** "hace 5 min", "hace 2 h", "ayer", o la fecha si es más antigua. */
function hace(iso: string) {
  const seg = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return 'ahora';
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  if (seg < 172800) return 'ayer';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

export default function NotificacionesScreen() {
  const insets = useSafeAreaInsets();
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [fallo, setFallo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/notificaciones');
      setLista(data ?? []);
      setFallo(false);
      // Al verlas, se marcan como leídas (la lista conserva el estilo "nueva" hasta que se vuelva a abrir).
      if ((data ?? []).some((n: Notificacion) => !n.leida)) {
        api.put('/notificaciones/leer-todas').catch(() => {});
      }
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

  return (
    <View style={[styles.pantalla, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.cabecera}>
        <Pressable
          onPress={() => {
            toque();
            router.back();
          }}
          style={styles.atras}
          hitSlop={8}
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.titulo}>Notificaciones</Text>
      </View>

      {cargando ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl }}
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
            <EstadoVacio
              icono="notifications-off-outline"
              titulo="Todo al día"
              texto="Cuando haya recetas nuevas o novedades de tus reportes, las verás aquí."
            />
          ) : (
            lista.map((n, i) => (
              <EntradaSuave key={n.id} delay={Math.min(i, 8) * 40} distancia={10}>
                <Pressable
                  disabled={!n.recetaId}
                  onPress={() => {
                    if (!n.recetaId) return;
                    toque();
                    router.push({ pathname: '/receta/[id]', params: { id: String(n.recetaId) } });
                  }}
                  style={({ pressed }) => [styles.tarjeta, !n.leida && styles.nueva, pressed && { opacity: 0.9 }]}
                >
                  <View style={styles.icono}>
                    <Ionicons name={ICONO[n.tipo] ?? 'notifications'} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.filaTitulo}>
                      <Text style={styles.tarjetaTitulo} numberOfLines={1}>{n.titulo}</Text>
                      <Text style={styles.cuando}>{hace(n.creadoEn)}</Text>
                    </View>
                    <Text style={styles.mensaje}>{n.mensaje}</Text>
                  </View>
                  {!n.leida ? <View style={styles.punto} /> : null}
                </Pressable>
              </EntradaSuave>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  atras: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  titulo: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  nueva: { backgroundColor: colors.primaryLight },
  icono: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  tarjetaTitulo: { fontFamily: fonts.heading, fontSize: 16, color: colors.text, flexShrink: 1 },
  cuando: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  mensaje: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 2 },
  punto: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
});