// app/alergias.tsx
// Mis alergias: se eligen aquí, se guardan en la cuenta (servidor) y las recetas avisan cuando algún ingrediente las contiene.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { Aparecer, Presionable } from '../components/Animaciones';
import { mostrarAviso } from '../components/Aviso';
import { exito, seleccion } from '../lib/vibracion';
import { cargarCatalogoAlergias, cargarMisAlergias, guardarMisAlergias, type AlergiaItem } from '../lib/alergias';

export default function AlergiasScreen() {
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const correo = usuario?.correo ?? '';

  const [catalogo, setCatalogo] = useState<AlergiaItem[]>([]);
  const [original, setOriginal] = useState<Set<number>>(new Set());
  const [elegidas, setElegidas] = useState<Set<number>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(false);
    try {
      const [todas, mias] = await Promise.all([cargarCatalogoAlergias(), cargarMisAlergias(correo)]);
      setCatalogo(todas);
      const ids = new Set(mias.map((a) => a.id));
      setOriginal(ids);
      setElegidas(new Set(ids));
    } catch {
      setFallo(true);
    } finally {
      setCargando(false);
    }
  }, [correo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const hayCambios = useMemo(() => {
    if (original.size !== elegidas.size) return true;
    for (const id of elegidas) if (!original.has(id)) return true;
    return false;
  }, [original, elegidas]);

  const alternar = (id: number) => {
    seleccion();
    setElegidas((prev) => {
      const sig = new Set(prev);
      if (sig.has(id)) sig.delete(id);
      else sig.add(id);
      return sig;
    });
  };

  const guardar = async () => {
    if (guardando) return;
    if (!hayCambios) {
      router.back();
      return;
    }
    setGuardando(true);
    try {
      await guardarMisAlergias(correo, catalogo.filter((a) => elegidas.has(a.id)));
      exito();
      mostrarAviso(elegidas.size === 0 ? 'Sin alergias guardado' : 'Alergias actualizadas', 'exito');
      router.back();
    } catch {
      mostrarAviso('No se pudo guardar. Revisa tu conexión.', 'info');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={st.pantalla}>
      <View style={[st.cabecera, { paddingTop: insets.top + 10 }]}>
        <Presionable onPress={() => router.back()} style={st.volver} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Presionable>
        <Text style={st.titulo}>Mis alergias</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <Text style={st.subtitulo}>Marca lo que no puedes comer. Cuando una receta lo tenga, te avisamos y marcamos el ingrediente.</Text>

        {cargando ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : fallo ? (
          <View style={st.error}>
            <Text style={st.errorTexto}>No se pudieron cargar las alergias.</Text>
            <Presionable onPress={cargar} style={st.reintentar}>
              <Text style={st.reintentarTexto}>Reintentar</Text>
            </Presionable>
          </View>
        ) : (
          <Aparecer>
            <View style={st.fichas}>
              {catalogo.map((a) => {
                const activa = elegidas.has(a.id);
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => alternar(a.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activa }}
                    style={[st.ficha, activa && st.fichaActiva]}
                  >
                    <Ionicons name={activa ? 'warning' : 'add'} size={16} color={activa ? colors.white : colors.text} />
                    <Text style={[st.fichaTexto, activa && { color: colors.white }]}>{a.nombre}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={st.ayuda}>
              {elegidas.size === 0 ? 'No tienes alergias marcadas.' : `${elegidas.size} ${elegidas.size === 1 ? 'alergia marcada' : 'alergias marcadas'}.`}
            </Text>
          </Aparecer>
        )}

        <View style={st.nota}>
          <Ionicons name="information-circle-outline" size={22} color={colors.text} />
          <Text style={st.notaTexto}>Las alertas son una ayuda: se basan en el nombre de los ingredientes. Revisa siempre lo que vas a cocinar.</Text>
        </View>
      </ScrollView>

      <View style={[st.pie, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Presionable escalaAlPresionar={0.97} onPress={guardar} disabled={guardando || cargando || fallo} style={[st.boton, (guardando || cargando || fallo) && { opacity: 0.6 }]} accessibilityLabel="Guardar alergias">
          <Text style={st.botonTexto}>{guardando ? 'Guardando…' : 'Guardar alergias'}</Text>
        </Presionable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 6 },
  volver: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.text, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  titulo: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.text },
  subtitulo: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.textMuted, marginTop: 8, marginBottom: 18 },

  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ficha: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.white,
    shadowColor: colors.text, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  fichaActiva: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  fichaTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  ayuda: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 12 },

  nota: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 24, padding: 14, borderRadius: 20, backgroundColor: colors.accent,
  },
  notaTexto: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.text },

  error: { alignItems: 'center', gap: 12, marginTop: 40 },
  errorTexto: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },
  reintentar: { paddingHorizontal: 22, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  reintentarTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.white },

  pie: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(255,248,246,0.94)' },
  boton: {
    alignItems: 'center', justifyContent: 'center', height: 58, borderRadius: 29, backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  botonTexto: { fontFamily: fonts.heading, fontSize: 17, color: colors.white },
});