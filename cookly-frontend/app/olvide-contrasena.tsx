import React, { useState } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';

import Button from '../components/Button';
import { colors, radius, spacing, typography } from '../constants/theme';
import { api } from '../lib/api';

export default function OlvideContrasenaScreen() {
  const [correo, setCorreo] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviarCorreo() {
    const correoLimpio = correo.trim().toLowerCase();

    if (!correoLimpio) {
      Alert.alert(
        'Falta el correo',
        'Ingresa tu correo electrónico.'
      );
      return;
    }

    if (!correoLimpio.includes('@')) {
      Alert.alert(
        'Correo inválido',
        'Ingresa un correo electrónico válido.'
      );
      return;
    }

    setCargando(true);

    try {
      const respuesta = await api.post(
        '/autenticacion/solicitar-recuperacion',
        {
          correo: correoLimpio,
        }
      );

      Alert.alert(
        'Revisa tu correo',
        respuesta.data?.mensaje ||
          'Si el correo existe, recibirás instrucciones para recuperar tu contraseña.',
        [
          {
            text: 'Aceptar',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      const mensaje =
        error?.response?.data?.mensaje ||
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo enviar el correo de recuperación.';

      Alert.alert('Error', mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Recuperar contraseña</Text>

      <Text style={styles.subtitle}>
        Te enviaremos un enlace para crear una contraseña nueva.
      </Text>

      <TextInput
        placeholder="Correo electrónico"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        style={styles.input}
        value={correo}
        onChangeText={setCorreo}
        editable={!cargando}
        returnKeyType="send"
        onSubmitEditing={enviarCorreo}
      />

      <Button
        label="Enviar enlace"
        onPress={enviarCorreo}
        loading={cargando}
        disabled={cargando}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },

  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },

  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },

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
});