// app/(tabs)/profile.tsx
import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Button from '../../components/Button';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const { usuario, logout } = useAuth();

  function confirmarCerrarSesion() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={36} color={colors.white} />
      </View>

      <Text style={styles.name}>{usuario?.nombre ?? 'Usuario'}</Text>
      <Text style={styles.email}>{usuario?.correo}</Text>
      <View style={styles.roleChip}>
        <Text style={styles.roleText}>{usuario?.rol}</Text>
      </View>

      <View style={{ marginTop: spacing.xl, width: '100%' }}>
        <Button label="Cerrar sesión" variant="outline" onPress={confirmarCerrarSesion} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', padding: spacing.lg, paddingTop: spacing.xl * 1.5 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  name: { ...typography.h2, color: colors.text },
  email: { ...typography.body, color: colors.textMuted, marginTop: 2 },
  roleChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  roleText: { ...typography.caption, color: colors.primaryDark },
});
