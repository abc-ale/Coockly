// app/cambiar-nombre.tsx
// Cambiar nombre según el mockup: avatar con la inicial, campo con contador y botón "Guardar nombre".
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { Presionable, Rebote } from '../components/Animaciones';
import { mostrarAviso } from '../components/Aviso';
import { exito } from '../lib/vibracion';

const LIMITE = 30;

export default function CambiarNombreScreen() {
  const insets = useSafeAreaInsets();
  const { usuario, actualizarNombre } = useAuth();
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [enfocado, setEnfocado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const campoRef = useRef<TextInput>(null);

  const limpio = nombre.trim();
  const inicial = limpio.charAt(0).toUpperCase() || 'C';
  const cambio = limpio !== (usuario?.nombre ?? '');
  const valido = limpio.length >= 2 && cambio;

  const guardar = async () => {
    if (guardando) return;
    if (limpio.length < 2) {
      Alert.alert('Nombre muy corto', 'Escribe al menos 2 letras.');
      return;
    }
    if (!cambio) {
      router.back();
      return;
    }
    setGuardando(true);
    try {
      const enComunidad = await actualizarNombre(limpio);
      exito();
      mostrarAviso(enComunidad ? 'Nombre actualizado' : 'Nombre guardado, pero la Comunidad aún no lo ve', enComunidad ? 'exito' : 'info');
      router.back();
    } catch (e: any) {
      Alert.alert('No se pudo cambiar', e?.response?.data?.mensaje || 'Revisa tu conexión e inténtalo de nuevo.');
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
          <Text style={st.titulo}>Cambiar nombre</Text>
        </View>
        <Text style={st.subtitulo}>¿Cómo quieres que te llamen?</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.cuerpo} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Rebote>
          <View style={st.avatar}>
            <Text style={st.avatarLetra}>{inicial}</Text>
          </View>
        </Rebote>

        <Text style={st.etiqueta}>Tu nombre</Text>
        <Pressable style={[st.campo, enfocado && st.campoEnfocado]} onPress={() => campoRef.current?.focus()}>
          <Ionicons name="person-outline" size={20} color={colors.primary} />
          <TextInput
            ref={campoRef}
            autoFocus
            editable
            style={st.input}
            value={nombre}
            onChangeText={setNombre}
            onFocus={() => setEnfocado(true)}
            onBlur={() => setEnfocado(false)}
            placeholder="Tu nombre"
            placeholderTextColor="#A8959D"
            maxLength={LIMITE}
            returnKeyType="done"
            onSubmitEditing={guardar}
            autoCapitalize="words"
            selectionColor={colors.primary}
          />
          <Text style={st.contador}>{nombre.length}/{LIMITE}</Text>
        </Pressable>
        <Text style={st.nota}>Este nombre lo verán los demás en la comunidad y en tus reseñas.</Text>
      </ScrollView>

      <View style={[st.pie, { paddingBottom: insets.bottom + 16 }]}>
        <Presionable
          escalaAlPresionar={0.97}
          onPress={guardar}
          disabled={guardando || !valido}
          style={[st.boton, !valido && { opacity: 0.5 }]}
          accessibilityLabel="Guardar nombre"
        >
          <Text style={st.botonTexto}>Guardar nombre</Text>
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
  titulo: { fontFamily: fonts.display, fontSize: 32, lineHeight: 40, color: colors.text },
  subtitulo: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, marginTop: 2 },
  cuerpo: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 },
  avatar: {
    alignSelf: 'center', width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: 'center',
    justifyContent: 'center', borderWidth: 4, borderColor: colors.white, marginBottom: 28,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 7,
  },
  avatarLetra: { fontFamily: fonts.display, fontSize: 44, lineHeight: 54, color: colors.white },
  etiqueta: { fontFamily: fonts.heading, fontSize: 15, color: colors.text, marginBottom: 8 },
  campo: {
    flexDirection: 'row', alignItems: 'center', gap: 12, height: 58, backgroundColor: colors.white, borderRadius: 29,
    paddingHorizontal: 18, borderWidth: 2, borderColor: colors.primaryLight,
  },
  campoEnfocado: {
    borderColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  input: { flex: 1, height: 52, fontFamily: fonts.body, fontSize: 17, color: colors.text, padding: 0 },
  contador: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  nota: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 12, paddingHorizontal: 6 },
  pie: { paddingHorizontal: 20, paddingTop: 10 },
  boton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 64, borderRadius: 32,
    backgroundColor: colors.primary, paddingLeft: 28, paddingRight: 8,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 7,
  },
  botonTexto: { fontFamily: fonts.heading, fontSize: 18, color: colors.white },
  botonCirculo: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});