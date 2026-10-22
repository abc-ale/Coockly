// app/_layout.tsx
import { useEffect } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_700Bold } from '@expo-google-fonts/nunito';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { colors } from '../constants/theme';
import { despertarServidor } from '../lib/api';
import { DialogoProvider } from '../components/Dialogo';
import { AvisoProvider } from '../components/Aviso';
import { programarNotificaciones } from '../notificaciones/programar';
import { iniciarPushSocial } from '../notificaciones/registrarPush';

// Evita que un doble toque abra la misma pantalla dos veces:
// ignora un push a la misma ruta si ocurre menos de 800 ms después del anterior.
const pushOriginal = router.push.bind(router);
let ultimaRuta = '';
let ultimoPush = 0;
router.push = ((href: any) => {
  const clave = typeof href === 'string' ? href : JSON.stringify(href);
  const ahora = Date.now();
  if (clave === ultimaRuta && ahora - ultimoPush < 800) return;
  ultimaRuta = clave;
  ultimoPush = ahora;
  pushOriginal(href);
}) as typeof router.push;

// Pantalla "Entrando a Cookly…": tapa la bienvenida mientras termina el inicio de sesión con Google.
function CapaEntrando() {
  const { entrandoSocial } = useAuth();
  if (!entrandoSocial) return null;
  return (
    <View style={estilos.capa}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={estilos.texto}>Entrando a Cookly…</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  capa: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    zIndex: 999,
    elevation: 999,
  },
  texto: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: colors.primary },
});

// Mantiene la pantalla de carga visible hasta que las fuentes estén listas.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fuentesListas, errorFuentes] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  // Al abrir la app, despierta el servidor de Render en segundo plano.
  useEffect(() => {
    despertarServidor();
  }, []);

  // Notificaciones de mañana, tarde y noche: se reprograman al abrir la app
  // y cada vez que vuelve a primer plano (si no la abre, llegan los "te extraño").
  useEffect(() => {
    const programar = () => { programarNotificaciones().catch(() => {}); };
    programar();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') programar();
    });
    // Avisos de la comunidad (me gusta, comentarios, respuestas)
    const detenerPush = iniciarPushSocial();
    return () => { sub.remove(); detenerPush(); };
  }, []);

  useEffect(() => {
    if (fuentesListas || errorFuentes) SplashScreen.hideAsync();
  }, [fuentesListas, errorFuentes]);

  // Si fallan las fuentes, la app abre igual con la fuente del sistema.
  if (!fuentesListas && !errorFuentes) return null;

  return (
    <AuthProvider>
      <DialogoProvider>
       <AvisoProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 260, contentStyle: { backgroundColor: '#FFF8F6' } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="chatbot" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="create-post" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
        <CapaEntrando />
       </AvisoProvider>
      </DialogoProvider>
    </AuthProvider>
  );
}