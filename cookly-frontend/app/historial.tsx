// app/historial.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography, shadow } from '../constants/theme';
import { api } from '../lib/api';

type EntradaHistorial = {
  id: number;
  receta: { id: number; nombre: string; minutosPreparacion: number | null };
  vistoEn: string;
};

export default function HistorialScreen() {
  const [entradas, setEntradas] = useState<EntradaHistorial[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/historial');
      setEntradas(data);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo cargar el historial.');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  function formatearFecha(iso: string) {
    const fecha = new Date(iso);
    return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.titulo}>Historial</Text>
      </View>

      {cargando ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : entradas.length === 0 ? (
        <Text style={styles.vacioTexto}>Todavía no has visto ninguna receta.</Text>
      ) : (
        entradas.map((entrada) => (
          <Pressable
            key={entrada.id}
            style={styles.tarjeta}
            onPress={() => router.push(`/receta/${entrada.receta.id}`)}
          >
            <View style={styles.icono}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombreReceta}>{entrada.receta.nombre}</Text>
              <Text style={styles.fecha}>{formatearFecha(entrada.vistoEn)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md, paddingTop: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  titulo: { ...typography.h2, color: colors.text },
  vacioTexto: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  tarjeta: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.card,
  },
  icono: {
    width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  nombreReceta: { ...typography.body, color: colors.text, fontWeight: '600' },
  fecha: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
