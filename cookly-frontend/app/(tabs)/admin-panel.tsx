// app/(tabs)/admin-panel.tsx
// Pantalla principal del administrador: cifras y gráficas de Cookly.
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Button from '../../components/Button';
import { BarraApilada, Cifra, GraficaBarras, GraficaRanking, Segmentos, Tarjeta } from '../../components/admin/Graficas';
import { API_BASE_URL } from '../../constants/config';
import { colors, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  Graficas,
  Resumen,
  etiquetaDia,
  formatoBytes,
  formatoMinutos,
  formatoNumero,
  mensajeDeError,
  obtenerGraficas,
  obtenerResumen,
  urlPanelWeb,
} from '../../lib/admin';

const CIRUELA = '#6B4A63';
const GRIS = '#CBB7BD';

type Vista = 'resumen' | 'uso';

export default function AdminPanelScreen() {
  const { usuario } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [vista, setVista] = useState<Vista>('resumen');
  const [dias, setDias] = useState(30);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [graficas, setGraficas] = useState<Graficas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ultimaPeticion = useRef(0);

  const cargar = useCallback(
    async (esRefresco = false) => {
      const numero = ++ultimaPeticion.current;
      if (esRefresco) setRefrescando(true);
      else setCargando(true);
      try {
        const [r, g] = await Promise.all([obtenerResumen(), obtenerGraficas(dias)]);
        if (numero !== ultimaPeticion.current) return; // llegó una petición más nueva
        setResumen(r);
        setGraficas(g);
        setError(null);
      } catch (e) {
        if (numero === ultimaPeticion.current) setError(mensajeDeError(e));
      } finally {
        if (numero === ultimaPeticion.current) {
          setCargando(false);
          setRefrescando(false);
        }
      }
    },
    [dias],
  );

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const primerNombre = (usuario?.nombre ?? 'admin').split(' ')[0];

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={{ padding: spacing.md, paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl }}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => cargar(true)} colors={[colors.primary]} tintColor={colors.primary} />}
    >
      <Text style={estilos.titulo}>Panel administrativo</Text>
      <Text style={estilos.subtitulo}>Hola, {primerNombre}. Así va Cookly.</Text>

      <Segmentos<Vista>
        opciones={[
          { valor: 'resumen', etiqueta: 'Resumen' },
          { valor: 'uso', etiqueta: 'Uso de la app' },
        ]}
        valor={vista}
        onCambio={setVista}
      />
      <View style={{ height: spacing.sm }} />
      <Segmentos<number>
        opciones={[
          { valor: 7, etiqueta: '7 días' },
          { valor: 30, etiqueta: '30 días' },
          { valor: 90, etiqueta: '90 días' },
        ]}
        valor={dias}
        onCambio={setDias}
      />
      <View style={{ height: spacing.md }} />

      {error ? (
        <View style={estilos.error} accessibilityRole="alert">
          <Text style={estilos.errorTexto}>{error}</Text>
          <Button label="Reintentar" onPress={() => cargar()} />
        </View>
      ) : null}

      {cargando && !resumen ? <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.xl }} /> : null}

      {resumen && graficas ? (
        vista === 'resumen' ? (
          <VistaResumen resumen={resumen} graficas={graficas} irAReportes={() => router.push('/(tabs)/admin-reportes')} />
        ) : (
          <VistaUso resumen={resumen} graficas={graficas} />
        )
      ) : null}

      <Tarjeta titulo="Respaldo y recuperación">
        <Text style={estilos.parrafo}>
          La copia de seguridad de los datos y su recuperación se hacen desde el panel web, en una computadora.
        </Text>
        <Button label="Abrir panel web" onPress={() => WebBrowser.openBrowserAsync(urlPanelWeb(API_BASE_URL))} />
      </Tarjeta>
    </ScrollView>
  );
}

