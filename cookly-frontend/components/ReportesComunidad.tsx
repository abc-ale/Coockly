// components/ReportesComunidad.tsx
// Reportes de posts y comentarios de Comunidad (Supabase) para el administrador.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Button from './Button';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing, typography } from '../constants/theme';

export type Vista = 'recetas' | 'comunidad';

type Perfil = { username: string; nombre_completo: string | null } | null;

type ReporteComunidad = {
  id: string;
  tipo: 'POST' | 'COMENTARIO';
  motivo: string;
  created_at: string;
  post_id: string | null;
  comentario_id: string | null;
  posts: { contenido: string | null; imagen_url: string | null; profiles: Perfil } | null;
  comments: { contenido: string; profiles: Perfil } | null;
};

const SELECCION =
  'id, tipo, motivo, created_at, post_id, comentario_id, ' +
  'posts(contenido, imagen_url, profiles(username, nombre_completo)), ' +
  'comments(contenido, profiles(username, nombre_completo))';

const nombreDe = (p: Perfil | undefined) => p?.nombre_completo || p?.username || 'Usuario';

export function PestanasReportes({
  vista,
  onCambiar,
}: {
  vista: Vista;
  onCambiar: (v: Vista) => void;
}) {
  const pestana = (v: Vista, texto: string) => (
    <Pressable
      onPress={() => onCambiar(v)}
      style={[estilos.pestana, vista === v && estilos.pestanaActiva]}
    >
      <Text style={[estilos.pestanaTexto, vista === v && estilos.pestanaTextoActivo]}>{texto}</Text>
    </Pressable>
  );
  return (
    <View style={estilos.pestanas}>
      {pestana('recetas', 'Recetas')}
      {pestana('comunidad', 'Comunidad')}
    </View>
  );
}

