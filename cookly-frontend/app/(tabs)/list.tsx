import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, shadow } from '../../constants/theme';

type ItemLista = {
  id: string;
  nombre: string;
  comprado: boolean;
};

export default function ListScreen() {
  const [items, setItems] = useState<ItemLista[]>([
    { id: '1', nombre: 'Ají amarillo', comprado: false },
    { id: '2', nombre: 'Limón', comprado: true },
    { id: '3', nombre: 'Pescado fresco', comprado: false },
  ]);
  const [nuevoItem, setNuevoItem] = useState('');

  const agregarItem = () => {
    if (!nuevoItem.trim()) return;
    setItems((prev) => [...prev, { id: Date.now().toString(), nombre: nuevoItem.trim(), comprado: false }]);
    setNuevoItem('');
  };

  const alternarComprado = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, comprado: !i.comprado } : i)));
  };

  const eliminarItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.titulo}>Lista de compras</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Agregar ingrediente..."
          placeholderTextColor={colors.textMuted}
          value={nuevoItem}
          onChangeText={setNuevoItem}
          onSubmitEditing={agregarItem}
        />
        <TouchableOpacity style={styles.addBoton} onPress={agregarItem}>
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, shadow.card]}>
            <TouchableOpacity style={styles.itemLeft} onPress={() => alternarComprado(item.id)}>
              <Ionicons
                name={item.comprado ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={item.comprado ? colors.success : colors.textMuted}
              />
              <Text style={[styles.itemTexto, item.comprado && styles.itemTachado]}>{item.nombre}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => eliminarItem(item.id)}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Ionicons name="cart-outline" size={40} color={colors.textMuted} />
            <Text style={styles.vacioTexto}>Tu lista está vacía</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.lg },
  titulo: { ...typography.h1, color: colors.text, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  inputRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    ...typography.body,
  },
  addBoton: {
    backgroundColor: colors.primary,
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  itemTexto: { ...typography.body, color: colors.text },
  itemTachado: { textDecorationLine: 'line-through', color: colors.textMuted },
  vacio: { alignItems: 'center', marginTop: spacing.xl * 2, gap: spacing.sm },
  vacioTexto: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});