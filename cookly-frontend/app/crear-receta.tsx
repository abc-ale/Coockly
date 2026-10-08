// app/crear-receta.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius, spacing, typography, shadow } from '../constants/theme';
import { api } from '../lib/api';
import Button from '../components/Button';

type IngredienteForm = { nombre: string; cantidad: string; unidad: string };
type PasoForm = { instruccion: string };

export default function CrearRecetaScreen() {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [minutos, setMinutos] = useState('');
  const [ingredientes, setIngredientes] = useState<IngredienteForm[]>([{ nombre: '', cantidad: '', unidad: '' }]);
  const [pasos, setPasos] = useState<PasoForm[]>([{ instruccion: '' }]);
  const [guardando, setGuardando] = useState(false);

  function actualizarIngrediente(index: number, campo: keyof IngredienteForm, valor: string) {
    setIngredientes((prev) => prev.map((ing, i) => (i === index ? { ...ing, [campo]: valor } : ing)));
  }

  function agregarIngrediente() {
    setIngredientes((prev) => [...prev, { nombre: '', cantidad: '', unidad: '' }]);
  }

  function quitarIngrediente(index: number) {
    setIngredientes((prev) => prev.filter((_, i) => i !== index));
  }

  function actualizarPaso(index: number, valor: string) {
    setPasos((prev) => prev.map((p, i) => (i === index ? { instruccion: valor } : p)));
  }

  function agregarPaso() {
    setPasos((prev) => [...prev, { instruccion: '' }]);
  }

  function quitarPaso(index: number) {
    setPasos((prev) => prev.filter((_, i) => i !== index));
  }

  async function guardarReceta() {
    if (!nombre.trim()) {
      Alert.alert('Falta el nombre', 'Ponle un nombre a tu receta.');
      return;
    }
    const ingredientesValidos = ingredientes.filter((i) => i.nombre.trim());
    if (ingredientesValidos.length === 0) {
      Alert.alert('Faltan ingredientes', 'Agrega al menos un ingrediente con nombre.');
      return;
    }
    const pasosValidos = pasos.filter((p) => p.instruccion.trim());
    if (pasosValidos.length === 0) {
      Alert.alert('Faltan pasos', 'Agrega al menos un paso de preparación.');
      return;
    }

    setGuardando(true);
    try {
      const { data } = await api.post('/recetas', {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        minutosPreparacion: minutos ? Number(minutos) : undefined,
        ingredientes: ingredientesValidos.map((i) => ({
          nombre: i.nombre.trim(),
          cantidad: i.cantidad ? Number(i.cantidad) : undefined,
          unidad: i.unidad.trim() || undefined,
        })),
        pasos: pasosValidos.map((p, idx) => ({
          orden: idx + 1,
          instruccion: p.instruccion.trim(),
        })),
      });

      Alert.alert('¡Listo!', 'Tu receta se guardó.', [
        { text: 'Ver receta', onPress: () => router.replace(`/receta/${data.id}`) },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo guardar la receta.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.titulo}>Nueva receta</Text>
        </View>

        <Text style={styles.etiqueta}>Nombre</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Ceviche Clásico"
          placeholderTextColor={colors.textMuted}
          value={nombre}
          onChangeText={setNombre}
        />

        <Text style={styles.etiqueta}>Descripción (opcional)</Text>
        <TextInput
          style={[styles.input, styles.inputMultilinea]}
          placeholder="Una breve descripción de tu receta"
          placeholderTextColor={colors.textMuted}
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
        />

        <Text style={styles.etiqueta}>Minutos de preparación (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. 25"
          placeholderTextColor={colors.textMuted}
          value={minutos}
          onChangeText={setMinutos}
          keyboardType="numeric"
        />

        <View style={styles.seccionHeader}>
          <Text style={styles.seccionTitulo}>Ingredientes</Text>
          <Pressable onPress={agregarIngrediente} style={styles.botonAgregar}>
            <Ionicons name="add" size={18} color={colors.white} />
          </Pressable>
        </View>

        {ingredientes.map((ing, idx) => (
          <View key={idx} style={styles.filaIngrediente}>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              placeholder="Ingrediente"
              placeholderTextColor={colors.textMuted}
              value={ing.nombre}
              onChangeText={(v) => actualizarIngrediente(idx, 'nombre', v)}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Cant."
              placeholderTextColor={colors.textMuted}
              value={ing.cantidad}
              onChangeText={(v) => actualizarIngrediente(idx, 'cantidad', v)}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Unidad"
              placeholderTextColor={colors.textMuted}
              value={ing.unidad}
              onChangeText={(v) => actualizarIngrediente(idx, 'unidad', v)}
            />
            {ingredientes.length > 1 && (
              <Pressable onPress={() => quitarIngrediente(idx)} style={styles.botonQuitar}>
                <Ionicons name="close" size={16} color={colors.danger} />
              </Pressable>
            )}
          </View>
        ))}

        <View style={styles.seccionHeader}>
          <Text style={styles.seccionTitulo}>Pasos de preparación</Text>
          <Pressable onPress={agregarPaso} style={styles.botonAgregar}>
            <Ionicons name="add" size={18} color={colors.white} />
          </Pressable>
        </View>

        {pasos.map((paso, idx) => (
          <View key={idx} style={styles.filaPaso}>
            <View style={styles.numeroPaso}>
              <Text style={styles.numeroPasoTexto}>{idx + 1}</Text>
            </View>
            <TextInput
              style={[styles.input, styles.inputMultilinea, { flex: 1 }]}
              placeholder={`Describe el paso ${idx + 1}...`}
              placeholderTextColor={colors.textMuted}
              value={paso.instruccion}
              onChangeText={(v) => actualizarPaso(idx, v)}
              multiline
            />
            {pasos.length > 1 && (
              <Pressable onPress={() => quitarPaso(idx)} style={styles.botonQuitar}>
                <Ionicons name="close" size={16} color={colors.danger} />
              </Pressable>
            )}
          </View>
        ))}

        <View style={{ marginTop: spacing.lg }}>
          <Button label="Guardar receta" onPress={guardarReceta} loading={guardando} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  titulo: { ...typography.h2, color: colors.text },
  etiqueta: { ...typography.bodySmall, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, ...typography.body, color: colors.text,
  },
  inputMultilinea: { minHeight: 70, textAlignVertical: 'top' },
  seccionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  seccionTitulo: { ...typography.h3, color: colors.text },
  botonAgregar: {
    width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  filaIngrediente: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm, alignItems: 'center' },
  filaPaso: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm, alignItems: 'flex-start' },
  numeroPaso: {
    width: 24, height: 24, borderRadius: radius.pill, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm,
  },
  numeroPasoTexto: { color: colors.white, fontSize: 12, fontWeight: '700' },
  botonQuitar: {
    width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
});
