// app/login.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import Button from '../components/Button';
import PasswordInput from '../components/PasswordInput';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { despertarServidor } from '../lib/api';

// Mensaje claro según qué falló (servidor dormido, red caída, error del backend...).
function mensajeDeError(error: any, porDefecto: string) {
  if (error?.response?.data?.mensaje) return error.response.data.mensaje;
  if (error?.code === 'ECONNABORTED' || error?.message === 'Network Error' || error?.response?.status >= 502) {
    return 'El servidor está despertando. Espera unos segundos e inténtalo de nuevo.';
  }
  return porDefecto;
}

export default function LoginScreen() {
  const { login, loginConGoogle, loginConFacebook } = useAuth();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargandoEmail, setCargandoEmail] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const [cargandoFacebook, setCargandoFacebook] = useState(false);

  // Mientras cualquiera de los dos flujos está en curso, deshabilitamos ambos
  // botones para que no se puedan disparar dos inicios de sesión a la vez.
  const cargandoAlguno = cargandoEmail || cargandoGoogle || cargandoFacebook;

  // Despierta el servidor apenas se abre la pantalla de login.
  useEffect(() => {
    despertarServidor();
  }, []);

  async function manejarLogin() {
    if (!correo || !contrasena) {
      Alert.alert('Faltan datos', 'Ingresa tu correo y contraseña.');
      return;
    }
    if (cargandoAlguno) return;
    setCargandoEmail(true);
    try {
      await login(correo.trim(), contrasena);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Error', mensajeDeError(error, 'No se pudo iniciar sesión. Verifica tus datos.'));
    } finally {
      setCargandoEmail(false);
    }
  }

  async function manejarLoginFacebook() {
    if (cargandoAlguno) return;
    setCargandoFacebook(true);
    try {
      await loginConFacebook();
      router.replace('/(tabs)/home');
    } catch (error: any) {
      if (String(error?.message).includes('cancelado')) return;
      Alert.alert('Error', mensajeDeError(error, 'No se pudo iniciar sesión con Facebook.'));
    } finally {
      setCargandoFacebook(false);
    }
  }

  async function manejarLoginGoogle() {
    if (cargandoAlguno) return;
    setCargandoGoogle(true);
    try {
      await loginConGoogle();
      router.replace('/(tabs)/home');
    } catch (error: any) {
      if (String(error?.message).includes('cancelado')) return;
      Alert.alert('Error', mensajeDeError(error, 'No se pudo iniciar sesión con Google.'));
    } finally {
      setCargandoGoogle(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>¡Hola, Chef! 👋</Text>
      <Text style={styles.subtitle}>Inicia sesión para seguir cocinando</Text>

      <TextInput
        placeholder="Correo electrónico"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        value={correo}
        onChangeText={setCorreo}
        editable={!cargandoAlguno}
      />
      <PasswordInput
        placeholder="Contraseña"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={contrasena}
        onChangeText={setContrasena}
        editable={!cargandoAlguno}
      />

      <Button
        label="Iniciar sesión"
        onPress={manejarLogin}
        loading={cargandoEmail}
      />

      <View style={styles.separadorContainer}>
        <View style={styles.separador} />
        <Text style={styles.separadorTexto}>o</Text>
        <View style={styles.separador} />
      </View>

      <Button
        label="Continuar con Google"
        onPress={manejarLoginGoogle}
        loading={cargandoGoogle}
      />

      <View style={{ height: spacing.sm }} />

      <Button
        label="Continuar con Facebook"
        onPress={manejarLoginFacebook}
        loading={cargandoFacebook}
      />

      <Link href="/olvide-contrasena" style={styles.olvide}>
        ¿Olvidaste tu contraseña?
      </Link>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿No tienes cuenta? </Text>
        <Link href="/register" style={styles.link}>Regístrate</Link>
      </View>

      {/* Pantalla de "Entrando..." mientras se valida la sesión: evita ver el login con todo opaco */}
      {cargandoAlguno && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.overlayTexto}>Entrando a Cookly...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  overlayTexto: { ...typography.body, color: colors.textMuted },
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  title: { ...typography.h1, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  separadorContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  separador: { flex: 1, height: 1, backgroundColor: colors.border },
  separadorTexto: { ...typography.bodySmall, color: colors.textMuted, marginHorizontal: spacing.sm },
  olvide: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { ...typography.bodySmall, color: colors.textMuted },
  link: { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
});