// app/lista-compra/[id].tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography, fonts, shadow } from '../../constants/theme';
import { api } from '../../lib/api';
import { mostrarAviso } from '../../components/Aviso';
import { exito } from '../../lib/vibracion';

// Mismo margen de arriba que las pantallas de las pestañas
const MARGEN_SUPERIOR = 24;

type Elemento = {
  id: number;
  nombreMostrado: string;
  cantidad: number | null;
  unidad: string | null;
  comprado: boolean;
};

type ListaDetalle = { id: number; nombre: string; elementos: Elemento[] };

// Unidades que se pueden elegir en el desplegable
const UNIDADES = [
  { valor: 'unidad', etiqueta: 'Unidad', paso: 1 },
  { valor: 'kg', etiqueta: 'Kilo (kg)', paso: 0.5 },
  { valor: 'g', etiqueta: 'Gramo (g)', paso: 100 },
  { valor: 'L', etiqueta: 'Litro (L)', paso: 0.5 },
  { valor: 'paquete', etiqueta: 'Paquete', paso: 1 },
];

// Fila de un producto, con círculo animado para marcar como comprado
function FilaItem({ item, onPress }: { item: Elemento; onPress: () => void }) {
  const escala = useRef(new Animated.Value(1)).current;
  const primera = useRef(true);

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    escala.setValue(0.7);
    Animated.spring(escala, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
  }, [item.comprado]);

  return (
    <Pressable style={[s.filaItem, item.comprado && s.filaItemComprada]} onPress={onPress}>
      <Animated.View style={[s.circulo, item.comprado && s.circuloMarcado, { transform: [{ scale: escala }] }]}>
        {item.comprado && <Ionicons name="checkmark" size={18} color="#fff" />}
      </Animated.View>

      <View style={{ flex: 1 }}>
        <Text style={[s.textoItem, item.comprado && s.textoItemComprado]} numberOfLines={2}>
          {item.nombreMostrado}
        </Text>
        {item.comprado && <Text style={s.yaLoTienes}>¡Ya lo tienes!</Text>}
      </View>

      {!!item.cantidad && (
        <View style={[s.chipCantidad, item.comprado && { opacity: 0.5 }]}>
          <Text style={s.chipCantidadTexto}>
            {item.cantidad} {item.unidad ?? ''}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function ListaCompraDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [lista, setLista] = useState<ListaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [nombreItem, setNombreItem] = useState('');
  const [cantidadItem, setCantidadItem] = useState('1');
  const [unidadItem, setUnidadItem] = useState(UNIDADES[0]);
  const [menuUnidad, setMenuUnidad] = useState(false);
  const [agregando, setAgregando] = useState(false);

  const progreso = useRef(new Animated.Value(0)).current;

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

  const total = lista?.elementos.length ?? 0;
  const comprados = lista?.elementos.filter((e) => e.comprado).length ?? 0;

  // La barra de progreso se llena con animación
  useEffect(() => {
    Animated.timing(progreso, {
      toValue: total === 0 ? 0 : comprados / total,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [comprados, total]);

  function cambiarCantidad(delta: number) {
    const actual = Number(cantidadItem.replace(',', '.')) || 0;
    const siguiente = Math.max(0, Math.round((actual + delta * unidadItem.paso) * 100) / 100);
    setCantidadItem(String(siguiente));
  }

  async function agregarItem() {
    if (!nombreItem.trim()) {
      Alert.alert('Falta el nombre', 'Escribe qué quieres agregar.');
      return;
    }
    const cantidadNumero = Number(cantidadItem.replace(',', '.'));
    setAgregando(true);
    try {
      await api.post(`/listas-compra/${id}/elementos`, {
        nombrePersonalizado: nombreItem.trim(),
        cantidad: cantidadNumero > 0 ? cantidadNumero : undefined,
        unidad: unidadItem.valor,
      });
      setNombreItem('');
      setCantidadItem('1');
      setUnidadItem(UNIDADES[0]);
      setMenuUnidad(false);
      await cargar();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo agregar el ítem.');
    } finally {
      setAgregando(false);
    }
  }

  // Al comprar TODO, se muestra el festejo un momento y la lista se quita sola (si desmarcas algo, se cancela).
  const listaRef = useRef<typeof lista>(null);
  const temporizadorFin = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    listaRef.current = lista;
  }, [lista]);
  useEffect(() => () => {
    if (temporizadorFin.current) clearTimeout(temporizadorFin.current);
  }, []);

  function revisarListaCompleta() {
    if (temporizadorFin.current) clearTimeout(temporizadorFin.current);
    temporizadorFin.current = setTimeout(async () => {
      const actual = listaRef.current;
      if (!actual || actual.elementos.length === 0 || actual.elementos.some((e) => !e.comprado)) return;
      try {
        await api.delete(`/listas-compra/${id}`);
        exito();
        mostrarAviso(`Lista completa: ${actual.nombre}`, 'exito');
        router.back();
      } catch {
        /* si no se pudo quitar, la lista queda ahí */
      }
    }, 2200);
  }

  async function alternarComprado(item: Elemento) {
    try {
      await api.put(`/listas-compra/elementos/${item.id}/comprado`, null, { params: { valor: !item.comprado } });
      setLista((prev) =>
        prev
          ? { ...prev, elementos: prev.elementos.map((e) => (e.id === item.id ? { ...e, comprado: !e.comprado } : e)) }
          : prev
      );
      revisarListaCompleta();
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
            Alert.alert('No se pudo eliminar', error?.response?.data?.mensaje || 'Inténtalo de nuevo en un momento.');
          }
        },
      },
    ]);
  }

  if (cargando) {
    return (
      <View style={s.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!lista) {
    return (
      <View style={s.centrado}>
        <Text style={{ color: colors.textMuted }}>No se encontró la lista.</Text>
      </View>
    );
  }

  const ancho = progreso.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const completa = total > 0 && comprados === total;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={s.screen}
        contentContainerStyle={{
          paddingTop: insets.top + MARGEN_SUPERIOR,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado */}
        <View style={s.header}>
          <Pressable style={s.botonRedondo} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={s.titulo} numberOfLines={1}>{lista.nombre}</Text>
          <Pressable style={s.botonRedondo} onPress={confirmarEliminarLista}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </View>

        {/* Progreso */}
        <View style={s.tarjetaProgreso}>
          <View style={s.progresoTop}>
            <Text style={s.progresoTitulo}>
              {total === 0 ? 'Agrega tu primer producto' : completa ? '¡Lista completa! 🎉' : 'Tu compra'}
            </Text>
            <Text style={s.progresoContador}>{comprados} de {total}</Text>
          </View>
          <View style={s.barraFondo}>
            <Animated.View style={[s.barraRelleno, { width: ancho }, completa && { backgroundColor: colors.magic }]} />
          </View>
        </View>

        {/* Agregar producto */}
        <View style={s.tarjetaAgregar}>
          <TextInput
            style={s.inputNombre}
            placeholder="¿Qué necesitas comprar?"
            placeholderTextColor={colors.textMuted}
            value={nombreItem}
            onChangeText={setNombreItem}
            returnKeyType="done"
          />

          <View style={s.filaCantidad}>
            {/* Cantidad con - y + */}
            <View style={s.stepper}>
              <Pressable style={s.stepperBoton} onPress={() => cambiarCantidad(-1)} hitSlop={6}>
                <Ionicons name="remove" size={18} color={colors.primary} />
              </Pressable>
              <TextInput
                style={s.stepperValor}
                value={cantidadItem}
                onChangeText={setCantidadItem}
                keyboardType="decimal-pad"
                textAlign="center"
              />
              <Pressable style={s.stepperBoton} onPress={() => cambiarCantidad(1)} hitSlop={6}>
                <Ionicons name="add" size={18} color={colors.primary} />
              </Pressable>
            </View>

            {/* Unidad desplegable */}
            <Pressable style={s.selectorUnidad} onPress={() => setMenuUnidad((v) => !v)}>
              <Text style={s.selectorUnidadTexto}>{unidadItem.etiqueta}</Text>
              <Ionicons name={menuUnidad ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
            </Pressable>
          </View>

          {menuUnidad && (
            <View style={s.menuUnidad}>
              {UNIDADES.map((u) => {
                const activa = u.valor === unidadItem.valor;
                return (
                  <Pressable
                    key={u.valor}
                    style={[s.opcionUnidad, activa && s.opcionUnidadActiva]}
                    onPress={() => {
                      setUnidadItem(u);
                      setMenuUnidad(false);
                    }}
                  >
                    <Text style={[s.opcionUnidadTexto, activa && { color: colors.primary, fontFamily: fonts.bodyBold }]}>
                      {u.etiqueta}
                    </Text>
                    {activa && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable style={s.botonAgregar} onPress={agregarItem} disabled={agregando}>
            {agregando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={22} color="#fff" />
                <Text style={s.botonAgregarTexto}>Agregar a la lista</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Productos */}
        {lista.elementos.length === 0 ? (
          <View style={s.vacio}>
            <Ionicons name="basket-outline" size={40} color={colors.primary} />
            <Text style={s.vacioTexto}>Todavía no hay ítems en esta lista.</Text>
          </View>
        ) : (
          <View style={{ marginTop: spacing.md }}>
            {lista.elementos.map((item) => (
              <FilaItem key={item.id} item={item} onPress={() => alternarComprado(item)} />
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, marginBottom: spacing.md,
  },
  botonRedondo: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', ...shadow.card,
  },
  titulo: { ...typography.h2, color: colors.text, flex: 1, textAlign: 'center' },

  tarjetaProgreso: {
    backgroundColor: colors.surface, borderRadius: 24, padding: spacing.md,
    marginHorizontal: spacing.md, ...shadow.card,
  },
  progresoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progresoTitulo: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
  progresoContador: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  barraFondo: { height: 10, borderRadius: 5, backgroundColor: colors.primaryLight, overflow: 'hidden' },
  barraRelleno: { height: 10, borderRadius: 5, backgroundColor: colors.primary },

  tarjetaAgregar: {
    backgroundColor: colors.surface, borderRadius: 24, padding: spacing.md,
    marginHorizontal: spacing.md, marginTop: spacing.md, ...shadow.card,
  },
  inputNombre: {
    fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text,
    paddingVertical: 12, paddingHorizontal: 4, textAlign: 'left',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  filaCantidad: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  stepper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight,
    borderRadius: 999, paddingHorizontal: 6, height: 48,
  },
  stepperBoton: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperValor: {
    minWidth: 52, fontFamily: fonts.heading, fontSize: 17, color: colors.text,
    paddingVertical: 0, textAlignVertical: 'center',
  },
  selectorUnidad: {
    flex: 1, height: 48, borderRadius: 999, backgroundColor: colors.primaryLight,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18,
  },
  selectorUnidadTexto: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },

  menuUnidad: {
    marginTop: 10, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  opcionUnidad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 18,
  },
  opcionUnidadActiva: { backgroundColor: colors.primaryLight },
  opcionUnidadTexto: { fontFamily: fonts.body, fontSize: 15, color: colors.text },

  botonAgregar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 999, backgroundColor: colors.primary, marginTop: 16,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  botonAgregarTexto: { fontFamily: fonts.heading, fontSize: 16, color: '#fff' },

  vacio: { alignItems: 'center', marginTop: spacing.xl, gap: 10 },
  vacioTexto: { ...typography.body, color: colors.textMuted, textAlign: 'center' },

  filaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface,
    borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16,
    marginHorizontal: spacing.md, marginBottom: 10, ...shadow.card,
  },
  filaItemComprada: { backgroundColor: '#F7FBF3' },
  circulo: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent',
  },
  circuloMarcado: { backgroundColor: colors.primary },
  textoItem: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  textoItemComprado: { textDecorationLine: 'line-through', color: colors.textMuted },
  yaLoTienes: { fontFamily: fonts.body, fontSize: 12, color: '#5E9A52', marginTop: 2 },
  chipCantidad: { backgroundColor: colors.primaryLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipCantidadTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
});