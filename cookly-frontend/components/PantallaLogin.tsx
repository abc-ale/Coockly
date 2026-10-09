import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FondoBlobs from './FondoBlobs';
import Logo from './Logo';
import { colors, fonts } from '../constants/theme';

type Props = {
  onLogin: (email: string, password: string) => void;
  onGoogle: () => void;
  onFacebook: () => void;
  onRegistro: () => void;
  onOlvide: () => void;
  cargando?: boolean;
};

const ROSA_BORDE = '#F4A6BC';

export default function PantallaLogin({
  onLogin, onGoogle, onFacebook, onRegistro, onOlvide, cargando,
}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);

  return (
    <View style={s.fondo}>
      <FondoBlobs variante="login" />
      <Image source={require('../assets/images/decor-tomate.png')} style={s.tomate} resizeMode="contain" />
      <Image source={require('../assets/images/decor-pimiento.png')} style={s.pimiento} resizeMode="contain" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center' }}>
            <Logo size={74} variante="rosa" conTexto colorTexto={colors.primary} />
          </View>

          <Text style={s.titulo}>¡Qué rico verte{'\n'}de nuevo!</Text>
          <Text style={s.sub}>Inicia sesión para descubrir{'\n'}tu próxima receta.</Text>

          <View style={s.campo}>
            <Ionicons name="mail-outline" size={22} color={colors.text} />
            <TextInput
              style={s.input} placeholder="Correo electrónico" placeholderTextColor={colors.textMuted}
              autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}
            />
          </View>

          <View style={s.campo}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.text} />
            <TextInput
              style={s.input} placeholder="Contraseña" placeholderTextColor={colors.textMuted}
              secureTextEntry={!ver} value={password} onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setVer(!ver)} hitSlop={10}>
              <Ionicons name={ver ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onOlvide} style={{ alignSelf: 'flex-end', marginBottom: 16 }}>
            <Text style={s.olvide}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.boton} activeOpacity={0.85} onPress={() => onLogin(email.trim(), password)} disabled={cargando}>
            {cargando ? <ActivityIndicator color="#fff" /> : <Text style={s.botonTexto}>Iniciar sesión</Text>}
          </TouchableOpacity>

          <View style={s.separador}>
            <View style={s.linea} /><Text style={s.sepTexto}>o continúa con</Text><View style={s.linea} />
          </View>

          <TouchableOpacity style={s.red} onPress={onGoogle} activeOpacity={0.8}>
            <Ionicons name="logo-google" size={22} color="#DB4437" />
            <Text style={s.redTexto}>Continuar con Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.red} onPress={onFacebook} activeOpacity={0.8}>
            <Ionicons name="logo-facebook" size={22} color="#1877F2" />
            <Text style={s.redTexto}>Continuar con Facebook</Text>
          </TouchableOpacity>

          <View style={s.pie}>
            <Text style={s.pieTexto}>¿Aún no tienes cuenta? </Text>
            <TouchableOpacity onPress={onRegistro}>
              <Text style={s.registrate}>Regístrate</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.background },
  tomate: { position: 'absolute', top: 30, right: -34, width: 120, height: 125 },
  pimiento: { position: 'absolute', bottom: -18, left: -14, width: 130, height: 110 },
  contenido: { paddingHorizontal: 26, paddingTop: 56, paddingBottom: 110 },
  titulo: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.text, textAlign: 'center', marginTop: 20 },
  sub: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 22 },
  campo: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff',
    borderRadius: 999, borderWidth: 1.5, borderColor: ROSA_BORDE,
    paddingHorizontal: 20, height: 54, marginBottom: 12,
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text },
  olvide: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },
  boton: {
    backgroundColor: colors.primary, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  botonTexto: { fontFamily: fonts.heading, color: '#fff', fontSize: 17 },
  separador: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  linea: { flex: 1, height: 1, backgroundColor: ROSA_BORDE, opacity: 0.6 },
  sepTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  red: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 52, borderRadius: 999, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.text, marginBottom: 12,
  },
  redTexto: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  pie: { flexDirection: 'row', justifyContent: 'center', marginTop: 14 },
  pieTexto: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 14 },
  registrate: { fontFamily: fonts.bodyBold, color: colors.primary, fontSize: 14 },
});