// app/(tabs)/profile.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Button from '../../components/Button';
import { colors, radius, spacing, typography, shadow } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { mostrarAlerta } from '../../components/Dialogo';
import { Aparecer, Rebote, Presionable } from '../../components/Animaciones';

export default function ProfileScreen() {
  const { usuario, logout } = useAuth();

  function confirmarCerrarSesion() {
    mostrarAlerta('Cerrar sesión', '¿Seguro que quieres salir?', [
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
      <Rebote>
        <View style={styles.avatar}>
          <Ionicons name="person" size={36} color={colors.white} />
        </View>
      </Rebote>

      <Aparecer delay={120}>
        <Text style={styles.name}>{usuario?.nombre ?? 'Usuario'}</Text>
      </Aparecer>
      <Aparecer delay={200}>
        <Text style={styles.email}>{usuario?.correo}</Text>
      </Aparecer>
      <Aparecer delay={260}>
        <View style={styles.roleChip}>
          <Text style={styles.roleText}>{usuario?.rol}</Text>
        </View>
      </Aparecer>

      <View style={styles.seccionOpciones}>
        <Aparecer delay={320}>
          <Presionable escalaAlPresionar={0.97} style={styles.opcionFila} onPress={() => router.push('/menu-express')}>
          <Ionicons name="flash-outline" size={20} color={colors.primary} />
          <Text style={styles.opcionTexto}>Menú express</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Presionable>
        </Aparecer>

        <Aparecer delay={400}>
          <Presionable escalaAlPresionar={0.97} style={styles.opcionFila} onPress={() => router.push('/menu-semanal')}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={styles.opcionTexto}>Menú semanal</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Presionable>
        </Aparecer>

        <Aparecer delay={480}>
          <Presionable escalaAlPresionar={0.97} style={styles.opcionFila} onPress={() => router.push('/historial')}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Text style={styles.opcionTexto}>Historial de recetas</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Presionable>
        </Aparecer>

        <Aparecer delay={560}>
          <Presionable escalaAlPresionar={0.97} style={styles.opcionFila} onPress={() => router.push('/cambiar-contrasena')}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
          <Text style={styles.opcionTexto}>Cambiar contraseña</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Presionable>
        </Aparecer>
      </View>

      <View style={{ marginTop: spacing.lg, width: '100%' }}>
        <Button label="Cerrar sesión" variant="outline" onPress={confirmarCerrarSesion} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', padding: spacing.lg, paddingTop: spacing.xl * 1.5 },
  avatar: {
    width: 88, height: 88, borderRadius: radius.pill, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  name: { ...typography.h2, color: colors.text },
  email: { ...typography.body, color: colors.textMuted, marginTop: 2 },
  roleChip: {
    backgroundColor: colors.primaryLight, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 4, marginTop: spacing.sm,
  },
  roleText: { ...typography.caption, color: colors.primaryDark },
  seccionOpciones: { width: '100%', marginTop: spacing.xl, gap: spacing.sm },
  opcionFila: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md, ...shadow.card,
  },
  opcionTexto: { ...typography.body, color: colors.text, flex: 1 },
});