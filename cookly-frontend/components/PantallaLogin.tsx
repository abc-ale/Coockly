// components/PantallaLogin.tsx
// Pantalla de acceso según el mockup: franja rosada con foto y logo arriba y una tarjeta crema con
// las pestañas Iniciar sesión / Registrarse. Las pestañas cambian el formulario en el mismo lugar
// (sin ir a otra pantalla): el indicador rosado se desliza y los campos entran con una transición.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Animated, Easing, LayoutChangeEvent,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logo from './Logo';
import Button from './Button';
import { Aparecer, Presionable } from './Animaciones';
import { colors, fonts } from '../constants/theme';
import { seleccion, toque } from '../lib/vibracion';

type Props = {
  onLogin: (email: string, password: string) => void;
  onRegistrar: (nombre: string, email: string, password: string) => void;
  onGoogle: () => void;
  onFacebook: () => void;
  onOlvide: () => void;
  cargando?: boolean;          // entrando con correo
  cargandoRegistro?: boolean;  // creando la cuenta
};

type Modo = 'login' | 'registro';
type Foco = 'nombre' | 'email' | 'password' | null;

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
  onLogin, onRegistrar, onGoogle, onFacebook, onOlvide, cargando, cargandoRegistro,
}: Props) {
  const insets = useSafeAreaInsets();
  const [modo, setModo] = useState<Modo>('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [foco, setFoco] = useState<Foco>(null);
  const [anchoPestanas, setAnchoPestanas] = useState(0);

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

  // Indicador de la pestaña activa: se desliza de una a otra.
  const posicion = useRef(new Animated.Value(0)).current;
  const anchoIndicador = Math.max((anchoPestanas - 8) / 2, 0);
  function cambiarModo(nuevo: Modo) {
    if (nuevo === modo) return;
    seleccion();
    setModo(nuevo);
    Animated.spring(posicion, { toValue: nuevo === 'login' ? 0 : 1, friction: 7, tension: 120, useNativeDriver: true }).start();
  }

  const esRegistro = modo === 'registro';

  return (
    <View style={s.fondo}>
      {/* Franja rosada y figuras de la marca */}
      <View style={s.franja} />
      <View style={[s.figura, { width: 90, height: 90, borderRadius: 45, top: 104, left: -34, backgroundColor: colors.accent }]} />
      <View style={[s.figura, { width: 26, height: 26, borderRadius: 13, top: 84, right: 170, backgroundColor: colors.magic }]} />
      <View style={[s.figura, { width: 60, height: 60, borderRadius: 30, top: 205, right: 20, backgroundColor: colors.primary, opacity: 0.18 }]} />

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
          contentContainerStyle={{ paddingTop: 248, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Aparecer distancia={26} style={[s.tarjeta, { paddingBottom: 40 + insets.bottom }]}>
            {/* Pestañas */}
            <View style={s.pestanas} onLayout={(e: LayoutChangeEvent) => setAnchoPestanas(e.nativeEvent.layout.width)}>
              <Animated.View
                pointerEvents="none"
                style={[
                  s.indicador,
                  {
                    width: anchoIndicador,
                    transform: [{ translateX: posicion.interpolate({ inputRange: [0, 1], outputRange: [0, anchoIndicador] }) }],
                  },
                ]}
              />
              <TouchableOpacity style={s.pestana} activeOpacity={0.8} onPress={() => cambiarModo('login')}>
                <Text style={[s.pestanaTexto, { color: esRegistro ? colors.textMuted : colors.white }]}>Iniciar sesión</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.pestana} activeOpacity={0.8} onPress={() => cambiarModo('registro')}>
                <Text style={[s.pestanaTexto, { color: esRegistro ? colors.white : colors.textMuted }]}>Registrarse</Text>
              </TouchableOpacity>
            </View>

            {/* Formulario: cada vez que cambia el modo entra con una pequeña animación */}
            <Aparecer key={modo} distancia={14}>
              {esRegistro && (
                <Campo icono="person-outline" enfocado={foco === 'nombre'}>
                  <TextInput
                    style={s.input}
                    placeholder="Nombre completo"
                    placeholderTextColor={colors.textMuted}
                    value={nombre}
                    onChangeText={setNombre}
                    onFocus={() => setFoco('nombre')}
                    onBlur={() => setFoco(null)}
                  />
                </Campo>
              )}

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
                  placeholder={esRegistro ? 'Crea una contraseña' : 'Contraseña'}
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

              {esRegistro ? (
                <View style={s.ayudaWrap}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
                  <Text style={s.ayuda}>Mínimo 10 caracteres para proteger tu cuenta.</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={onOlvide} style={s.olvideWrap} hitSlop={8}>
                  <Text style={s.olvide}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              )}

              {esRegistro ? (
                <Button
                  label="Crear cuenta"
                  variant="flecha"
                  loading={cargandoRegistro}
                  onPress={() => onRegistrar(nombre.trim(), email.trim(), password)}
                />
              ) : (
                <Button
                  label="Iniciar sesión"
                  variant="flecha"
                  loading={cargando}
                  onPress={() => onLogin(email.trim(), password)}
                />
              )}

              <View style={s.separador}>
                <View style={s.linea} />
                <Text style={s.sepTexto}>{esRegistro ? 'o regístrate con' : 'o continúa con'}</Text>
                <View style={s.linea} />
              </View>

              <View style={s.redes}>
                <View style={{ flex: 1 }}>
                  <Presionable style={s.red} onPress={onGoogle}>
                    <Ionicons name="logo-google" size={20} color="#DB4437" />
                    <Text style={s.redTexto}>Google</Text>
                  </Presionable>
                </View>
                <View style={{ flex: 1 }}>
                  <Presionable style={s.red} onPress={onFacebook}>
                    <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                    <Text style={s.redTexto}>Facebook</Text>
                  </Presionable>
                </View>
              </View>

              <View style={s.pie}>
                <Text style={s.pieTexto}>{esRegistro ? '¿Ya tienes cuenta? ' : '¿Aún no tienes cuenta? '}</Text>
                <TouchableOpacity onPress={() => cambiarModo(esRegistro ? 'login' : 'registro')} hitSlop={8}>
                  <Text style={s.registrate}>{esRegistro ? 'Inicia sesión' : 'Regístrate'}</Text>
                </TouchableOpacity>
              </View>
            </Aparecer>
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
    position: 'absolute', width: 190, height: 190, borderRadius: 95, right: -30, top: 52,
    borderWidth: 6, borderColor: colors.background, backgroundColor: colors.primaryLight,
    shadowColor: colors.text, shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10,
  },
  logo: { position: 'absolute', top: 50, left: 24 },
  titular: {
    position: 'absolute', top: 142, left: 24, width: 170,
    fontFamily: fonts.display, fontSize: 28, lineHeight: 31, letterSpacing: -0.5, color: colors.text,
  },
  tarjeta: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 40,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -12 },
    elevation: 10,
  },
  pestanas: {
    height: 52, borderRadius: 26, backgroundColor: colors.primaryLight,
    flexDirection: 'row', padding: 4, marginBottom: 16,
  },
  indicador: {
    position: 'absolute', top: 4, left: 4, bottom: 4, borderRadius: 22, backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  pestana: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pestanaTexto: { fontFamily: fonts.heading, fontSize: 15 },
  campo: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white,
    borderRadius: 999, borderWidth: 1.5, borderColor: colors.primaryLight,
    paddingHorizontal: 20, height: 52, marginBottom: 10,
    shadowColor: colors.text, shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  campoEnfocado: { borderColor: colors.primary },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text, paddingVertical: 0 },
  olvideWrap: { alignSelf: 'flex-end', marginTop: 0, marginBottom: 14, marginRight: 6 },
  olvide: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  ayudaWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 0, marginBottom: 14, marginLeft: 8 },
  ayuda: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted },
  separador: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 14 },
  linea: { flex: 1, height: 1.5, backgroundColor: colors.primaryLight },
  sepTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  redes: { flexDirection: 'row', gap: 12 },
  red: {
    height: 52, borderRadius: 26, backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: colors.primaryLight,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: colors.text, shadowOpacity: 0.05, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  redTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  pie: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  pieTexto: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 14 },
  registrate: { fontFamily: fonts.heading, color: colors.primary, fontSize: 14 },
});