// app/menu-express.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius, spacing, typography, shadow } from '../constants/theme';
import { api } from '../lib/api';
import Button from '../components/Button';

type Recomendacion = {
  id: number;
  nombre: string;
  porcentajeCoincidencia: number;
  ingredientesFaltantes: string[];
  minutosPreparacion: number | null;
};

export default function MenuExpressScreen() {
  const [ingredienteActual, setIngredienteActual] = useState('');
  const [ingredientes, setIngredientes] = useState<string[]>([]);
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [yaBusco, setYaBusco] = useState(false);

  function agregarIngrediente() {
    const limpio = ingredienteActual.trim();
    if (!limpio) return;
    if (ingredientes.includes(limpio)) {
      setIngredienteActual('');
      return;
    }
    setIngredientes((prev) => [...prev, limpio]);
    setIngredienteActual('');
  }

  function quitarIngrediente(ingrediente: string) {
    setIngredientes((prev) => prev.filter((i) => i !== ingrediente));
  }

  async function buscarRecomendaciones() {
    if (ingredientes.length === 0) {
      Alert.alert('Agrega ingredientes', 'Escribe al menos un ingrediente que tengas.');
      return;
    }
    setBuscando(true);
    setYaBusco(true);
    try {
      const { data } = await api.post('/recetas/menu-express', { ingredientes });
      setRecomendaciones(data.recetas ?? []);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudieron buscar recomendaciones.');
    } finally {
      setBuscando(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.titulo}>Menú express</Text>
      </View>

      <Text style={styles.subtitulo}>¿Qué tienes en casa? Agrega tus ingredientes:</Text>

      <View style={styles.filaInput}>
        <TextInput
          style={styles.input}
          placeholder="Ej. pollo"
          placeholderTextColor={colors.textMuted}
          value={ingredienteActual}
          onChangeText={setIngredienteActual}
          onSubmitEditing={agregarIngrediente}
          returnKeyType="done"
        />
        <Pressable style={styles.botonAgregar} onPress={agregarIngrediente}>
          <Ionicons name="add" size={20} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.chipsContenedor}>
        {ingredientes.map((ing) => (
          <View key={ing} style={styles.chip}>
            <Text style={styles.textoChip}>{ing}</Text>
            <Pressable onPress={() => quitarIngrediente(ing)}>
              <Ionicons name="close" size={14} color={colors.primaryDark} />
            </Pressable>
          </View>
        ))}
      </View>

      <Button label="Buscar recetas" onPress={buscarRecomendaciones} loading={buscando} />

      {buscando ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          data={recomendaciones}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: spacing.xl }}
          renderItem={({ item }) => (
            <Pressable style={styles.tarjetaReceta} onPress={() => router.push(`/receta/${item.id}`)}>
              <View style={styles.filaTitulo}>
                <Text style={styles.nombreReceta}>{item.nombre}</Text>
                <View style={styles.badgeCoincidencia}>
                  <Text style={styles.textoBadge}>{item.porcentajeCoincidencia}%</Text>
                </View>
              </View>
              {item.minutosPreparacion ? (
                <Text style={styles.metaReceta}>{item.minutosPreparacion} min</Text>
              ) : null}
              {item.ingredientesFaltantes.length > 0 ? (
                <Text style={styles.faltantes}>
                  Te falta: {item.ingredientesFaltantes.join(', ')}
                </Text>
              ) : (
                <Text style={styles.completa}>Tienes todo lo necesario ✓</Text>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            yaBusco ? (
              <Text style={styles.vacioTexto}>No se encontraron recetas con esos ingredientes.</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md, paddingTop: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  titulo: { ...typography.h2, color: colors.text },
  subtitulo: { ...typography.body, color: colors.textMuted, marginBottom: spacing.sm },
  filaInput: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  input: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...typography.body, color: colors.text,
  },
  botonAgregar: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  chipsContenedor: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryLight,
    borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  textoChip: { ...typography.caption, color: colors.primaryDark },
  tarjetaReceta: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm, ...shadow.card,
  },
  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nombreReceta: { ...typography.h3, color: colors.text, flex: 1 },
  badgeCoincidencia: { backgroundColor: colors.success, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  textoBadge: { color: colors.white, fontSize: 12, fontWeight: '700' },
  metaReceta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  faltantes: { ...typography.bodySmall, color: colors.warning, marginTop: spacing.xs },
  completa: { ...typography.bodySmall, color: colors.success, marginTop: spacing.xs },
  vacioTexto: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});
