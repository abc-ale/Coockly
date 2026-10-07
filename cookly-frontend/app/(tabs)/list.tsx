// app/(tabs)/list.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography, shadow } from '../../constants/theme';
import { api } from '../../lib/api';
import Button from '../../components/Button';

type ElementoLista = { id: number; comprado: boolean };
type ListaCompra = { id: number; nombre: string; creadaEn: string; elementos: ElementoLista[] };

export default function ListaCompraScreen() {
  const [listas, setListas] = useState<ListaCompra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [nombreNueva, setNombreNueva] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/listas-compra');
      setListas(data);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudieron cargar tus listas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function crearLista() {
    if (!nombreNueva.trim()) {
      Alert.alert('Falta el nombre', 'Ponle un nombre a tu lista.');
      return;
    }
    setCreando(true);
    try {
      const { data } = await api.post('/listas-compra', { nombre: nombreNueva.trim() });
      setNombreNueva('');
      setMostrarForm(false);
      router.push(`/lista-compra/${data.id}`);
    } catch (error: any) {
      console.log('ERROR STATUS:', error?.response?.status);
      console.log('ERROR DATA:', JSON.stringify(error?.response?.data));
      console.log('ERROR MESSAGE:', error?.message);
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo crear la lista.');
    } finally {
      setCreando(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Listas de compras</Text>
        <Pressable style={styles.botonAgregar} onPress={() => setMostrarForm((v) => !v)}>
          <Ionicons name={mostrarForm ? 'close' : 'add'} size={20} color={colors.white} />
        </Pressable>
      </View>

      {mostrarForm && (
        <View style={styles.formNueva}>
          <TextInput
            style={styles.input}
            placeholder="Nombre de la lista (ej. Compras de la semana)"
            placeholderTextColor={colors.textMuted}
            value={nombreNueva}
            onChangeText={setNombreNueva}
          />
          <Button label="Crear lista" onPress={crearLista} loading={creando} />
        </View>
      )}

      {cargando ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : listas.length === 0 ? (
        <Text style={styles.vacioTexto}>Todavía no tienes listas. Toca + para crear una.</Text>
      ) : (
        listas.map((lista) => {
          const total = lista.elementos.length;
          const comprados = lista.elementos.filter((e) => e.comprado).length;
          return (
            <Pressable key={lista.id} style={styles.tarjeta} onPress={() => router.push(`/lista-compra/${lista.id}`)}>
              <View style={styles.iconoLista}>
                <Ionicons name="cart-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombreLista}>{lista.nombre}</Text>
                <Text style={styles.progresoLista}>
                  {total === 0 ? 'Sin ítems todavía' : `${comprados} de ${total} comprados`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  titulo: { ...typography.h1, color: colors.text },
  botonAgregar: {
    width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  formNueva: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.md, gap: spacing.sm, ...shadow.card,
  },
  input: {
    backgroundColor: colors.background, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...typography.body, color: colors.text,
  },
  vacioTexto: { ...typography.body, color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' },
  tarjeta: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.card,
  },
  iconoLista: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  nombreLista: { ...typography.h3, color: colors.text },
  progresoLista: { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
});