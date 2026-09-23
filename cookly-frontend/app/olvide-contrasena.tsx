import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import Button from '../components/Button';
import { colors, radius, spacing, typography } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function OlvideContrasenaScreen() {
  const [correo, setCorreo] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviarCorreo() {
    if (!correo) {
      Alert.alert('Falta el correo', 'Ingresa tu correo electrónico.');
      return;
    }
    setCargando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(correo.trim(), {
        redirectTo: 'cookly://restablecer-contrasena',
      });
      if (error) throw error;
      Alert.alert('Revisa tu correo', 'Si el correo existe, te enviamos instrucciones.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar el correo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Recuperar contraseña</Text>
      <Text style={styles.subtitle}>Te enviaremos un enlace a tu correo</Text>
      <TextInput
        placeholder="Correo electrónico"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        value={correo}
        onChangeText={setCorreo}
      />
      <Button label="Enviar enlace" onPress={enviarCorreo} loading={cargando} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  title: { ...typography.h1, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: spacing.sm, ...typography.body, color: colors.text },
});