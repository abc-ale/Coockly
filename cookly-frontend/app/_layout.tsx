// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { despertarServidor } from '../lib/api';
import { DialogoProvider } from '../components/Dialogo';

export default function RootLayout() {
  // Al abrir la app, despierta el servidor de Render en segundo plano.
  useEffect(() => {
    despertarServidor();
  }, []);

  return (
    <AuthProvider>
      <DialogoProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="chatbot" options={{ presentation: 'modal' }} />
          <Stack.Screen name="create-post" options={{ presentation: 'modal' }} />
        </Stack>
      </DialogoProvider>
    </AuthProvider>
  );
}