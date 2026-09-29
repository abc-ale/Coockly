// app/login.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import Button from '../components/Button';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

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

  async function manejarLogin() {
    if (!correo || !contrasena) {
      Alert.alert('Faltan datos', 'Ingresa tu correo y contraseña.');
      return;
    }
    setCargandoEmail(true);
    try {
      await login(correo.trim(), contrasena);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      const mensaje = error?.response?.data?.mensaje || 'No se pudo iniciar sesión. Verifica tus datos.';
      Alert.alert('Error', mensaje);
    } finally {
      setCargandoEmail(false);
    }
  }

  async function manejarLoginFacebook() {
    setCargandoFacebook(true);
    try {
      await loginConFacebook();
      router.replace('/(tabs)/home');
    } catch {
      Alert.alert('Error', 'No se pudo iniciar sesión con Facebook.');
    } finally {
      setCargandoFacebook(false);
    }
  }

  async function manejarLoginGoogle() {
    setCargandoGoogle(true);
    try {
      await loginConGoogle();
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo iniciar sesión con Google.');
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
      <TextInput
        placeholder="Contraseña"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        style={styles.input}
        value={contrasena}
        onChangeText={setContrasena}
        editable={!cargandoAlguno}
      />

      <Button
        label="Iniciar sesión"
        onPress={manejarLogin}
        loading={cargandoEmail}
        disabled={cargandoAlguno}
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
        disabled={cargandoAlguno}
      />

      <View style={{ height: spacing.sm }} />

      <Button
        label="Continuar con Facebook"
        onPress={manejarLoginFacebook}
        loading={cargandoFacebook}
        disabled={cargandoAlguno}
      />

      <Link href="/olvide-contrasena" style={styles.olvide}>
        ¿Olvidaste tu contraseña?
      </Link>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿No tienes cuenta? </Text>
        <Link href="/register" style={styles.link}>Regístrate</Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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