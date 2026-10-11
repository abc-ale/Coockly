// app/(tabs)/list.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, TextInput, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { colors, radius, spacing, fonts, shadow } from '../../constants/theme';
import { api } from '../../lib/api';
import { seleccion, toque, exito } from '../../lib/vibracion';
import { Aparecer, Presionable } from '../../components/Animaciones';

type ElementoLista = {
  id: number;
  comprado: boolean;
  nombreMostrado: string;
  cantidad: number | null;
  unidad: string | null;
};
type ListaCompra = { id: number; nombre: string; creadaEn: string; elementos: ElementoLista[] };

const NOMBRE_BLOC = 'Bloc de mercado';
const MAX_VISIBLES = 8;

// "Tacos de pollo (4 personas)" -> { titulo: "Tacos de pollo", personas: 4 }
function separarNombre(nombre: string) {
  const m = nombre.match(/^(.*?)\s*\((\d+)\s*personas?\)\s*$/i);
  return m ? { titulo: m[1], personas: Number(m[2]) } : { titulo: nombre, personas: null as number | null };
}

function numeroBonito(n: number) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace('.', ',');
}

const UNIDADES: Record<string, string> = {
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogramo: 'kg', kilogramos: 'kg',
  g: 'g', gr: 'g', gramo: 'g', gramos: 'g',
  l: 'l', lt: 'l', litro: 'l', litros: 'l',
  ml: 'ml', mililitro: 'ml', mililitros: 'ml',
  docena: 'docena', docenas: 'docena',
  paquete: 'paquete', paquetes: 'paquete',
  lata: 'lata', latas: 'lata',
  botella: 'botella', botellas: 'botella',
  unidad: 'u', unidades: 'u', u: 'u',
};

// "2 kilos de arroz" -> { cantidad: 2, unidad: 'kg', nombre: 'arroz' }
function interpretarNota(texto: string) {
  const limpio = texto.trim().replace(/\s+/g, ' ');
  const m = limpio.match(/^(\d+(?:[.,]\d+)?)\s*([a-záéíóúñ]+)?\s*(?:de\s+)?(.*)$/i);
  if (!m) return { nombre: limpio, cantidad: null as number | null, unidad: null as string | null };
  const cantidad = Number(m[1].replace(',', '.'));
  const palabra = (m[2] || '').toLowerCase();
  const resto = (m[3] || '').trim();
  if (palabra && UNIDADES[palabra] && resto) return { nombre: resto, cantidad, unidad: UNIDADES[palabra] };
  // sin unidad conocida: "3 limones" -> cantidad 3, nombre "limones"
  const nombre = [m[2], m[3]].filter(Boolean).join(' ').trim();
  return nombre
    ? { nombre, cantidad, unidad: null as string | null }
    : { nombre: limpio, cantidad: null as number | null, unidad: null as string | null };
}

function textoCantidad(e: ElementoLista) {
  if (!e.cantidad) return '';
  return `${numeroBonito(e.cantidad)}${e.unidad ? ' ' + e.unidad : ''}`;
}

