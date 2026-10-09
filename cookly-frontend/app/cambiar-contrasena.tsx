// app/cambiar-contrasena.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius, spacing, typography } from '../constants/theme';
import { api } from '../lib/api';
import Button from '../components/Button';

export default function CambiarContrasenaScreen() {
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  async function manejarCambio() {
    if (!contrasenaActual || !contrasenaNueva || !confirmarContrasena) {
      Alert.alert('Faltan datos', 'Completa los 3 campos.');
      return;
    }
    if (contrasenaNueva.length < 10) {
      Alert.alert('Contraseña muy corta', 'La nueva contraseña debe tener al menos 10 caracteres.');
      return;
    }
    if (contrasenaNueva !== confirmarContrasena) {
      Alert.alert('No coinciden', 'La nueva contraseña y su confirmación no son iguales.');
      return;
    }

    setCargando(true);
    try {
      await api.put('/perfil/contrasena', { contrasenaActual, contrasenaNueva });
      Alert.alert('¡Listo!', 'Tu contraseña se actualizó.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo cambiar la contraseña.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.titulo}>Cambiar contraseña</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Contraseña actual"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={contrasenaActual}
        onChangeText={setContrasenaActual}
      />
      <TextInput
        style={styles.input}
        placeholder="Nueva contraseña (mínimo 10 caracteres)"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={contrasenaNueva}
        onChangeText={setContrasenaNueva}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmar nueva contraseña"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={confirmarContrasena}
        onChangeText={setConfirmarContrasena}
      />

      <Button label="Guardar nueva contraseña" onPress={manejarCambio} loading={cargando} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, paddingTop: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  titulo: { ...typography.h2, color: colors.text },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: spacing.sm,
    ...typography.body, color: colors.text,
  },
});
