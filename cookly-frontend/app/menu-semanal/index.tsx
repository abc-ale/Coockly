// app/menu-semanal/index.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Modal, TextInput, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius, spacing, typography, shadow } from '../../constants/theme';
import { api } from '../../lib/api';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const TIPOS_COMIDA = [
  { valor: 'DESAYUNO', etiqueta: 'Desayuno', icono: 'sunny-outline' as const },
  { valor: 'ALMUERZO', etiqueta: 'Almuerzo', icono: 'restaurant-outline' as const },
  { valor: 'CENA', etiqueta: 'Cena', icono: 'moon-outline' as const },
  { valor: 'MERIENDA', etiqueta: 'Merienda', icono: 'cafe-outline' as const },
];

type ElementoMenu = {
  id: number;
  receta: { id: number; nombre: string };
  diaSemana: number; // 1 (lunes) a 7 (domingo)
  tipoComida: string;
};

type Menu = { id: number; semana: string; elementos: ElementoMenu[] };

type RecetaOpcion = { id: number; nombre: string };

function lunesDeLaSemana(fecha: Date): Date {
  const copia = new Date(fecha);
  const diaActual = copia.getDay(); // 0 = domingo
  const diferencia = diaActual === 0 ? -6 : 1 - diaActual;
  copia.setDate(copia.getDate() + diferencia);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function formatearFecha(fecha: Date): string {
  return fecha.toISOString().split('T')[0]; // YYYY-MM-DD
}

export default function MenuSemanalScreen() {
  const [semanaActual, setSemanaActual] = useState<Date>(lunesDeLaSemana(new Date()));
  const [menu, setMenu] = useState<Menu | null>(null);
  const [cargando, setCargando] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [slotSeleccionado, setSlotSeleccionado] = useState<{ dia: number; tipo: string } | null>(null);
  const [recetas, setRecetas] = useState<RecetaOpcion[]>([]);
  const [buscandoRecetas, setBuscandoRecetas] = useState(false);
  const [textoBusqueda, setTextoBusqueda] = useState('');

  const cargarMenu = useCallback(async (fecha: Date) => {
    setCargando(true);
    try {
      const { data } = await api.post('/menus', { semana: formatearFecha(fecha) });
      setMenu(data);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo cargar el menú.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarMenu(semanaActual);
  }, [semanaActual, cargarMenu]);

  function cambiarSemana(dias: number) {
    const nueva = new Date(semanaActual);
    nueva.setDate(nueva.getDate() + dias);
    setSemanaActual(nueva);
  }

  function obtenerElemento(dia: number, tipo: string): ElementoMenu | undefined {
    return menu?.elementos.find((e) => e.diaSemana === dia && e.tipoComida === tipo);
  }

  function abrirSelectorReceta(dia: number, tipo: string) {
    setSlotSeleccionado({ dia, tipo });
    setModalVisible(true);
    buscarRecetas('');
  }

  async function buscarRecetas(texto: string) {
    setTextoBusqueda(texto);
    setBuscandoRecetas(true);
    try {
      const { data } = await api.get('/recetas/buscar', { params: { texto, pagina: 0, tamano: 30 } });
      setRecetas(data.content ?? []);
    } catch {
      setRecetas([]);
    } finally {
      setBuscandoRecetas(false);
    }
  }

  async function asignarReceta(recetaId: number) {
    if (!slotSeleccionado || !menu) return;
    try {
      await api.post(`/menus/${menu.id}/elementos`, {
        recetaId,
        diaSemana: slotSeleccionado.dia,
        tipoComida: slotSeleccionado.tipo,
      });
      setModalVisible(false);
      cargarMenu(semanaActual);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo agregar la receta.');
    }
  }

  async function quitarElemento(elementoId: number) {
    try {
      await api.delete(`/menus/elementos/${elementoId}`);
      setMenu((prev) => (prev ? { ...prev, elementos: prev.elementos.filter((e) => e.id !== elementoId) } : prev));
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo quitar la receta.');
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.titulo}>Menú semanal</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.selectorSemana}>
        <Pressable onPress={() => cambiarSemana(-7)}>
          <Ionicons name="chevron-back-circle-outline" size={26} color={colors.primary} />
        </Pressable>
        <Text style={styles.textoSemana}>Semana del {formatearFecha(semanaActual)}</Text>
        <Pressable onPress={() => cambiarSemana(7)}>
          <Ionicons name="chevron-forward-circle-outline" size={26} color={colors.primary} />
        </Pressable>
      </View>

      {cargando ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
          {DIAS.map((nombreDia, idx) => {
            const dia = idx + 1;
            return (
              <View key={dia} style={styles.tarjetaDia}>
                <Text style={styles.nombreDia}>{nombreDia}</Text>
                {TIPOS_COMIDA.map((tc) => {
                  const elemento = obtenerElemento(dia, tc.valor);
                  return (
                    <View key={tc.valor} style={styles.filaComida}>
                      <Ionicons name={tc.icono} size={16} color={colors.textMuted} />
                      <Text style={styles.etiquetaComida}>{tc.etiqueta}:</Text>
                      {elemento ? (
                        <View style={styles.chipReceta}>
                          <Text style={styles.textoChip} numberOfLines={1}>{elemento.receta.nombre}</Text>
                          <Pressable onPress={() => quitarElemento(elemento.id)}>
                            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable onPress={() => abrirSelectorReceta(dia, tc.valor)} style={styles.botonAgregarSlot}>
                          <Ionicons name="add" size={14} color={colors.primary} />
                          <Text style={styles.textoAgregarSlot}>Agregar</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContenedor}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>Elegir receta</Text>
            <Pressable onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <TextInput
            style={styles.inputBuscar}
            placeholder="Buscar receta..."
            placeholderTextColor={colors.textMuted}
            value={textoBusqueda}
            onChangeText={buscarRecetas}
          />
          {buscandoRecetas ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
          ) : (
            <FlatList
              data={recetas}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: spacing.md }}
              renderItem={({ item }) => (
                <Pressable style={styles.filaRecetaModal} onPress={() => asignarReceta(item.id)}>
                  <Text style={styles.textoRecetaModal}>{item.nombre}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.vacioModal}>No se encontraron recetas.</Text>}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, paddingTop: spacing.lg,
  },
  titulo: { ...typography.h2, color: colors.text },
  selectorSemana: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  textoSemana: { ...typography.bodySmall, color: colors.textMuted },
  tarjetaDia: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm, ...shadow.card,
  },
  nombreDia: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  filaComida: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  etiquetaComida: { ...typography.bodySmall, color: colors.textMuted, width: 70 },
  chipReceta: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primaryLight, borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  textoChip: { ...typography.caption, color: colors.primaryDark, flex: 1 },
  botonAgregarSlot: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  textoAgregarSlot: { ...typography.caption, color: colors.primary },
  modalContenedor: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, marginBottom: spacing.md,
  },
  modalTitulo: { ...typography.h2, color: colors.text },
  inputBuscar: {
    marginHorizontal: spacing.md, backgroundColor: colors.surface, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    ...typography.body, color: colors.text,
  },
  filaRecetaModal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  textoRecetaModal: { ...typography.body, color: colors.text },
  vacioModal: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});
