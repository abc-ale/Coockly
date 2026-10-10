// app/login.tsx  (bienvenida + login en un solo pager)
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { router, Redirect } from 'expo-router';
import FondoBlobs from '../components/FondoBlobs';
import PantallaLogin from '../components/PantallaLogin';
import Logo from '../components/Logo';
import { colors, fonts, spacing, typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { despertarServidor } from '../lib/api';
import { mostrarAlerta } from '../components/Dialogo';

// Mensaje claro según qué falló (servidor dormido, red caída, error del backend...).
function mensajeDeError(error: any, porDefecto: string) {
  if (error?.response?.data?.mensaje) return error.response.data.mensaje;
  if (error?.code === 'ECONNABORTED' || error?.message === 'Network Error' || error?.response?.status >= 502) {
    return 'El servidor está despertando. Espera unos segundos e inténtalo de nuevo.';
  }
  return porDefecto;
}

// Sartén de Cookly girando mientras se entra a la app.
function CargandoCookly() {
  const giro = useRef(new Animated.Value(0)).current;
  const latido = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(giro, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(latido, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(latido, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotar = giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const escala = latido.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <View style={s.overlay}>
      <Animated.Image
        source={require('../assets/images/isotipo-rosa.png')}
        style={{ width: 96, height: 96, resizeMode: 'contain', transform: [{ rotate: rotar }, { scale: escala }] }}
      />
      <Text style={s.overlayTexto}>Entrando a Cookly...</Text>
    </View>
  );
}

export default function LoginScreen() {
  const { token, login, loginConGoogle, loginConFacebook } = useAuth();
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const flotacion = useRef(new Animated.Value(0)).current;
  const flotar = flotacion.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  // La ilustración sube y baja suavemente.
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(flotacion, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flotacion, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    bucle.start();
    return () => bucle.stop();
  }, [flotacion]);

  const [cargandoEmail, setCargandoEmail] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const [cargandoFacebook, setCargandoFacebook] = useState(false);
  const cargandoAlguno = cargandoEmail || cargandoGoogle || cargandoFacebook;

  useEffect(() => {
    despertarServidor();
  }, []);

  // Si el login sale bien NO apagamos el cargando: se queda hasta que la app
  // cambia sola al inicio. Solo se apaga si hay error o si se cancela.
  async function manejarLogin(correo: string, contrasena: string) {
    if (!correo || !contrasena) {
      mostrarAlerta('Faltan datos', 'Ingresa tu correo y contraseña.');
      return;
    }
    if (cargandoAlguno) return;
    setCargandoEmail(true);
    try {
      await login(correo.trim(), contrasena);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      setCargandoEmail(false);
      mostrarAlerta('Error', mensajeDeError(error, 'No se pudo iniciar sesión. Verifica tus datos.'));
    }
  }

  async function manejarLoginFacebook() {
    if (cargandoAlguno) return;
    setCargandoFacebook(true);
    try {
      await loginConFacebook();
      router.replace('/(tabs)/home');
    } catch (error: any) {
      setCargandoFacebook(false);
      if (String(error?.message).includes('cancelado')) return;
      mostrarAlerta('Error', mensajeDeError(error, 'No se pudo iniciar sesión con Facebook.'));
    }
  }

  async function manejarLoginGoogle() {
    if (cargandoAlguno) return;
    setCargandoGoogle(true);
    try {
      await loginConGoogle();
      router.replace('/(tabs)/home');
    } catch (error: any) {
      setCargandoGoogle(false);
      if (String(error?.message).includes('cancelado')) return;
      mostrarAlerta('Error', mensajeDeError(error, 'No se pudo iniciar sesión con Google.'));
    }
  }

  const dot = (i: number) => ({
    width: scrollX.interpolate({
      inputRange: [(i - 1) * width, i * width, (i + 1) * width],
      outputRange: [8, 26, 8],
      extrapolate: 'clamp',
    }),
    opacity: scrollX.interpolate({
      inputRange: [(i - 1) * width, i * width, (i + 1) * width],
      outputRange: [0.35, 1, 0.35],
      extrapolate: 'clamp',
    }),
  });

  // Los puntos solo se ven en la bienvenida; se desvanecen al llegar al login.
  const opacidadPuntos = scrollX.interpolate({
    inputRange: [0, width * 0.6],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Ya hay sesión: nunca mostramos la bienvenida, solo la sartén girando
  // mientras la app pasa directo al inicio.
  if (token) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <CargandoCookly />
        <Redirect href="/(tabs)/home" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
      >
        {/* PANTALLA 1: BIENVENIDA */}
        <View style={{ width, flex: 1 }}>
          <FondoBlobs variante="bienvenida" />
          <View style={s.centro}>
            <Logo size={76} variante="rosa" conTexto colorTexto={colors.primary} />
            <Text style={s.bien}>¡Bienvenido a</Text>
            <Text style={s.bienRosa}>Cookly!</Text>
            <Text style={s.slogan}>Calculamos por ti.{'\n'}Tú solo preocúpate de cocinar.</Text>
            <Animated.Image
              source={require('../assets/images/ilustracion-olla.png')}
              style={{
                width: width * 0.7,
                height: width * 0.7 * (700 / 780),
                marginTop: 26,
                transform: [{ translateY: flotar }],
              }}
              resizeMode="contain"
            />
          </View>
          <Text style={s.desliza}>Desliza para continuar  →</Text>
        </View>

        {/* PANTALLA 2: LOGIN */}
        <View style={{ width, flex: 1 }}>
          <PantallaLogin
            onLogin={manejarLogin}
            onGoogle={manejarLoginGoogle}
            onFacebook={manejarLoginFacebook}
            onRegistro={() => router.push('/register')}
            onOlvide={() => router.push('/olvide-contrasena')}
            cargando={cargandoEmail}
          />
        </View>
      </Animated.ScrollView>

      <Animated.View style={[s.dots, { opacity: opacidadPuntos }]} pointerEvents="none">
        {[0, 1].map((i) => (
          <Animated.View key={i} style={[s.dot, dot(i)]} />
        ))}
      </Animated.View>

      {cargandoAlguno && <CargandoCookly />}
    </View>
  );
}

const s = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 90, paddingHorizontal: 30 },
  bien: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.text, marginTop: 26, textAlign: 'center' },
  bienRosa: { fontFamily: fonts.displayBold, fontSize: 38, lineHeight: 44, color: colors.primary, textAlign: 'center' },
  slogan: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, textAlign: 'center', color: colors.textMuted, marginTop: 8 },
  desliza: {
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  dots: { position: 'absolute', bottom: 34, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  overlayTexto: { ...typography.body, color: colors.textMuted },
});