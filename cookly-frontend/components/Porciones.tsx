// components/Porciones.tsx
// Selector "¿Para cuántas personas?" (1 a 500) y medida (original / tazas / cucharas).
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../constants/theme';
import { seleccion, toque } from '../lib/vibracion';
import { limitar, MAX_PERSONAS, MIN_PERSONAS, Modo, PORCIONES_BASE } from '../lib/cantidades';

type Props = {
  personas: number;
  modo: Modo;
  onPersonas: (n: number) => void;
  onModo: (m: Modo) => void;
};

const RAPIDOS = [2, 4, 6, 10, 20, 50, 100, 500];
const MODOS: { valor: Modo; etiqueta: string }[] = [
  { valor: 'original', etiqueta: 'Original' },
  { valor: 'gramos', etiqueta: 'Gramos' },
  { valor: 'kilos', etiqueta: 'Kilos' },
  { valor: 'tazas', etiqueta: 'Tazas' },
  { valor: 'cucharadas', etiqueta: 'Cucharas' },
];

export default function Porciones({ personas, modo, onPersonas, onModo }: Props) {
  const [borrador, setBorrador] = useState<string | null>(null);
  const ultimo = useRef(personas);
  const repetidor = useRef<ReturnType<typeof setInterval> | null>(null);
  const ticks = useRef(0);
  const salto = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    ultimo.current = personas;
    salto.setValue(1.14);
    Animated.spring(salto, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
  }, [personas, salto]);

  useEffect(() => () => detener(), []);

  function detener() {
    if (repetidor.current) clearInterval(repetidor.current);
    repetidor.current = null;
  }

  function mover(delta: number) {
    const nuevo = limitar(ultimo.current + delta);
    ultimo.current = nuevo;
    onPersonas(nuevo);
  }

  // Mantener presionado repite; después de un rato avanza de 5 en 5.
  function empezar(delta: number) {
    detener();
    toque();
    ticks.current = 0;
    mover(delta);
    repetidor.current = setInterval(() => {
      ticks.current += 1;
      mover(ticks.current > 12 ? delta * 5 : delta);
    }, 120);
  }

  function escribir(texto: string) {
    const soloDigitos = texto.replace(/[^0-9]/g, '').slice(0, 3);
    setBorrador(soloDigitos);
    if (soloDigitos !== '') onPersonas(limitar(parseInt(soloDigitos, 10)));
  }

  return (
    <View style={styles.tarjeta}>
      <Text style={styles.titulo}>¿Para cuántas personas?</Text>

      <View style={styles.fila}>
        <Pressable
          onPressIn={() => empezar(-1)}
          onPressOut={detener}
          disabled={personas <= MIN_PERSONAS}
          style={[styles.boton, personas <= MIN_PERSONAS && styles.botonOff]}
          accessibilityLabel="Menos personas"
        >
          <Ionicons name="remove" size={24} color={colors.white} />
        </Pressable>

        <Animated.View style={{ transform: [{ scale: salto }] }}>
        <TextInput
          style={styles.numero}
          keyboardType="number-pad"
          maxLength={3}
          value={borrador ?? String(personas)}
          onChangeText={escribir}
          onFocus={() => setBorrador('')}
          onBlur={() => setBorrador(null)}
          selectTextOnFocus
          accessibilityLabel="Número de personas"
        />
        </Animated.View>

        <Pressable
          onPressIn={() => empezar(1)}
          onPressOut={detener}
          disabled={personas >= MAX_PERSONAS}
          style={[styles.boton, personas >= MAX_PERSONAS && styles.botonOff]}
          accessibilityLabel="Más personas"
        >
          <Ionicons name="add" size={24} color={colors.white} />
        </Pressable>
      </View>

      <Text style={styles.nota}>
        Receta base: {PORCIONES_BASE} personas · de {MIN_PERSONAS} a {MAX_PERSONAS}
      </Text>

      <View style={styles.chips}>
        {RAPIDOS.map((n) => (
          <Pressable
            key={n}
            onPress={() => {
              seleccion();
              onPersonas(n);
            }}
            style={[styles.chip, personas === n && styles.chipOn]}
          >
            <Text style={[styles.chipTexto, personas === n && styles.chipTextoOn]}>{n}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.subtitulo}>Ver medidas en</Text>
      <View style={styles.segmentos}>
        {MODOS.map((m) => (
          <Pressable
            key={m.valor}
            onPress={() => {
              seleccion();
              onModo(m.valor);
            }}
            style={[styles.segmento, modo === m.valor && styles.segmentoOn]}
          >
            <Text style={[styles.segmentoTexto, modo === m.valor && styles.segmentoTextoOn]}>{m.etiqueta}</Text>
          </Pressable>
        ))}
      </View>

      {modo !== 'original' && (
        <Text style={styles.nota}>
          ≈ significa aproximado: las equivalencias entre peso (g, kg) y volumen (tazas, cucharas) solo se calculan en ingredientes conocidos (arroz, harina,
          azúcar, etc.).
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  titulo: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, marginBottom: spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  boton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonOff: { opacity: 0.35 },
  numero: {
    minWidth: 96,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    color: colors.text,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  nota: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: spacing.sm },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  chipOn: { backgroundColor: colors.primary },
  chipTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  chipTextoOn: { color: colors.white },
  subtitulo: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text, marginTop: spacing.md, marginBottom: 6 },
  segmentos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segmento: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill, alignItems: 'center', backgroundColor: colors.primaryLight },
  segmentoOn: { backgroundColor: colors.primary },
  segmentoTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  segmentoTextoOn: { color: colors.white },
});