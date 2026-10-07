// app/(tabs)/admin-usuarios.tsx
// Lista de usuarios con su tiempo de uso. Permite cambiar rol, activar o desactivar cuentas y descargar Excel o PDF.
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, Alert, Linking, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  UsuarioAdmin,
  cambiarActivo,
  cambiarRol,
  crearEnlaceDescarga,
  formatoMinutos,
  formatoNumero,
  listarUsuarios,
  mensajeDeError,
} from '../../lib/admin';

type Filtro = 'todos' | 'activos' | 'inactivos' | 'admins';

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'activos', etiqueta: 'Activos' },
  { valor: 'inactivos', etiqueta: 'Inactivos' },
  { valor: 'admins', etiqueta: 'Admins' },
];

export default function AdminUsuariosScreen() {
  const { usuario: yo } = useAuth();
  const insets = useSafeAreaInsets();

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [exportando, setExportando] = useState<'xlsx' | 'pdf' | null>(null);

  const cargar = useCallback(async (esRefresco = false) => {
    if (esRefresco) setRefrescando(true);
    try {
      setUsuarios(await listarUsuarios());
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

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (texto && !u.nombre.toLowerCase().includes(texto) && !u.correo.toLowerCase().includes(texto)) return false;
      if (filtro === 'activos') return u.activo;
      if (filtro === 'inactivos') return !u.activo;
      if (filtro === 'admins') return u.rol === 'ADMINISTRADOR';
      return true;
    });
  }, [usuarios, busqueda, filtro]);

  async function ejecutar(accion: () => Promise<void>) {
    try {
      await accion();
      await cargar();
    } catch (e) {
      Alert.alert('No se pudo guardar', mensajeDeError(e));
    }
  }

  function abrirAcciones(u: UsuarioAdmin) {
    if (yo && u.correo.toLowerCase() === yo.correo.toLowerCase()) {
      Alert.alert('Tu cuenta', 'No puedes cambiar tu propio rol ni desactivar tu cuenta desde aquí.');
      return;
    }
    const esAdmin = u.rol === 'ADMINISTRADOR';
    Alert.alert(u.nombre, u.correo, [
      {
        text: esAdmin ? 'Quitar rol de administrador' : 'Hacer administrador',
        onPress: () => ejecutar(() => cambiarRol(u.id, esAdmin ? 'USUARIO' : 'ADMINISTRADOR')),
      },
      {
        text: u.activo ? 'Desactivar cuenta' : 'Activar cuenta',
        style: u.activo ? 'destructive' : 'default',
        onPress: () => ejecutar(() => cambiarActivo(u.id, !u.activo)),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function exportar(tipo: 'xlsx' | 'pdf') {
    setExportando(tipo);
    try {
      const url = await crearEnlaceDescarga(tipo);
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('No se pudo generar el reporte', mensajeDeError(e));
    } finally {
      setExportando(null);
    }
  }

  const encabezado = (
    <View style={{ paddingTop: insets.top + spacing.md }}>
      <Text style={estilos.titulo}>Usuarios</Text>
      <Text style={estilos.subtitulo}>{formatoNumero(usuarios.length)} personas registradas</Text>

      <View style={estilos.buscador}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={estilos.buscadorTexto}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre o correo"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar usuario"
        />
      </View>

      <View style={estilos.chips}>
        {FILTROS.map((f) => (
          <Pressable
            key={f.valor}
            style={[estilos.chip, filtro === f.valor && estilos.chipActivo]}
            onPress={() => setFiltro(f.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: filtro === f.valor }}
          >
            <Text style={[estilos.chipTexto, filtro === f.valor && estilos.chipTextoActivo]}>{f.etiqueta}</Text>
          </Pressable>
        ))}
      </View>

      <View style={estilos.exportar}>
        <Button label="Descargar Excel" variant="outline" loading={exportando === 'xlsx'} disabled={exportando !== null} onPress={() => exportar('xlsx')} style={estilos.botonExportar} />
        <Button label="Descargar PDF" variant="outline" loading={exportando === 'pdf'} disabled={exportando !== null} onPress={() => exportar('pdf')} style={estilos.botonExportar} />
      </View>
      <Text style={estilos.ayuda}>El reporte se abre en el navegador del celular y se descarga allí.</Text>

      {error ? (
        <View style={estilos.error} accessibilityRole="alert">
          <Text style={estilos.errorTexto}>{error}</Text>
          <Button label="Reintentar" onPress={() => cargar()} />
        </View>
      ) : null}
    </View>
  );

  return (
    <FlatList
      style={estilos.pantalla}
      contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
      data={visibles}
      keyExtractor={(u) => String(u.id)}
      ListHeaderComponent={encabezado}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => cargar(true)} colors={[colors.primary]} tintColor={colors.primary} />}
      ListEmptyComponent={
        cargando ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <Text style={estilos.vacio}>No hay usuarios que coincidan.</Text>
        )
      }
      renderItem={({ item: u }) => <FilaUsuario u={u} onPress={() => abrirAcciones(u)} />}
      keyboardShouldPersistTaps="handled"
    />
  );
}

