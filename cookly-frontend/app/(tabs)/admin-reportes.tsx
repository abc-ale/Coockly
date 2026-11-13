// app/(tabs)/admin-reportes.tsx
// Reportes administrados por la comunidad y recetas.
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Alert, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Button from '../../components/Button';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { ReporteAdmin, listarReportes, mensajeDeError, resolverReporte } from '../../lib/admin';
import ReportesComunidad, { PestanasReportes, Vista } from '../../components/ReportesComunidad';

export default function AdminReportesScreen() {
  const insets = useSafeAreaInsets();
  const [reportes, setReportes] = useState<ReporteAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [vista, setVista] = useState<Vista>('recetas');

  const cargar = useCallback(async (esRefrescoArg?: boolean) => {
    let esRefresco = esRefrescoArg ?? false;
    if (esRefresco) setRefrescando(true);
    try {
      setReportes(await listarReportes());
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function resolver(r: ReporteAdmin, estado: 'REVISADO' | 'DESCARTADO', eliminar: boolean) {
    setOcupado(r.id);
    try {
      await resolverReporte(r.id, estado, eliminar);
      await cargar();
    } catch (e) {
      Alert.alert('No se pudo guardar', mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  }

  function confirmarEliminar(r: ReporteAdmin) {
    Alert.alert(
      'Eliminar receta',
      `Se borrará "${r.recetaNombre}" con sus comentarios, reseñas e imágenes. No se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => resolver(r, 'REVISADO', true) },
      ],
    );
  }

  if (vista === 'comunidad') return <ReportesComunidad vista={vista} onCambiar={setVista} />;

  return (
    <FlatList
      style={estilos.pantalla}
      contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
      data={reportes}
      keyExtractor={(r) => String(r.id)}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => cargar(true)} colors={[colors.primary]} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View style={{ paddingTop: insets.top + spacing.md, marginBottom: spacing.md }}>
          <PestanasReportes vista={vista} onCambiar={setVista} />
          <Text style={estilos.titulo}>Reportes de recetas</Text>
          <Text style={estilos.subtitulo}>Recetas señaladas por la comunidad.</Text>
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
            <Text style={estilos.vacioTexto}>Cuando alguien reporte una receta, aparecerá aquí.</Text>
          </View>
        )
      }
      renderItem={({ item: r }) => (
        <View style={estilos.tarjeta}>
          <Text style={estilos.receta}>{r.recetaNombre}</Text>
          <Text style={estilos.meta}>
            Reportado por {r.reportante} ({r.reportanteCorreo}){r.creadoEn ? ` · ${r.creadoEn}` : ''}
          </Text>
          <Text style={estilos.motivo}>{r.motivo}</Text>
          <View style={estilos.botones}>
            <Button label="Descartar" variant="outline" disabled={ocupado === r.id} onPress={() => resolver(r, 'DESCARTADO', false)} style={estilos.boton} />
            <Button label="Revisado" variant="outline" disabled={ocupado === r.id} onPress={() => resolver(r, 'REVISADO', false)} style={estilos.boton} />
          </View>
          <Button label="Eliminar receta" disabled={ocupado === r.id} loading={ocupado === r.id} onPress={() => confirmarEliminar(r)} style={estilos.eliminar} />
        </View>
      )}
    />
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  titulo: { ...typography.h1, color: colors.text, marginTop: spacing.sm },
  subtitulo: { ...typography.body, color: colors.textMuted, marginTop: 4 },
  error: { backgroundColor: '#FDECEC', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, gap: spacing.sm },
  errorTexto: { ...typography.body, color: colors.danger },
  vacio: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, padding: spacing.lg, alignItems: 'center' },
  vacioTitulo: { ...typography.h3, color: colors.text },
  vacioTexto: { ...typography.body, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  tarjeta: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  receta: { ...typography.h3, color: colors.text },
  meta: { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
  motivo: { ...typography.body, color: colors.text, marginTop: spacing.sm, marginBottom: spacing.md },
  botones: { flexDirection: 'row', gap: spacing.sm },
  boton: { flex: 1, paddingVertical: 10, paddingHorizontal: spacing.sm },
  eliminar: { marginTop: spacing.sm, paddingVertical: 10, backgroundColor: colors.danger },
});