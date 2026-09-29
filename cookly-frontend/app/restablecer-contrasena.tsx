import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import Button from '../components/Button';
import { colors, radius, spacing, typography } from '../constants/theme';
import { api } from '../lib/api';

export default function RestablecerContrasenaScreen() {
  const { token: tokenParam } = useLocalSearchParams<{
    token?: string | string[];
  }>();

  const token = Array.isArray(tokenParam)
    ? tokenParam[0]
    : tokenParam;

  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [cargando, setCargando] = useState(false);

  async function confirmar() {
    if (!token) {
      Alert.alert(
        'Enlace inválido',
        'No se encontró el token de recuperación. Solicita un enlace nuevo.'
      );
      return;
    }

    if (nueva.length < 10) {
      Alert.alert(
        'Contraseña muy corta',
        'La contraseña debe tener al menos 10 caracteres.'
      );
      return;
    }

    if (nueva !== confirmacion) {
      Alert.alert(
        'Las contraseñas no coinciden',
        'Escribe la misma contraseña en los dos campos.'
      );
      return;
    }

    setCargando(true);

    try {
      await api.post('/autenticacion/restablecer-con-token', {
        token,
        nuevaContrasena: nueva,
      });

      Alert.alert(
        'Contraseña actualizada',
        'Tu contraseña fue actualizada correctamente.',
        [
          {
            text: 'Iniciar sesión',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    } catch (error: any) {
      const mensaje =
        error?.response?.data?.mensaje ||
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo actualizar la contraseña.';

      Alert.alert('Error', mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Nueva contraseña</Text>

      <Text style={styles.subtitle}>
        Crea una contraseña nueva para tu cuenta.
      </Text>

      <TextInput
        placeholder="Nueva contraseña"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        value={nueva}
        onChangeText={setNueva}
        editable={!cargando}
      />

      <TextInput
        placeholder="Confirmar contraseña"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        value={confirmacion}
        onChangeText={setConfirmacion}
        editable={!cargando}
      />

      <Button
        label="Guardar contraseña"
        onPress={confirmar}
        loading={cargando}
        disabled={cargando}
      />
    </View>
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
    marginBottom: spacing.xs,
  },

  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
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