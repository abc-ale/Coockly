// app/onboarding.tsx
// Primera vez que se inicia sesión: 1) aceptar términos y 2) elegir alergias. Según los mockups.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, BackHandler, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logo from '../components/Logo';
import { Presionable } from '../components/Animaciones';
import { useAuth } from '../context/AuthContext';
import { marcarOnboarding } from '../lib/onboarding';
import { api } from '../lib/api';
import { colors, fonts, spacing } from '../constants/theme';

type Alergia = { id: number; nombre: string };
type Documento = 'terminos' | 'privacidad' | null;

const RESUMEN_TERMINOS = [
  { n: '1', fondo: colors.accent, titulo: 'Uso de la app.', texto: 'Cookly te ayuda a cocinar; las recetas son orientativas.' },
  { n: '2', fondo: colors.magic, titulo: 'Tu cuenta.', texto: 'Eres responsable de tu contraseña y de lo que publicas.' },
  { n: '3', fondo: colors.primaryLight, titulo: 'Comunidad.', texto: 'Respeta a los demás; los contenidos ofensivos pueden reportarse.' },
  { n: '4', fondo: colors.accent, titulo: 'Alergias.', texto: 'Las alertas son una ayuda; revisa siempre los ingredientes.' },
];

// Textos completos (resumen en lenguaje simple). Revísalos con tu equipo antes de publicar la app.
const TEXTO_TERMINOS = [
  ['Uso de la app', 'Cookly es un asistente de cocina. Las recetas, tiempos y cantidades son orientativas y pueden variar según tus ingredientes y utensilios.'],
  ['Tu cuenta', 'Eres responsable de mantener segura tu contraseña y de toda la actividad que ocurra en tu cuenta. Debes darnos datos verdaderos al registrarte.'],
  ['Comunidad', 'Al publicar fotos, textos o comentarios, aceptas que sean visibles para otras personas. Está prohibido publicar contenido ofensivo, violento, engañoso o que no te pertenezca. Cualquier persona puede reportar contenido y el equipo de Cookly puede retirarlo.'],
  ['Alergias y salud', 'Las alertas de alergias son solo una ayuda y pueden no ser completas. Revisa siempre los ingredientes antes de cocinar y consulta a un profesional de salud si tienes dudas.'],
  ['Cambios', 'Podemos actualizar estos términos. Si hay cambios importantes, te lo avisaremos en la app.'],
];
const TEXTO_PRIVACIDAD = [
  ['Qué datos guardamos', 'Tu nombre, tu correo, tus recetas favoritas, tus listas de compra, tus publicaciones, tus comentarios y las alergias que elijas.'],
  ['Para qué los usamos', 'Para que la app funcione (iniciar sesión, guardar tus favoritos, mostrar la comunidad) y para avisarte de lo que tú elijas, como recetas nuevas.'],
  ['Con quién se comparten', 'No vendemos tus datos. Tu nombre y tus publicaciones se muestran en la comunidad. Tus alergias son privadas.'],
  ['Tus derechos', 'Puedes pedir que corrijamos o eliminemos tu cuenta y tus datos escribiéndonos al correo de soporte de Cookly.'],
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [acepto, setAcepto] = useState(false);
  const [documento, setDocumento] = useState<Documento>(null);

  const [alergias, setAlergias] = useState<Alergia[]>([]);
  const [cargandoAlergias, setCargandoAlergias] = useState(false);
  const [falloAlergias, setFalloAlergias] = useState(false);
  const [elegidas, setElegidas] = useState<Set<number>>(new Set());
  const [guardando, setGuardando] = useState(false);

  // Entrada suave de cada paso
  const entrada = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    entrada.setValue(0);
    Animated.timing(entrada, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [paso, entrada]);

  // El botón "atrás" del celular no debe sacar a la persona de aquí.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (documento) setDocumento(null);
      else if (paso === 2) setPaso(1);
      return true;
    });
    return () => sub.remove();
  }, [paso, documento]);

  const cargarAlergias = useCallback(async () => {
    setCargandoAlergias(true);
    setFalloAlergias(false);
    try {
      const { data } = await api.get('/catalogos');
      setAlergias((data?.alergias ?? []) as Alergia[]);
    } catch {
      setFalloAlergias(true);
    } finally {
      setCargandoAlergias(false);
    }
  }, []);

  useEffect(() => {
    if (paso === 2 && alergias.length === 0 && !cargandoAlergias) cargarAlergias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso]);

  const terminar = async () => {
    if (usuario?.correo) await marcarOnboarding(usuario.correo);
    router.replace('/(tabs)/home');
  };

  const alternar = (id: number) =>
    setElegidas((prev) => {
      const sig = new Set(prev);
      if (sig.has(id)) sig.delete(id);
      else sig.add(id);
      return sig;
    });

  const guardarYContinuar = async () => {
    if (guardando) return;
    setGuardando(true);
    try {
      if (elegidas.size > 0) await api.put('/perfil/alergias', { ids: Array.from(elegidas) });
      await terminar();
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e?.response?.data?.mensaje || 'Revisa tu conexión e inténtalo de nuevo, o toca "Omitir por ahora".');
    } finally {
      setGuardando(false);
    }
  };

  const textoDoc = documento === 'privacidad' ? TEXTO_PRIVACIDAD : TEXTO_TERMINOS;

  return (
    <View style={st.pantalla}>
      <View style={st.circuloFondo} />

      <View style={[st.cabecera, { paddingTop: insets.top + 14 }]}>
        <Logo size={34} />
        <View style={st.puntos}>
          <View style={[st.punto, paso === 1 && st.puntoActivo]} />
          <View style={[st.punto, paso === 2 && st.puntoActivo]} />
        </View>
      </View>

      <Animated.View
        style={{ flex: 1, opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}
      >
        {paso === 1 ? (
          <ScrollView contentContainerStyle={st.contenido} showsVerticalScrollIndicator={false}>
            <Text style={st.titulo}>Antes de empezar</Text>
            <Text style={st.sub}>Lee y acepta nuestros términos para usar Cookly.</Text>

            <View style={st.tarjeta}>
              <Text style={st.tarjetaTitulo}>Términos y condiciones</Text>
              {RESUMEN_TERMINOS.map((t) => (
                <View key={t.n} style={st.punto4}>
                  <View style={[st.numero, { backgroundColor: t.fondo }]}>
                    <Text style={st.numeroTexto}>{t.n}</Text>
                  </View>
                  <Text style={st.puntoTexto}>
                    <Text style={st.puntoNegrita}>{t.titulo} </Text>
                    {t.texto}
                  </Text>
                </View>
              ))}
              <Pressable onPress={() => setDocumento('terminos')} style={st.leerTodo} hitSlop={10}>
                <Text style={st.leerTodoTexto}>Leer todo</Text>
              </Pressable>
            </View>

            <Pressable style={st.aceptoFila} onPress={() => setAcepto((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: acepto }}>
              <View style={[st.caja, acepto && st.cajaMarcada]}>
                {acepto ? <Ionicons name="checkmark" size={18} color={colors.white} /> : null}
              </View>
              <Text style={st.aceptoTexto}>
                He leído y acepto los{' '}
                <Text style={st.enlace} onPress={() => setDocumento('terminos')}>Términos y condiciones</Text> y la{' '}
                <Text style={st.enlace} onPress={() => setDocumento('privacidad')}>Política de privacidad</Text>.
              </Text>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={st.contenido} showsVerticalScrollIndicator={false}>
            <Text style={st.titulo}>¿Tienes alguna alergia?</Text>
            <Text style={st.sub}>
              Marcaremos en <Text style={{ color: colors.danger, fontFamily: fonts.bodyBold }}>rojo</Text> los ingredientes que debes evitar.
            </Text>

            {cargandoAlergias ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : falloAlergias ? (
              <View style={{ alignItems: 'center', marginTop: 30 }}>
                <Text style={st.sub}>No pudimos cargar la lista.</Text>
                <Presionable onPress={cargarAlergias} style={st.reintentar}>
                  <Text style={st.reintentarTexto}>Reintentar</Text>
                </Presionable>
              </View>
            ) : (
              <View style={st.chips}>
                {alergias.map((a) => {
                  const on = elegidas.has(a.id);
                  return (
                    <Pressable key={a.id} onPress={() => alternar(a.id)} style={[st.chip, on && st.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                      <View style={[st.chipCirculo, on && st.chipCirculoOn]}>
                        {on ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                      </View>
                      <Text style={st.chipTexto}>{a.nombre}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {elegidas.size > 0 && (
              <View style={st.aviso}>
                <View style={st.avisoIcono}>
                  <Ionicons name="warning-outline" size={20} color={colors.white} />
                </View>
                <Text style={st.avisoTexto}>
                  <Text style={st.puntoNegrita}>{elegidas.size} {elegidas.size === 1 ? 'seleccionada' : 'seleccionadas'}. </Text>
                  Verás una alerta en las recetas con esos ingredientes.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </Animated.View>

      <View style={[st.pie, { paddingBottom: insets.bottom + 14 }]}>
        {paso === 2 && <Text style={st.pieNota}>Puedes cambiarlo después en tu perfil.</Text>}
        <Presionable
          escalaAlPresionar={0.97}
          disabled={(paso === 1 && !acepto) || guardando}
          onPress={() => (paso === 1 ? setPaso(2) : guardarYContinuar())}
          style={[st.boton, paso === 1 && !acepto && { opacity: 0.5 }]}
          accessibilityLabel={paso === 1 ? 'Continuar' : 'Guardar y continuar'}
        >
          <Text style={st.botonTexto}>{paso === 1 ? 'Continuar' : 'Guardar y continuar'}</Text>
          <View style={st.botonFlecha}>
            {guardando ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="arrow-forward" size={22} color={colors.primary} />}
          </View>
        </Presionable>
        {paso === 2 && (
          <Pressable onPress={terminar} hitSlop={10} style={{ alignSelf: 'center', marginTop: 12 }}>
            <Text style={st.omitir}>Omitir por ahora</Text>
          </Pressable>
        )}
      </View>

      {/* Texto completo de términos o privacidad */}
      <Modal visible={documento !== null} transparent animationType="slide" onRequestClose={() => setDocumento(null)}>
        <View style={st.modalFondo}>
          <View style={[st.modalHoja, { paddingBottom: insets.bottom + 16 }]}>
            <View style={st.modalCabecera}>
              <Text style={st.modalTitulo}>{documento === 'privacidad' ? 'Política de privacidad' : 'Términos y condiciones'}</Text>
              <Pressable onPress={() => setDocumento(null)} style={st.modalCerrar} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {textoDoc.map(([t, c]) => (
                <View key={t} style={{ marginBottom: 16 }}>
                  <Text style={st.docTitulo}>{t}</Text>
                  <Text style={st.docTexto}>{c}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  circuloFondo: {
    position: 'absolute', top: -130, right: -110, width: 330, height: 330, borderRadius: 165, backgroundColor: colors.primaryLight, opacity: 0.8,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 6 },
  puntos: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryLight },
  puntoActivo: { width: 24, backgroundColor: colors.primary },
  contenido: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 24 },
  titulo: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.textMuted, marginTop: 6 },
  tarjeta: {
    backgroundColor: colors.white, borderRadius: 28, padding: 20, marginTop: 20,
    shadowColor: colors.text, shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 3,
  },
  tarjetaTitulo: { fontFamily: fonts.heading, fontSize: 18, color: colors.text, marginBottom: 14 },
  punto4: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  numero: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numeroTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.text },
  puntoTexto: { flex: 1, fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, color: colors.text },
  puntoNegrita: { fontFamily: fonts.bodyBold },
  leerTodo: { alignSelf: 'center', paddingVertical: 4 },
  leerTodoTexto: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary },
  aceptoFila: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  caja: { width: 30, height: 30, borderRadius: 10, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  cajaMarcada: { backgroundColor: colors.primary },
  aceptoTexto: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  enlace: { fontFamily: fonts.bodyBold, color: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryLight, borderRadius: 24,
    paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1.5, borderColor: 'transparent',
  },
  chipOn: { backgroundColor: '#FFEDEE', borderColor: colors.danger },
  chipCirculo: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  chipCirculoOn: { backgroundColor: colors.danger, borderColor: colors.danger },
  chipTexto: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFEDEE', borderRadius: 24, padding: 14, marginTop: 26 },
  avisoIcono: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  avisoTexto: { flex: 1, fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, color: colors.text },
  reintentar: { marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 28 },
  reintentarTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.white },
  pie: { paddingHorizontal: 24, paddingTop: 10 },
  pieNota: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 12 },
  boton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 64, borderRadius: 32,
    backgroundColor: colors.primary, paddingLeft: 28, paddingRight: 8,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 7,
  },
  botonTexto: { fontFamily: fonts.heading, fontSize: 18, color: colors.white },
  botonFlecha: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  omitir: { fontFamily: fonts.heading, fontSize: 15, color: colors.textMuted },
  modalFondo: { flex: 1, backgroundColor: 'rgba(43,18,32,0.45)', justifyContent: 'flex-end' },
  modalHoja: { backgroundColor: colors.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 20, maxHeight: '80%' },
  modalCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitulo: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  modalCerrar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  docTitulo: { fontFamily: fonts.heading, fontSize: 16, color: colors.text, marginBottom: 4 },
  docTexto: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },
});