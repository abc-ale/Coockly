// app/(tabs)/list.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography, fonts, shadow } from '../../constants/theme';
import { api } from '../../lib/api';
import Button from '../../components/Button';
import ListaVacia from '../../components/ListaVacia';
import { seleccion } from '../../lib/vibracion';
import { Aparecer } from '../../components/Animaciones';

type ElementoLista = {
  id: number;
  comprado: boolean;
  nombreMostrado: string;
  cantidad: number | null;
  unidad: string | null;
};

const MAX_VISIBLES = 5; // cuántos ítems se ven en la tarjeta; el resto está al abrir la lista
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

  // Marca o desmarca un ítem directo desde la tarjeta (se ve al instante; si falla, vuelve atrás).
  async function alternarItem(listaId: number, item: ElementoLista) {
    seleccion();
    const poner = (comprado: boolean) =>
      setListas((prev) =>
        prev.map((l) =>
          l.id === listaId
            ? { ...l, elementos: l.elementos.map((e) => (e.id === item.id ? { ...e, comprado } : e)) }
            : l
        )
      );
    poner(!item.comprado);
    try {
      await api.put(`/listas-compra/elementos/${item.id}/comprado`, null, { params: { valor: !item.comprado } });
    } catch (error: any) {
      poner(item.comprado);
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo actualizar el ítem.');
    }
  }

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

  const hayListas = !cargando && listas.length > 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Encabezado */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Listas de compras</Text>
          <Text style={styles.subtitulo}>Organiza todo lo que necesitas para cocinar.</Text>
        </View>
        {hayListas && (
          <Pressable style={styles.botonAgregar} onPress={() => setMostrarForm((v) => !v)}>
            <Ionicons name={mostrarForm ? 'close' : 'add'} size={22} color={colors.white} />
          </Pressable>
        )}
      </View>

      {/* Formulario para crear una lista */}
      {mostrarForm && (
        <View style={styles.formNueva}>
          <TextInput
            style={styles.input}
            placeholder="Nombre de la lista (ej. Compras de la semana)"
            placeholderTextColor={colors.textMuted}
            value={nombreNueva}
            onChangeText={setNombreNueva}
            autoFocus
          />
          <Button label="Crear lista" onPress={crearLista} loading={creando} />
        </View>
      )}

      {cargando ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : listas.length === 0 ? (
        // Sin listas: tarjeta del diseño. El botón abre el formulario de arriba.
        !mostrarForm && <ListaVacia onCrear={() => setMostrarForm(true)} />
      ) : (
        listas.map((lista, indiceLista) => {
          const total = lista.elementos.length;
          const comprados = lista.elementos.filter((e) => e.comprado).length;
          const completa = total > 0 && comprados === total;
          const visibles = lista.elementos.slice(0, MAX_VISIBLES);
          const ocultos = total - visibles.length;
          return (
            <Aparecer key={lista.id} delay={Math.min(indiceLista, 6) * 80}>
            <View style={styles.tarjeta}>
              <Pressable style={styles.cabecera} onPress={() => router.push(`/lista-compra/${lista.id}`)}>
                <View style={[styles.iconoLista, completa && { backgroundColor: colors.magic }]}>
                  <Ionicons name={completa ? 'checkmark-done' : 'cart-outline'} size={20} color={completa ? colors.text : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nombreLista}>{lista.nombre}</Text>
                  <Text style={styles.progresoLista}>
                    {total === 0 ? 'Sin ítems todavía' : completa ? '¡Todo comprado!' : `${comprados} de ${total} comprados`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>

              {total > 0 && (
                <View style={styles.barra}>
                  <View style={[styles.barraRelleno, { width: `${(comprados / total) * 100}%` }, completa && { backgroundColor: colors.success }]} />
                </View>
              )}

              {visibles.map((item) => (
                <Pressable key={item.id} style={styles.fila} onPress={() => alternarItem(lista.id, item)} hitSlop={4}>
                  <View style={[styles.circulo, item.comprado && styles.circuloMarcado]}>
                    {item.comprado && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={[styles.textoItem, item.comprado && styles.textoItemComprado]} numberOfLines={1}>
                    {item.nombreMostrado}
                  </Text>
                  {!!item.cantidad && (
                    <Text style={[styles.cantidad, item.comprado && { opacity: 0.5 }]}>
                      {item.cantidad} {item.unidad ?? ''}
                    </Text>
                  )}
                </Pressable>
              ))}

              {ocultos > 0 && (
                <Pressable onPress={() => router.push(`/lista-compra/${lista.id}`)}>
                  <Text style={styles.verMas}>Ver {ocultos} más</Text>
                </Pressable>
              )}
            </View>
            </Aparecer>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  titulo: { ...typography.h1, color: colors.text },
  subtitulo: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 4 },
  botonAgregar: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  formNueva: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    marginHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm, ...shadow.card,
  },
  input: {
    backgroundColor: colors.background, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...typography.body, color: colors.text,
  },
  tarjeta: {
    backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
    marginHorizontal: spacing.md, ...shadow.card,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barra: { height: 6, borderRadius: 3, backgroundColor: colors.primaryLight, marginTop: spacing.sm, overflow: 'hidden' },
  barraRelleno: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  circulo: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  circuloMarcado: { backgroundColor: colors.primary },
  textoItem: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text },
  textoItemComprado: { textDecorationLine: 'line-through', color: colors.textMuted },
  cantidad: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary, backgroundColor: colors.primaryLight, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  verMas: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary, marginTop: 4 },
  iconoLista: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  nombreLista: { ...typography.h3, color: colors.text },
  progresoLista: { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
});