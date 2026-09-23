// app/register.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import Button from '../components/Button';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen() {
  const { registrar } = useAuth();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  async function manejarRegistro() {
    if (!nombre || !correo || !contrasena) {
      Alert.alert('Faltan datos', 'Completa todos los campos.');
      return;
    }
    if (contrasena.length < 10) {
      Alert.alert('Contraseña muy corta', 'Debe tener al menos 10 caracteres.');
      return;
    }
    setCargando(true);
    try {
      await registrar(nombre.trim(), correo.trim(), contrasena);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      const mensaje = error?.response?.data?.mensaje || 'No se pudo crear la cuenta.';
      Alert.alert('Error', mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Únete y empieza a guardar tus recetas</Text>

      <TextInput
        placeholder="Nombre completo"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={nombre}
        onChangeText={setNombre}
      />
      <TextInput
        placeholder="Correo electrónico"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        value={correo}
        onChangeText={setCorreo}
      />
      <TextInput
        placeholder="Contraseña (mínimo 10 caracteres)"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        style={styles.input}
        value={contrasena}
        onChangeText={setContrasena}
      />

      <Button label="Crear cuenta" onPress={manejarRegistro} loading={cargando} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
        <Link href="/login" style={styles.link}>Inicia sesión</Link>
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { ...typography.bodySmall, color: colors.textMuted },
  link: { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
});
