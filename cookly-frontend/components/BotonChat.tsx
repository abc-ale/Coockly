// components/BotonChat.tsx
// Botón flotante amarillo del asistente de cocina. Se pone al final de cualquier pantalla de las pestañas.
import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, shadow } from '../constants/theme';
import { Presionable, Rebote } from './Animaciones';

export default function BotonChat() {
  return (
    <Rebote delay={600} style={styles.contenedor}>
      <Presionable style={styles.fab} onPress={() => router.push('/chatbot')} accessibilityLabel="Abrir asistente de cocina">
        <Ionicons name="chatbubble-ellipses" size={26} color={colors.text} />
      </Presionable>
    </Rebote>
  );
}

const styles = StyleSheet.create({
  contenedor: { position: 'absolute', right: spacing.md, bottom: spacing.md },
  fab: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: colors.accent,
    borderWidth: 4, borderColor: colors.background, alignItems: 'center', justifyContent: 'center',
    ...shadow.card, shadowOpacity: 0.22, elevation: 8,
  },
});