export default function ReportesComunidad({
  vista,
  onCambiar,
}: {
  vista: Vista;
  onCambiar: (v: Vista) => void;
}) {
  const insets = useSafeAreaInsets();
  const [reportes, setReportes] = useState<ReporteComunidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(async (esRefrescoArg?: boolean) => {
    let esRefresco = esRefrescoArg ?? false;
    if (esRefresco) setRefrescando(true);
    const { data, error: fallo } = await supabase
      .from('reportes_comunidad')
      .select(SELECCION)
      .eq('estado', 'PENDIENTE')
      .order('created_at', { ascending: false });

    if (fallo) {
      setError('No se pudieron cargar los reportes. Revisa tu conexión.');
    } else {
      setReportes((data ?? []) as unknown as ReporteComunidad[]);
      setError(null);
    }
    setCargando(false);
    setRefrescando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function marcar(r: ReporteComunidad, estado: 'REVISADO' | 'DESCARTADO') {
    setOcupado(r.id);
    const { data, error: fallo } = await supabase
      .from('reportes_comunidad')
      .update({ estado })
      .eq('id', r.id)
      .select('id');
    setOcupado(null);
    if (fallo || !data || data.length === 0) {
      Alert.alert('No se pudo guardar', 'Verifica que tu usuario esté registrado como administrador en Supabase.');
      return;
    }
    cargar();
  }

  async function eliminar(r: ReporteComunidad) {
    const tabla = r.tipo === 'POST' ? 'posts' : 'comments';
    const id = r.tipo === 'POST' ? r.post_id : r.comentario_id;
    setOcupado(r.id);
    const { data, error: fallo } = await supabase.from(tabla).delete().eq('id', id).select('id');
    setOcupado(null);
    if (fallo || !data || data.length === 0) {
      Alert.alert('No se pudo eliminar', 'Verifica que tu usuario esté registrado como administrador en Supabase.');
      return;
    }
    cargar();
  }

  function confirmarEliminar(r: ReporteComunidad) {
    const que = r.tipo === 'POST' ? 'publicación' : 'comentario';
    Alert.alert('Eliminar ' + que, `Se borrará esta ${que}. No se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminar(r) },
    ]);
  }

  return (
    <FlatList
      style={estilos.pantalla}
      contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
      data={reportes}
      keyExtractor={(r) => r.id}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={() => cargar(true)}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <View style={{ paddingTop: insets.top + spacing.md, marginBottom: spacing.md }}>
          <PestanasReportes vista={vista} onCambiar={onCambiar} />
          <Text style={estilos.titulo}>Reportes de la comunidad</Text>
          <Text style={estilos.subtitulo}>Publicaciones y comentarios señalados.</Text>
          {error ? (
            <View style={estilos.error} accessibilityRole="alert">
              <Text style={estilos.errorTexto}>{error}</Text>
              <Button label="Reintentar" onPress={() => cargar()} />
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        cargando ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : error ? undefined : (
          <View style={estilos.vacio}>
            <Text style={estilos.vacioTitulo}>No hay reportes pendientes</Text>
            <Text style={estilos.vacioTexto}>
              Cuando alguien reporte una publicación o comentario, aparecerá aquí.
            </Text>
          </View>
        )
      }
      renderItem={({ item: r }) => {
        const esPost = r.tipo === 'POST';
        const autor = esPost ? nombreDe(r.posts?.profiles) : nombreDe(r.comments?.profiles);
        const texto = esPost ? r.posts?.contenido : r.comments?.contenido;
        return (
          <View style={estilos.tarjeta}>
            <Text style={estilos.etiqueta}>{esPost ? 'PUBLICACIÓN' : 'COMENTARIO'}</Text>
            <Text style={estilos.autor}>De {autor}</Text>
            <Text style={estilos.contenido}>{texto || (esPost && r.posts?.imagen_url ? '(Solo imagen)' : '(Contenido no disponible)')}</Text>
            <Text style={estilos.meta}>
              Reportado el {new Date(r.created_at).toLocaleDateString('es-PE')}
            </Text>
            <Text style={estilos.motivo}>Motivo: {r.motivo}</Text>
            <View style={estilos.botones}>
              <Button
                label="Descartar"
                variant="outline"
                disabled={ocupado === r.id}
                onPress={() => marcar(r, 'DESCARTADO')}
                style={estilos.boton}
              />
              <Button
                label="Revisado"
                variant="outline"
                disabled={ocupado === r.id}
                onPress={() => marcar(r, 'REVISADO')}
                style={estilos.boton}
              />
            </View>
            <Button
              label={esPost ? 'Eliminar publicación' : 'Eliminar comentario'}
              disabled={ocupado === r.id}
              loading={ocupado === r.id}
              onPress={() => confirmarEliminar(r)}
              style={estilos.eliminar}
            />
          </View>
        );
      }}
    />
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  pestanas: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  pestana: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pestanaActiva: { backgroundColor: colors.primary, borderColor: colors.primary },
  pestanaTexto: { ...typography.body, color: colors.text },
  pestanaTextoActivo: { color: '#fff', fontWeight: '600' },
  titulo: { ...typography.h1, color: colors.text },
  subtitulo: { ...typography.body, color: colors.textMuted, marginTop: 4 },
  error: { backgroundColor: '#FDECEC', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, gap: spacing.sm },
  errorTexto: { ...typography.body, color: colors.danger },
  vacio: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, padding: spacing.lg, alignItems: 'center' },
  vacioTitulo: { ...typography.h3, color: colors.text },
  vacioTexto: { ...typography.body, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  tarjeta: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  etiqueta: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  autor: { ...typography.h3, color: colors.text, marginTop: 2 },
  contenido: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  meta: { ...typography.bodySmall, color: colors.textMuted, marginTop: spacing.sm },
  motivo: { ...typography.body, color: colors.text, marginTop: 2, marginBottom: spacing.md },
  botones: { flexDirection: 'row', gap: spacing.sm },
  boton: { flex: 1, paddingVertical: 10, paddingHorizontal: spacing.sm },
  eliminar: { marginTop: spacing.sm, paddingVertical: 10, backgroundColor: colors.danger },
});