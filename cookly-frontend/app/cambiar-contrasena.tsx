// app/cambiar-contrasena.tsx
// Cambiar contraseña según el mockup: tres campos con ojito, barra de seguridad y lista de requisitos.
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../constants/theme';
import { api } from '../lib/api';
import { exito } from '../lib/vibracion';
import { mostrarAviso } from '../components/Aviso';
import { Presionable } from '../components/Animaciones';

const MINIMO = 10; // el servidor exige al menos 10 caracteres
const VERDE = '#2F7D3B';
const ETIQUETAS = ['Muy débil', 'Débil', 'Regular', 'Buena', 'Fuerte'];

function Campo({
  etiqueta, valor, alCambiar, mostrar, alMostrar, autoFocus,
}: {
  etiqueta: string; valor: string; alCambiar: (t: string) => void; mostrar: boolean; alMostrar: () => void; autoFocus?: boolean;
}) {
  const [enfocado, setEnfocado] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={st.etiqueta}>{etiqueta}</Text>
      <View style={[st.campo, enfocado && st.campoEnfocado]}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
        <TextInput
          style={st.input}
          value={valor}
          onChangeText={alCambiar}
          secureTextEntry={!mostrar}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          placeholder="••••••••"
          placeholderTextColor="#A8959D"
          selectionColor={colors.primary}
          maxLength={72}
        />
        <Pressable onPress={alMostrar} hitSlop={10} accessibilityLabel={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          <Ionicons name={mostrar ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

function Requisito({ cumple, texto }: { cumple: boolean; texto: string }) {
  return (
    <View style={st.requisito}>
      <View style={[st.requisitoCirculo, cumple && st.requisitoOk]}>
        {cumple ? <Ionicons name="checkmark" size={14} color={VERDE} /> : null}
      </View>
      <Text style={[st.requisitoTexto, !cumple && { color: colors.textMuted }]}>{texto}</Text>
    </View>
  );
}

export default function CambiarContrasenaScreen() {
  const insets = useSafeAreaInsets();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ver, setVer] = useState({ actual: false, nueva: false, confirmar: false });
  const [guardando, setGuardando] = useState(false);
  // false = la cuenta entró con Google y todavía no tiene contraseña: no se pide la actual.
  const [tienePropia, setTienePropia] = useState(true);

  useEffect(() => {
    api.get('/perfil/contrasena/estado')
      .then(({ data }) => setTienePropia(data?.tienePropia !== false))
      .catch(() => {});
  }, []);

  const largo = nueva.length >= MINIMO;
  const mayusNumero = /[A-ZÁÉÍÓÚÑ]/.test(nueva) && /\d/.test(nueva);
  const coincide = nueva.length > 0 && nueva === confirmar;
  const todoOk = (!tienePropia || actual.length > 0) && largo && mayusNumero && coincide;

  // Seguridad: 0 a 4 puntos (largo, mayúscula y número, símbolo, largo de 14 o más).
  const puntos = useMemo(() => {
    if (!nueva) return 0;
    let p = 0;
    if (largo) p++;
    if (mayusNumero) p++;
    if (/[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñ]/.test(nueva)) p++;
    if (nueva.length >= 14) p++;
    return p;
  }, [nueva, largo, mayusNumero]);
  const etiquetaSeguridad = nueva ? ETIQUETAS[puntos] : 'Escribe tu nueva contraseña';
  const colorSeguridad = puntos <= 1 ? colors.danger : puntos === 2 ? '#D99A00' : VERDE;

  const guardar = async () => {
    if (guardando || !todoOk) return;
    setGuardando(true);
    try {
      await api.put('/perfil/contrasena', { contrasenaActual: tienePropia ? actual : undefined, contrasenaNueva: nueva });
      exito();
      mostrarAviso('Contraseña actualizada', 'exito');
      router.back();
    } catch (e: any) {
      Alert.alert('No se pudo cambiar', e?.response?.data?.mensaje || 'Revisa tu contraseña actual e inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={st.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
          <Text style={st.titulo}>Cambiar contraseña</Text>
        </View>
        <Text style={st.subtitulo}>Mantén tu cuenta segura</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.cuerpo}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!tienePropia ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginBottom: 12 }}>
            Entraste con Google, así que aún no tienes contraseña. Crea una para poder entrar también con tu correo.
          </Text>
        ) : (
          <Campo etiqueta="Contraseña actual" valor={actual} alCambiar={setActual} mostrar={ver.actual} alMostrar={() => setVer((v) => ({ ...v, actual: !v.actual }))} />
        )}
        <Campo etiqueta="Nueva contraseña" valor={nueva} alCambiar={setNueva} mostrar={ver.nueva} alMostrar={() => setVer((v) => ({ ...v, nueva: !v.nueva }))} />
        <Campo etiqueta="Confirmar contraseña" valor={confirmar} alCambiar={setConfirmar} mostrar={ver.confirmar} alMostrar={() => setVer((v) => ({ ...v, confirmar: !v.confirmar }))} />

        <View style={st.barra}>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={[st.barraTramo, n <= puntos && { backgroundColor: colorSeguridad }]} />
          ))}
        </View>
        <Text style={[st.seguridad, nueva ? { color: colorSeguridad } : { color: colors.textMuted }]}>
          {nueva ? `Seguridad: ${etiquetaSeguridad.toLowerCase()}` : etiquetaSeguridad}
        </Text>

        <View style={{ marginTop: 12, gap: 10 }}>
          <Requisito cumple={largo} texto={`Mínimo ${MINIMO} caracteres`} />
          <Requisito cumple={mayusNumero} texto="Una mayúscula y un número" />
          <Requisito cumple={coincide} texto="Coincide con la confirmación" />
        </View>
      </ScrollView>

      <View style={[st.pie, { paddingBottom: insets.bottom + 16 }]}>
        <Presionable
          escalaAlPresionar={0.97}
          onPress={guardar}
          disabled={guardando || !todoOk}
          style={[st.boton, !todoOk && { opacity: 0.5 }]}
          accessibilityLabel="Actualizar contraseña"
        >
          <Text style={st.botonTexto}>Actualizar contraseña</Text>
          <View style={st.botonCirculo}>
            {guardando ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="checkmark" size={24} color={colors.primary} />}
          </View>
        </Presionable>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  cabecera: {
    backgroundColor: colors.primaryLight, borderBottomLeftRadius: 44, borderBottomRightRadius: 44,
    paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden',
  },
  decoGrande: { position: 'absolute', top: -70, right: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: '#FBE9EC' },
  decoVerde: { position: 'absolute', top: 120, left: 232, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.magic },
  cabeceraFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  volver: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.text, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  tituloCaja: { alignSelf: 'flex-start', marginTop: 10 },
  resaltado: { position: 'absolute', left: -6, right: -6, bottom: 4, height: 16, borderRadius: 8, backgroundColor: colors.accent },
  titulo: { fontFamily: fonts.display, fontSize: 31, lineHeight: 40, color: colors.text },
  subtitulo: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, marginTop: 2 },
  cuerpo: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
  etiqueta: { fontFamily: fonts.heading, fontSize: 14, color: colors.text, marginBottom: 8, marginLeft: 6 },
  campo: {
    flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, backgroundColor: colors.white, borderRadius: 28,
    paddingHorizontal: 18, borderWidth: 2, borderColor: 'transparent',
    shadowColor: colors.text, shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },
  campoEnfocado: { borderColor: colors.primary },
  input: { flex: 1, height: 52, fontFamily: fonts.body, fontSize: 16, color: colors.text, padding: 0 },
  barra: { flexDirection: 'row', gap: 8, marginTop: 6 },
  barraTramo: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.primaryLight },
  seguridad: { fontFamily: fonts.heading, fontSize: 14, marginTop: 8 },
  requisito: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  requisitoCirculo: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  requisitoOk: { backgroundColor: colors.magic },
  requisitoTexto: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  pie: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: colors.background },
  boton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 64, borderRadius: 32,
    backgroundColor: colors.primary, paddingLeft: 28, paddingRight: 8,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 7,
  },
  botonTexto: { fontFamily: fonts.heading, fontSize: 18, color: colors.white },
  botonCirculo: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});