function FilaUsuario({ u, onPress }: { u: UsuarioAdmin; onPress: () => void }) {
  const esAdmin = u.rol === 'ADMINISTRADOR';
  return (
    <Pressable style={estilos.fila} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${u.nombre}, ${u.correo}. Toca para ver opciones`}>
      <View style={estilos.filaArriba}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.nombre} numberOfLines={1}>
            {u.nombre}
          </Text>
          <Text style={estilos.correo} numberOfLines={1}>
            {u.correo}
          </Text>
        </View>
        <View style={estilos.etiquetas}>
          {esAdmin ? <Text style={[estilos.etiqueta, estilos.etiquetaAdmin]}>Admin</Text> : null}
          <Text style={[estilos.etiqueta, u.activo ? estilos.etiquetaActivo : estilos.etiquetaInactivo]}>{u.activo ? 'Activo' : 'Inactivo'}</Text>
        </View>
      </View>
      <Text style={estilos.detalle}>
        Uso: {formatoMinutos(u.segundosUso / 60)} · {formatoNumero(u.sesiones)} sesiones · {formatoNumero(u.recetas)} recetas
      </Text>
      <Text style={estilos.detalle}>Último acceso: {u.ultimoAcceso ?? 'sin uso registrado'}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  titulo: { ...typography.h1, color: colors.text },
  subtitulo: { ...typography.body, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  buscador: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.md },
  buscadorTexto: { flex: 1, paddingVertical: 10, ...typography.body, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.primaryLight },
  chipActivo: { backgroundColor: colors.primaryDark },
  chipTexto: { ...typography.bodySmall, color: colors.primaryDark, fontWeight: '600' },
  chipTextoActivo: { color: colors.white },
  exportar: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  botonExportar: { flex: 1, paddingVertical: 10, paddingHorizontal: spacing.sm },
  ayuda: { ...typography.caption, color: colors.textMuted, marginTop: 6, marginBottom: spacing.md },
  error: { backgroundColor: '#FDECEC', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  errorTexto: { ...typography.body, color: colors.danger },
  vacio: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  fila: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  filaArriba: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  nombre: { ...typography.h3, color: colors.text },
  correo: { ...typography.bodySmall, color: colors.textMuted },
  etiquetas: { flexDirection: 'row', gap: 6 },
  etiqueta: { ...typography.caption, paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.pill, overflow: 'hidden' },
  etiquetaAdmin: { backgroundColor: '#ECE3EA', color: '#6B4A63' },
  etiquetaActivo: { backgroundColor: '#E4F0E8', color: '#3F6B50' },
  etiquetaInactivo: { backgroundColor: '#F1E6E8', color: '#8A5560' },
  detalle: { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
});