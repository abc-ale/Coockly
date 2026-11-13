// app/login.tsx  (bienvenida + login en un solo pager)
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { router, Redirect } from 'expo-router';
import PantallaLogin from '../components/PantallaLogin';
import Logo from '../components/Logo';
import PortadaBienvenida, { precargarPlato } from '../components/PortadaBienvenida';
import DeslizarParaEmpezar from '../components/DeslizarParaEmpezar';
import { colors, fonts, spacing, typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { despertarServidor } from '../lib/api';
import { mostrarAlerta } from '../components/Dialogo';

// Empieza a descargar el plato apenas se abre la app.
precargarPlato();

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
  const { token, login, registrar, loginConGoogle } = useAuth();
  const { width, height } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const pager = useRef<any>(null);
  // Tocar en cualquier parte de la bienvenida lleva al login.
  const irAlLogin = () => pager.current?.scrollTo({ x: width, animated: true });
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

  const [arrastrando, setArrastrando] = useState(false);
  const [enLogin, setEnLogin] = useState(false);
  const [cargandoEmail, setCargandoEmail] = useState(false);
  const [cargandoRegistro, setCargandoRegistro] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const cargandoAlguno = cargandoEmail || cargandoRegistro || cargandoGoogle;

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

  // Crear cuenta desde la pestaña "Registrarse" (mismos datos y reglas que antes).
  async function manejarRegistro(nombre: string, correo: string, contrasena: string) {
    if (!nombre || !correo || !contrasena) {
      mostrarAlerta('Faltan datos', 'Completa todos los campos.');
      return;
    }
    if (contrasena.length < 10) {
      mostrarAlerta('Contraseña muy corta', 'Debe tener al menos 10 caracteres.');
      return;
    }
    if (cargandoAlguno) return;
    setCargandoRegistro(true);
    try {
      await registrar(nombre, correo, contrasena);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      setCargandoRegistro(false);
      mostrarAlerta('Error', mensajeDeError(error, 'No se pudo crear la cuenta.'));
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
        ref={pager}
        horizontal
        pagingEnabled
        scrollEnabled={enLogin && !arrastrando}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
          listener: (e: any) => setEnLogin(e.nativeEvent.contentOffset.x > width * 0.5),
        })}
      >
        {/* PANTALLA 1: BIENVENIDA (solo se avanza deslizando el botón) */}
        <View style={{ width, flex: 1, overflow: 'hidden' }}>
          {/* Círculos de fondo */}
          <View style={[s.circulo, { width: 520, height: 520, borderRadius: 260, top: -170, right: -190, backgroundColor: colors.primaryLight }]} />
          <View style={[s.circulo, { width: 300, height: 300, borderRadius: 150, bottom: -120, left: -130, backgroundColor: colors.primaryLight, opacity: 0.6 }]} />
          <View style={[s.circulo, { width: 56, height: 56, borderRadius: 28, top: height * 0.39, left: 26, backgroundColor: colors.accent }]} />
          <View style={[s.circulo, { width: 22, height: 22, borderRadius: 11, top: height * 0.18, left: 40, backgroundColor: colors.magic }]} />

          {/* Logo arriba a la izquierda */}
          <View style={s.cabecera}>
            <Logo size={54} variante="rosa" conTexto colorTexto={colors.primary} />
          </View>

          {/* Plato grande que se sale del marco */}
          <Animated.View style={{ position: 'absolute', top: height * 0.16, left: width * 0.04, transform: [{ translateY: flotar }] }}>
            <PortadaBienvenida ancho={width * 0.92} />
          </Animated.View>

          {/* Titular + botón */}
          <View style={s.pie}>
            <Text style={s.titular}>Calculamos{'\n'}por ti.</Text>
            <Text style={s.slogan}>Tú solo preocúpate de cocinar. Cantidades, tiempos y pasos, siempre a tu medida.</Text>
            <View style={{ marginTop: 26 }}>
              <DeslizarParaEmpezar texto="Desliza para empezar" onCompletar={irAlLogin} onArrastrando={setArrastrando} />
            </View>
          </View>
        </View>

        {/* PANTALLA 2: LOGIN */}
        <View style={{ width, flex: 1 }}>
          <PantallaLogin
            onLogin={manejarLogin}
            onGoogle={manejarLoginGoogle}
            onRegistrar={manejarRegistro}
            onOlvide={() => router.push('/olvide-contrasena')}
            cargando={cargandoEmail}
            cargandoRegistro={cargandoRegistro}
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
  circulo: { position: 'absolute' },
  cabecera: { position: 'absolute', top: 58, left: 26 },
  pie: { position: 'absolute', left: 28, right: 28, bottom: 76 },
  titular: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, color: colors.text, letterSpacing: -0.5 },
  slogan: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.textMuted, marginTop: 12, maxWidth: 310 },
  dots: { position: 'absolute', top: 70, right: 28, flexDirection: 'row', gap: 6 },
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