// components/Porciones.tsx
// Cabecera de "Ingredientes": título + selector de personas (− 4 +) y las medidas
// (Original · Gramos/Kilos · Tazas/Cucharas). Mantener presionado repite; luego avanza de 5 en 5.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../constants/theme';
import { seleccion, toque } from '../lib/vibracion';
import { limitar, MAX_PERSONAS, MIN_PERSONAS, Modo } from '../lib/cantidades';

type Props = {
  personas: number;
  modo: Modo;
  onPersonas: (n: number) => void;
  onModo: (m: Modo) => void;
};

const MODOS: { valor: Modo; etiqueta: string }[] = [
  { valor: 'original', etiqueta: 'Original' },
  { valor: 'medidas', etiqueta: 'Cucharas/Tazas' },
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
    <View>
      <View style={s.cabecera}>
        <Text style={s.titulo}>Ingredientes</Text>

        <View style={s.pastilla}>
          <Pressable
            onPressIn={() => empezar(-1)}
            onPressOut={detener}
            disabled={personas <= MIN_PERSONAS}
            style={[s.boton, personas <= MIN_PERSONAS && s.botonOff]}
            accessibilityLabel="Menos personas"
          >
            <Ionicons name="remove" size={18} color={colors.text} />
          </Pressable>

          <Animated.View style={{ transform: [{ scale: salto }] }}>
            <TextInput
              style={s.numero}
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
            style={[s.boton, s.botonMas, personas >= MAX_PERSONAS && s.botonOff]}
            accessibilityLabel="Más personas"
          >
            <Ionicons name="add" size={18} color={colors.white} />
          </Pressable>
        </View>
      </View>

      <View style={s.segmentos}>
        {MODOS.map((m) => {
          const activo = modo === m.valor;
          return (
            <Pressable
              key={m.valor}
              onPress={() => {
                seleccion();
                onModo(m.valor);
              }}
              style={[s.segmento, activo && s.segmentoOn]}
            >
              <Text style={[s.segmentoTexto, activo && s.segmentoTextoOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{m.etiqueta}</Text>
            </Pressable>
          );
        })}
      </View>

      {modo !== 'original' && (
        <Text style={s.aviso}>
          ≈ es aproximado: el cambio entre peso y volumen solo se calcula en ingredientes conocidos (arroz, harina, azúcar, leche…).
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontFamily: fonts.heading, fontSize: 22, color: colors.text },
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 3,
  },
  boton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  botonMas: { backgroundColor: colors.primary },
  botonOff: { opacity: 0.35 },
  numero: { minWidth: 46, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text, paddingVertical: 0 },
  segmentos: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  segmento: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segmentoOn: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  segmentoTexto: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  segmentoTextoOn: { color: colors.white },
  aviso: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
});