function VistaResumen({ resumen: r, graficas: g, irAReportes }: { resumen: Resumen; graficas: Graficas; irAReportes: () => void }) {
  const estados: Record<string, string> = { PENDIENTE: 'Pendientes', REVISADO: 'Revisados', DESCARTADO: 'Descartados' };
  const coloresEstado: Record<string, string> = { PENDIENTE: colors.warning, REVISADO: colors.success, DESCARTADO: GRIS };

  return (
    <View>
      <View style={estilos.cifras}>
        <Cifra etiqueta="Usuarios" valor={formatoNumero(r.usuariosTotal)} nota={`+${formatoNumero(r.usuariosNuevos7d)} esta semana`} />
        <Cifra etiqueta="Recetas" valor={formatoNumero(r.recetasTotal)} nota={`+${formatoNumero(r.recetasNuevas30d)} en 30 días`} />
        <Cifra etiqueta="Activos hoy" valor={formatoNumero(r.activosHoy)} nota={`${formatoNumero(r.enLineaAhora)} en línea ahora`} />
        <Cifra etiqueta="Tiempo de uso" valor={formatoMinutos(r.minutosUsoTotal)} nota={`${formatoMinutos(r.minutosUso7d)} en 7 días`} />
        <Cifra
          etiqueta="Reportes pendientes"
          valor={formatoNumero(r.reportesPendientes)}
          nota={r.reportesPendientes > 0 ? 'Toca para revisar' : 'Todo al día'}
          onPress={irAReportes}
        />
        <Cifra etiqueta="Base de datos" valor={formatoBytes(r.baseDatosBytes)} nota={`${formatoNumero(r.imagenesTotal)} imágenes`} />
      </View>
      <Text style={estilos.datos}>
        {formatoNumero(r.comentariosTotal)} comentarios · {formatoNumero(r.favoritosTotal)} favoritos · {formatoNumero(r.resenasTotal)} reseñas
        {r.resenasTotal > 0 ? ` (promedio ${r.puntuacionPromedio} de 5)` : ''}
      </Text>

      <Tarjeta titulo="Usuarios nuevos por día">
        <GraficaBarras datos={g.usuariosPorDia.map((d) => ({ etiqueta: etiquetaDia(d.dia), valor: d.valor }))} color={colors.primaryDark} />
      </Tarjeta>
      <Tarjeta titulo="Recetas nuevas por día">
        <GraficaBarras datos={g.recetasPorDia.map((d) => ({ etiqueta: etiquetaDia(d.dia), valor: d.valor }))} color="#E9A25E" />
      </Tarjeta>
      <Tarjeta titulo="Recetas más vistas">
        <GraficaRanking datos={g.topRecetasVistas} color={colors.primaryDark} vacio="Todavía no hay vistas registradas." />
      </Tarjeta>
      <Tarjeta titulo="Recetas más guardadas en favoritos">
        <GraficaRanking datos={g.topRecetasFavoritas} color={CIRUELA} vacio="Todavía no hay favoritos." />
      </Tarjeta>
      <Tarjeta titulo="Cuentas por estado">
        <BarraApilada
          partes={[
            { nombre: 'Activas', valor: r.usuariosActivos, color: colors.success },
            { nombre: 'Inactivas', valor: r.usuariosInactivos, color: GRIS },
          ]}
        />
      </Tarjeta>
      <Tarjeta titulo="Reportes de recetas por estado">
        <BarraApilada partes={g.reportesPorEstado.map((x) => ({ nombre: estados[x.nombre] ?? x.nombre, valor: x.valor, color: coloresEstado[x.nombre] ?? CIRUELA }))} />
      </Tarjeta>
    </View>
  );
}

function VistaUso({ resumen: r, graficas: g }: { resumen: Resumen; graficas: Graficas }) {
  return (
    <View>
      <View style={estilos.cifras}>
        <Cifra etiqueta="En línea ahora" valor={formatoNumero(r.enLineaAhora)} nota="Activos hace menos de 2 min" />
        <Cifra etiqueta="Activos hoy" valor={formatoNumero(r.activosHoy)} nota={`${formatoNumero(r.activos7d)} en 7 días`} />
        <Cifra etiqueta="Sesiones" valor={formatoNumero(r.sesionesTotal)} nota="Desde que empezó el registro" />
        <Cifra etiqueta="Por sesión" valor={formatoMinutos(r.minutosPorSesion)} nota="Duración promedio" />
        <Cifra etiqueta="Tiempo total" valor={formatoMinutos(r.minutosUsoTotal)} nota={`${formatoMinutos(r.minutosUso7d)} en 7 días`} />
      </View>

      <View style={{ height: spacing.md }} />
      <Tarjeta titulo="Minutos de uso por día">
        <GraficaBarras
          datos={g.usoPorDia.map((d) => ({ etiqueta: etiquetaDia(d.dia), valor: d.minutos }))}
          color={colors.primaryDark}
          formato={formatoMinutos}
        />
      </Tarjeta>
      <Tarjeta titulo="Personas activas por día">
        <GraficaBarras datos={g.usoPorDia.map((d) => ({ etiqueta: etiquetaDia(d.dia), valor: d.activos }))} color={CIRUELA} />
      </Tarjeta>
      <Tarjeta titulo="Horas de mayor uso">
        <GraficaBarras datos={g.horasPico.map((h) => ({ etiqueta: `${h.hora} h`, valor: h.valor }))} color="#E9A25E" formato={(n) => `${n} sesiones`} />
      </Tarjeta>
      <Tarjeta titulo="Quién usa más la app">
        <GraficaRanking datos={g.topUsuariosTiempo} color={CIRUELA} formato={formatoMinutos} vacio="Todavía no hay uso registrado." />
      </Tarjeta>
      <Text style={estilos.nota}>
        El tiempo se mide mientras la app está abierta: avisa al servidor cada 30 segundos. Solo cuentan las personas que ya actualizaron la app.
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  titulo: { ...typography.h1, color: colors.text },
  subtitulo: { ...typography.body, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  datos: { ...typography.bodySmall, color: colors.textMuted, marginVertical: spacing.md },
  nota: { ...typography.bodySmall, color: colors.textMuted, marginBottom: spacing.md },
  parrafo: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
  error: { backgroundColor: '#FDECEC', borderRadius: 14, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  errorTexto: { ...typography.body, color: colors.danger },
});