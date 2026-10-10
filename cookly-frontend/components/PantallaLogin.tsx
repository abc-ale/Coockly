// components/PantallaLogin.tsx
// Pantalla de inicio de sesión según el mockup: franja rosada con plato y logo arriba,
// tarjeta crema que sube con las pestañas Iniciar sesión / Registrarse, campos, Google y Facebook.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Animated, Easing,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Logo from './Logo';
import Button from './Button';
import { Aparecer, Presionable } from './Animaciones';
import { colors, fonts } from '../constants/theme';
import { seleccion, toque } from '../lib/vibracion';

type Props = {
  onLogin: (email: string, password: string) => void;
  onGoogle: () => void;
  onFacebook: () => void;
  onRegistro: () => void;
  onOlvide: () => void;
  cargando?: boolean;
};

// Foto del lomo saltado en Cloudinary (reducida a 700 px de ancho para que cargue rápido).
const URL_PLATO = 'https://res.cloudinary.com/pjbmwoxn/image/upload/w_700,q_80/v1791668357/lomo-saltado.webp';

function Campo({
  icono, children, enfocado,
}: { icono: keyof typeof Ionicons.glyphMap; children: React.ReactNode; enfocado: boolean }) {
  return (
    <View style={[s.campo, enfocado && s.campoEnfocado]}>
      <Ionicons name={icono} size={20} color={colors.primary} />
      {children}
    </View>
  );
}

export default function PantallaLogin({
  onLogin, onGoogle, onFacebook, onRegistro, onOlvide, cargando,
}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [foco, setFoco] = useState<'email' | 'password' | null>(null);

  // El plato flota suavemente.
  const flota = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(flota, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flota, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    bucle.start();
    return () => bucle.stop();
  }, [flota]);

  return (
    <View style={s.fondo}>
      {/* Franja rosada y figuras de la marca */}
      <View style={s.franja} />
      <View style={[s.figura, { width: 90, height: 90, borderRadius: 45, top: 120, left: -28, backgroundColor: colors.accent }]} />
      <View style={[s.figura, { width: 26, height: 26, borderRadius: 13, top: 90, right: 150, backgroundColor: colors.magic }]} />
      <View style={[s.figura, { width: 60, height: 60, borderRadius: 30, top: 250, right: 20, backgroundColor: colors.primary, opacity: 0.18 }]} />

      <Animated.Image
        source={{ uri: URL_PLATO }}
        resizeMode="cover"
        style={[
          s.plato,
          {
            transform: [
              { translateY: flota.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
              { rotate: flota.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) },
            ],
          },
        ]}
      />

      <View style={s.logo}>
        <Logo size={48} variante="rosa" conTexto colorTexto={colors.primary} />
      </View>
      <Text style={s.titular}>Cocina fácil,{'\n'}a tu medida</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingTop: 300, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Aparecer distancia={26} style={s.tarjeta}>
            {/* Pestañas */}
            <View style={s.pestanas}>
              <View style={[s.pestana, s.pestanaActiva]}>
                <Text style={[s.pestanaTexto, { color: colors.white }]}>Iniciar sesión</Text>
              </View>
              <Presionable
                style={s.pestana}
                escalaAlPresionar={0.96}
                onPress={() => { seleccion(); onRegistro(); }}
              >
                <Text style={[s.pestanaTexto, { color: colors.textMuted }]}>Registrarse</Text>
              </Presionable>
            </View>

            <Campo icono="mail-outline" enfocado={foco === 'email'}>
              <TextInput
                style={s.input}
                placeholder="Correo electrónico"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFoco('email')}
                onBlur={() => setFoco(null)}
              />
            </Campo>

            <Campo icono="lock-closed-outline" enfocado={foco === 'password'}>
              <TextInput
                style={s.input}
                placeholder="Contraseña"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!ver}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFoco('password')}
                onBlur={() => setFoco(null)}
              />
              <TouchableOpacity onPress={() => { toque(); setVer(!ver); }} hitSlop={10}>
                <Ionicons name={ver ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Campo>

            <TouchableOpacity onPress={onOlvide} style={s.olvideWrap} hitSlop={8}>
              <Text style={s.olvide}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <Button
              label="Iniciar sesión"
              variant="flecha"
              loading={cargando}
              onPress={() => onLogin(email.trim(), password)}
            />

            <View style={s.separador}>
              <View style={s.linea} />
              <Text style={s.sepTexto}>o continúa con</Text>
              <View style={s.linea} />
            </View>

            <View style={s.redes}>
              <Presionable style={s.red} onPress={onGoogle}>
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={s.redTexto}>Google</Text>
              </Presionable>
              <Presionable style={s.red} onPress={onFacebook}>
                <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                <Text style={s.redTexto}>Facebook</Text>
              </Presionable>
            </View>

            <View style={s.pie}>
              <Text style={s.pieTexto}>¿Aún no tienes cuenta? </Text>
              <TouchableOpacity onPress={onRegistro} hitSlop={8}>
                <Text style={s.registrate}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </Aparecer>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.primaryLight },
  franja: { position: 'absolute', top: 0, left: 0, right: 0, height: 360, backgroundColor: colors.primaryLight },
  figura: { position: 'absolute' },
  plato: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125, right: -50, top: 50,
    borderWidth: 6, borderColor: colors.background, backgroundColor: colors.primaryLight,
    shadowColor: colors.text, shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10,
  },
  logo: { position: 'absolute', top: 56, left: 24 },
  titular: {
    position: 'absolute', top: 160, left: 24, width: 200,
    fontFamily: fonts.display, fontSize: 30, lineHeight: 32, letterSpacing: -0.5, color: colors.text,
  },
  tarjeta: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 40,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -12 },
    elevation: 10,
  },
  pestanas: {
    height: 52, borderRadius: 26, backgroundColor: colors.primaryLight,
    flexDirection: 'row', padding: 4, marginBottom: 22,
  },
  pestana: { flex: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pestanaActiva: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  pestanaTexto: { fontFamily: fonts.heading, fontSize: 15 },
  campo: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white,
    borderRadius: 999, borderWidth: 1.5, borderColor: colors.primaryLight,
    paddingHorizontal: 20, height: 54, marginBottom: 12,
    shadowColor: colors.text, shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  campoEnfocado: { borderColor: colors.primary },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text, paddingVertical: 0 },
  olvideWrap: { alignSelf: 'flex-end', marginTop: 2, marginBottom: 18, marginRight: 6 },
  olvide: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  separador: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, marginBottom: 18 },
  linea: { flex: 1, height: 1.5, backgroundColor: colors.primaryLight },
  sepTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  redes: { flexDirection: 'row', gap: 12 },
  red: {
    flex: 1, height: 54, borderRadius: 27, backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: colors.primaryLight,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: colors.text, shadowOpacity: 0.05, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  redTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  pie: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  pieTexto: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 14 },
  registrate: { fontFamily: fonts.heading, color: colors.primary, fontSize: 14 },
});