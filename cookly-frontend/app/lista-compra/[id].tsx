// app/lista-compra/[id].tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, radius, spacing, typography, shadow } from '../../constants/theme';
import { api } from '../../lib/api';

type Elemento = {
  id: number;
  nombreMostrado: string;
  cantidad: number | null;
  unidad: string | null;
  comprado: boolean;
};

type ListaDetalle = { id: number; nombre: string; elementos: Elemento[] };

export default function ListaCompraDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lista, setLista] = useState<ListaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [nombreItem, setNombreItem] = useState('');
  const [cantidadItem, setCantidadItem] = useState('');
  const [unidadItem, setUnidadItem] = useState('');
  const [agregando, setAgregando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/listas-compra');
      const encontrada = data.find((l: ListaDetalle) => l.id === Number(id));
      setLista(encontrada ?? null);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo cargar la lista.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function agregarItem() {
    if (!nombreItem.trim()) {
      Alert.alert('Falta el nombre', 'Escribe qué quieres agregar.');
      return;
    }
    setAgregando(true);
    try {
      await api.post(`/listas-compra/${id}/elementos`, {
        nombrePersonalizado: nombreItem.trim(),
        cantidad: cantidadItem ? Number(cantidadItem) : undefined,
        unidad: unidadItem.trim() || undefined,
      });
      setNombreItem('');
      setCantidadItem('');
      setUnidadItem('');
      await cargar();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo agregar el ítem.');
    } finally {
      setAgregando(false);
    }
  }

  async function alternarComprado(item: Elemento) {
    try {
      await api.put(`/listas-compra/elementos/${item.id}/comprado`, null, { params: { valor: !item.comprado } });
      setLista((prev) =>
        prev
          ? { ...prev, elementos: prev.elementos.map((e) => (e.id === item.id ? { ...e, comprado: !e.comprado } : e)) }
          : prev
      );
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo actualizar el ítem.');
    }
  }

  function confirmarEliminarLista() {
    Alert.alert('Eliminar lista', `¿Seguro que quieres eliminar "${lista?.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/listas-compra/${id}`);
            router.back();
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo eliminar la lista.');
          }
        },
      },
    ]);
  }

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!lista) {
    return (
      <View style={styles.centrado}>
        <Text style={{ color: colors.textMuted }}>No se encontró la lista.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.titulo}>{lista.nombre}</Text>
          <Pressable onPress={confirmarEliminarLista}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </View>

        <View style={styles.filaAgregar}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="Ítem"
            placeholderTextColor={colors.textMuted}
            value={nombreItem}
            onChangeText={setNombreItem}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Cant."
            placeholderTextColor={colors.textMuted}
            value={cantidadItem}
            onChangeText={setCantidadItem}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Unidad"
            placeholderTextColor={colors.textMuted}
            value={unidadItem}
            onChangeText={setUnidadItem}
          />
          <Pressable style={styles.botonAgregar} onPress={agregarItem} disabled={agregando}>
            <Ionicons name="add" size={18} color={colors.white} />
          </Pressable>
        </View>

        {lista.elementos.length === 0 ? (
          <Text style={styles.vacioTexto}>Todavía no hay ítems en esta lista.</Text>
        ) : (
          lista.elementos.map((item) => (
            <Pressable key={item.id} style={styles.filaItem} onPress={() => alternarComprado(item)}>
              <Ionicons
                name={item.comprado ? 'checkbox' : 'square-outline'}
                size={22}
                color={item.comprado ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.textoItem, item.comprado && styles.textoItemComprado]}>
                {item.nombreMostrado}
                {item.cantidad ? ` — ${item.cantidad} ${item.unidad ?? ''}` : ''}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  titulo: { ...typography.h2, color: colors.text, flex: 1, marginHorizontal: spacing.sm },
  filaAgregar: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg, alignItems: 'center' },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, ...typography.bodySmall, color: colors.text,
  },
  botonAgregar: {
    width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  vacioTexto: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  filaItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.card,
  },
  textoItem: { ...typography.body, color: colors.text, flex: 1 },
  textoItemComprado: { textDecorationLine: 'line-through', color: colors.textMuted },
});
