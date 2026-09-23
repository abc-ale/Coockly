import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import Button from '../components/Button';
import { colors, radius, spacing, typography } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

export default function RestablecerContrasenaScreen() {
  const [nueva, setNueva] = useState('');
  const [cargando, setCargando] = useState(false);

  async function confirmar() {
    if (nueva.length < 10) {
      Alert.alert('Muy corta', 'Debe tener al menos 10 caracteres.');
      return;
    }
    setCargando(true);
    try {
      // 1. Cambia la contraseña dentro de Supabase (la sesión ya viene del link del correo)
      const { error } = await supabase.auth.updateUser({ password: nueva });
      if (error) throw error;

      // 2. Sincroniza esa misma contraseña en tu backend Spring
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await api.post('/autenticacion/restablecer-por-supabase', { nuevaContrasena: nueva }, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }

      Alert.alert('Listo', 'Tu contraseña fue actualizada.');
      router.replace('/login');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo actualizar la contraseña.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Nueva contraseña</Text>
      <TextInput
        placeholder="Nueva contraseña"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        style={styles.input}
        value={nueva}
        onChangeText={setNueva}
      />
      <Button label="Guardar" onPress={confirmar} loading={cargando} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  title: { ...typography.h1, color: colors.text, textAlign: 'center', marginBottom: spacing.lg },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: spacing.sm, ...typography.body, color: colors.text },
});