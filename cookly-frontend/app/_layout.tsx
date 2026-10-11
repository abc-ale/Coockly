// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_700Bold } from '@expo-google-fonts/nunito';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { AuthProvider } from '../context/AuthContext';
import { despertarServidor } from '../lib/api';
import { DialogoProvider } from '../components/Dialogo';
import { AvisoProvider } from '../components/Aviso';

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
          <Stack.Screen name="register" />
          <Stack.Screen name="chatbot" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="create-post" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
       </AvisoProvider>
      </DialogoProvider>
    </AuthProvider>
  );
}