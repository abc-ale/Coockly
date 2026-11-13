import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import Button from '../components/Button';
import { colors, radius, spacing, typography, shadow } from '../constants/theme';
import { api } from '../lib/api';

export default function OlvideContrasenaScreen() {
  const [correo, setCorreo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviarCorreo() {
    const correoLimpio = correo.trim().toLowerCase();

    if (!correoLimpio) {
      Alert.alert('Falta el correo', 'Ingresa tu correo electrónico.');
      return;
    }

    if (!correoLimpio.includes('@')) {
      Alert.alert('Correo inválido', 'Ingresa un correo electrónico válido.');
      return;
    }

    setCargando(true);

    try {
      await api.post('/autenticacion/solicitar-recuperacion', {
        correo: correoLimpio,
      });

      setEnviado(true);
    } catch (error: any) {
      const mensaje =
        error?.response?.data?.mensaje ||
        error?.response?.data?.message ||
        'No se pudo enviar el correo de recuperación. Inténtalo de nuevo.';

      Alert.alert('Error', mensaje);
    } finally {
      setCargando(false);
    }
  }

  if (enviado) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>Cookly</Text>
          </View>

          <View style={styles.successBadge}>
            <Text style={styles.successCheck}>✓</Text>
          </View>

          <Text style={styles.title}>Revisa tu correo</Text>
          <Text style={styles.subtitle}>
            Si el correo está registrado, te enviaremos un enlace para crear
            una contraseña nueva. Revisa también la carpeta de spam.
          </Text>

          <Button
            label="Volver a iniciar sesión"
            onPress={() => router.replace('/login')}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>Cookly</Text>
        </View>

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
          returnKeyType="send"
          style={styles.input}
          value={correo}
          onChangeText={setCorreo}
          editable={!cargando}
          onSubmitEditing={enviarCorreo}
        />

        <Button
          label="Enviar enlace"
          onPress={enviarCorreo}
          loading={cargando}
          disabled={cargando}
        />
      </View>
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

  card: {
    width: '100%',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadow.card,
  },

  logo: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },

  logoText: {
    color: colors.primaryDark,
    fontSize: 25,
    fontWeight: '800',
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
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },

  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
    ...typography.body,
    color: colors.text,
  },

  successBadge: {
    width: 58,
    height: 58,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: '#E8F5E9',
  },

  successCheck: {
    color: '#34864A',
    fontSize: 31,
    fontWeight: '700',
  },
});