export default function ListaCompraScreen() {
  const [listas, setListas] = useState<ListaCompra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState<'recetas' | 'mercado'>('recetas');
  const [nota, setNota] = useState('');
  const [anotando, setAnotando] = useState(false);
  const [limpiando, setLimpiando] = useState(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const { data } = await api.get('/listas-compra');
      setListas(data);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudieron cargar tus listas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const bloc = useMemo(() => listas.find((l) => l.nombre === NOMBRE_BLOC) ?? null, [listas]);
  const deRecetas = useMemo(() => listas.filter((l) => l.nombre !== NOMBRE_BLOC), [listas]);

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

  async function anotar() {
    const texto = nota.trim();
    if (!texto || anotando) return;
    setAnotando(true);
    toque();
    try {
      let listaId = bloc?.id;
      if (!listaId) {
        const { data } = await api.post('/listas-compra', { nombre: NOMBRE_BLOC });
        listaId = data.id;
      }
      const { nombre, cantidad, unidad } = interpretarNota(texto);
      await api.post(`/listas-compra/${listaId}/elementos`, {
        nombrePersonalizado: nombre.charAt(0).toUpperCase() + nombre.slice(1),
        cantidad,
        unidad,
      });
      setNota('');
      Keyboard.dismiss();
      exito();
      await cargar(true);
    } catch (error: any) {
      Alert.alert('No se pudo anotar', error?.response?.data?.mensaje || 'Inténtalo de nuevo.');
    } finally {
      setAnotando(false);
    }
  }

  // El servidor no tiene "borrar ítem": se borra el bloc y se vuelve a crear solo con lo que se conserva.
  async function reconstruirBloc(conservar: ElementoLista[]) {
    if (!bloc || limpiando) return;
    setLimpiando(true);
    try {
      await api.delete(`/listas-compra/${bloc.id}`);
      if (conservar.length > 0) {
        const { data: nueva } = await api.post('/listas-compra', { nombre: NOMBRE_BLOC });
        for (const e of conservar) {
          const { data: creado } = await api.post(`/listas-compra/${nueva.id}/elementos`, {
            nombrePersonalizado: e.nombreMostrado,
            cantidad: e.cantidad,
            unidad: e.unidad,
          });
          if (e.comprado) {
            await api.put(`/listas-compra/elementos/${creado.id}/comprado`, null, { params: { valor: true } });
          }
        }
      }
      exito();
    } catch (error: any) {
      Alert.alert('No se pudo limpiar', error?.response?.data?.mensaje || 'Inténtalo de nuevo.');
    } finally {
      await cargar(true);
      setLimpiando(false);
    }
  }

  function opcionesLimpiar() {
    const hechos = itemsBloc.filter((e) => e.comprado);
    const botones: any[] = [];
    if (hechos.length > 0 && hechos.length < itemsBloc.length) {
      botones.push({ text: 'Quitar los comprados', onPress: () => reconstruirBloc(itemsBloc.filter((e) => !e.comprado)) });
    }
    botones.push({ text: 'Borrar todo', style: 'destructive', onPress: () => reconstruirBloc([]) });
    botones.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Limpiar el bloc', '¿Qué quieres hacer?', botones);
  }

  function quitarItem(item: ElementoLista) {
    Alert.alert('Quitar de la lista', `¿Quitar "${item.nombreMostrado}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => reconstruirBloc(itemsBloc.filter((e) => e.id !== item.id)) },
    ]);
  }

  function tarjetaReceta(lista: ListaCompra, indice: number) {
    const { titulo, personas } = separarNombre(lista.nombre);
    const total = lista.elementos.length;
    const hechos = lista.elementos.filter((e) => e.comprado).length;
    const visibles = lista.elementos.slice(0, MAX_VISIBLES);
    const ocultos = total - visibles.length;
    return (
      <Aparecer key={lista.id} delay={Math.min(indice, 6) * 70}>
        <View style={styles.tarjetaVerde}>
          <Pressable style={styles.cabecera} onPress={() => router.push(`/lista-compra/${lista.id}`)}>
            <View style={styles.iconoTarjeta}>
              <Ionicons name="restaurant" size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tituloTarjeta} numberOfLines={2}>{titulo}</Text>
              <Text style={styles.subTarjeta} numberOfLines={1}>
                {personas ? `Enviada desde la receta · ${personas} ${personas === 1 ? 'persona' : 'personas'}` : 'Lista de compras'}
              </Text>
            </View>
            <Text style={styles.contador}>{hechos}/{total}</Text>
          </Pressable>

          {total > 0 && (
            <View style={styles.barra}>
              <View style={[styles.barraRelleno, { width: `${(hechos / total) * 100}%` }]} />
            </View>
          )}

          {total === 0 && <Text style={styles.vacioTarjeta}>Esta lista aún no tiene ingredientes.</Text>}

          {visibles.map((item) => (
            <Pressable key={item.id} style={styles.fila} onPress={() => alternarItem(lista.id, item)} hitSlop={4}>
              <View style={[styles.circulo, item.comprado && styles.circuloMarcado]}>
                {item.comprado && <Ionicons name="checkmark" size={14} color={colors.background} />}
              </View>
              <Text style={[styles.textoItem, item.comprado && styles.textoHecho]} numberOfLines={1}>
                {item.nombreMostrado}
              </Text>
              <Text style={[styles.cantidad, item.comprado && styles.textoHecho]}>{textoCantidad(item)}</Text>
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
  }

  const itemsBloc = bloc?.elementos ?? [];

  function tarjetaBloc() {
    return (
      <Aparecer>
        <View style={styles.tarjetaAmarilla}>
          <View style={styles.cabecera}>
            <View style={styles.iconoTarjeta}>
              <Ionicons name="document-text" size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tituloTarjeta}>{NOMBRE_BLOC}</Text>
              <Text style={styles.subTarjeta}>
                {itemsBloc.length === 0 ? 'Anota lo que te falte' : `${itemsBloc.length} ${itemsBloc.length === 1 ? 'anotado' : 'anotados'}`}
              </Text>
            </View>
            {itemsBloc.length > 0 && (
              <Pressable style={styles.botonLimpiar} onPress={opcionesLimpiar} disabled={limpiando} hitSlop={8}>
                {limpiando ? <ActivityIndicator size="small" color={colors.text} /> : <Ionicons name="trash-outline" size={20} color={colors.text} />}
              </Pressable>
            )}
          </View>

          {itemsBloc.map((item) => (
            <Pressable key={item.id} style={styles.fila} onPress={() => alternarItem(bloc!.id, item)} onLongPress={() => quitarItem(item)} hitSlop={4}>
              <View style={[styles.circulo, item.comprado && styles.circuloMarcado]}>
                {item.comprado && <Ionicons name="checkmark" size={14} color={colors.background} />}
              </View>
              <Text style={[styles.textoItem, item.comprado && styles.textoHecho]} numberOfLines={1}>
                {item.nombreMostrado}
              </Text>
              <Text style={[styles.cantidad, item.comprado && styles.textoHecho]}>{textoCantidad(item)}</Text>
            </Pressable>
          ))}

          {itemsBloc.length > 0 && <Text style={styles.pista}>Mantén presionado un ítem para quitarlo</Text>}

          <View style={styles.filaInput}>
            <TextInput
              style={styles.input}
              placeholder="Escribe: 2 kilos de arroz…"
              placeholderTextColor={colors.textMuted}
              value={nota}
              onChangeText={setNota}
              onSubmitEditing={anotar}
              returnKeyType="done"
              maxLength={80}
            />
            <Presionable escalaAlPresionar={0.9} onPress={anotar} disabled={anotando || !nota.trim()} style={styles.botonMas}>
              {anotando ? <ActivityIndicator size="small" color={colors.background} /> : <Ionicons name="add" size={26} color={colors.background} />}
            </Presionable>
          </View>
        </View>
      </Aparecer>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 130 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>Tus compras</Text>
        <Text style={styles.titulo}>Mi lista</Text>
      </View>

      <View style={styles.segmento}>
        {([['recetas', 'Mis recetas'], ['mercado', 'Mercado']] as const).map(([clave, etiqueta]) => {
          const activa = pestana === clave;
          return (
            <Pressable
              key={clave}
              style={[styles.pestana, activa && styles.pestanaActiva]}
              onPress={() => { seleccion(); setPestana(clave); }}
            >
              <Text style={[styles.pestanaTexto, activa && styles.pestanaTextoActivo]}>{etiqueta}</Text>
            </Pressable>
          );
        })}
      </View>

      {cargando ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : pestana === 'recetas' ? (
        deRecetas.length === 0 ? (
          <View style={styles.vacio}>
            <Ionicons name="cart-outline" size={34} color={colors.primary} />
            <Text style={styles.vacioTitulo}>Aún no tienes recetas en tu lista</Text>
            <Text style={styles.vacioTexto}>Abre una receta y toca “Enviar a mi lista” para traer sus ingredientes.</Text>
          </View>
        ) : (
          deRecetas.map(tarjetaReceta)
        )
      ) : (
        tarjetaBloc()
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  titulo: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.text },

  segmento: {
    flexDirection: 'row', backgroundColor: colors.primaryLight, borderRadius: radius.pill,
    padding: 4, marginHorizontal: spacing.md, marginBottom: spacing.md,
  },
  pestana: { flex: 1, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pestanaActiva: { backgroundColor: colors.surface, ...shadow.card },
  pestanaTexto: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textMuted },
  pestanaTextoActivo: { color: colors.text },

  tarjetaVerde: {
    backgroundColor: colors.magic, borderRadius: radius.lg, padding: spacing.md,
    marginHorizontal: spacing.md, marginBottom: spacing.md,
  },
  tarjetaAmarilla: {
    backgroundColor: colors.accent, borderRadius: radius.lg, padding: spacing.md,
    marginHorizontal: spacing.md, marginBottom: spacing.md,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconoTarjeta: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  tituloTarjeta: { fontFamily: fonts.heading, fontSize: 18, lineHeight: 22, color: colors.text },
  subTarjeta: { fontFamily: fonts.body, fontSize: 13, color: colors.text, opacity: 0.7, marginTop: 2 },
  contador: { fontFamily: fonts.display, fontSize: 18, color: colors.text },

  barra: { height: 8, borderRadius: 4, backgroundColor: 'rgba(43,18,32,0.15)', marginVertical: spacing.md, overflow: 'hidden' },
  barraRelleno: { height: 8, borderRadius: 4, backgroundColor: colors.text },
  vacioTarjeta: { fontFamily: fonts.body, fontSize: 14, color: colors.text, opacity: 0.7, marginTop: spacing.md },

  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  circulo: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.text,
    alignItems: 'center', justifyContent: 'center',
  },
  circuloMarcado: { backgroundColor: colors.text },
  textoItem: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  textoHecho: { textDecorationLine: 'line-through', opacity: 0.5 },
  cantidad: { fontFamily: fonts.body, fontSize: 14, color: colors.text, opacity: 0.75 },
  verMas: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, marginTop: 6, textDecorationLine: 'underline' },

  botonLimpiar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  pista: { fontFamily: fonts.body, fontSize: 12, color: colors.text, opacity: 0.6, marginTop: 6 },
  filaInput: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.md },
  input: {
    flex: 1, height: 50, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 18, fontFamily: fonts.body, fontSize: 15, color: colors.text,
  },
  botonMas: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  vacio: { alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.xl, gap: 8 },
  vacioTitulo: { fontFamily: fonts.heading, fontSize: 18, color: colors.text, textAlign: 'center' },
  vacioTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});