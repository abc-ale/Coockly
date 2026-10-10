// components/CocinaGuiada.tsx
// Modo "Cocina guiada": un paso a la vez, con cronómetro para los pasos
// que llevan tiempo (hervir, sancochar, hornear, reposar...).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal, View, Text, Pressable, ScrollView, StyleSheet, Vibration, Alert, Animated, Easing, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { colors, fonts, radius, spacing, typography, shadow } from '../constants/theme';
import { exito, seleccion } from '../lib/vibracion';
import { guardarProgreso, borrarProgreso, leerProgreso } from '../lib/progresoCocina';
import { mostrarAviso } from './Aviso';

export type PasoGuia = { id: number; orden: number; instruccion: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  nombre: string;
  pasos: PasoGuia[];
  /** Para recordar en qué paso se quedó el usuario. */
  recetaId?: number;
  /** true: abre en el último paso guardado en vez de en el primero. */
  retomar?: boolean;
};

type Cronometro = {
  total: number;            // segundos totales
  estado: 'pausa' | 'corriendo' | 'listo';
  restante: number;         // segundos (cuando no está corriendo)
  fin: number | null;       // marca de tiempo en que termina (cuando corre)
};

/* ---------- Detección de tiempos en el texto del paso ---------- */

// Suma todos los tiempos que aparezcan: "1 hora y 30 minutos" = 5400 s.
// Si hay un rango ("20 a 25 minutos") toma el mayor.
function tiempoDelTexto(texto: string): number {
  const t = texto.toLowerCase();
  let segundos = 0;

  if (/media hora/.test(t)) segundos += 30 * 60;

  const re =
    /(\d+(?:[.,]\d+)?)\s*(?:(?:a|-|–|o)\s*(\d+(?:[.,]\d+)?)\s*)?(horas?|hrs?|h|minutos?|mins?|min|segundos?|segs?|seg)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const a = parseFloat(m[1].replace(',', '.'));
    const b = m[2] ? parseFloat(m[2].replace(',', '.')) : a;
    const valor = Math.max(a, b);
    const unidad = m[3];
    if (unidad.startsWith('h')) segundos += valor * 3600;
    else if (unidad.startsWith('s')) segundos += valor;
    else segundos += valor * 60;
  }
  return Math.round(segundos);
}

// Pasos que suelen llevar espera aunque no digan cuánto: se sugiere un tiempo.
function sugerenciaSinTiempo(texto: string): { etiqueta: string; minutos: number } | null {
  const t = texto.toLowerCase();
  if (/sancoch/.test(t)) return { etiqueta: 'Sancochar', minutos: 20 };
  if (/hierv|herv|hervir|cuece|cocer|cocina a fuego/.test(t)) return { etiqueta: 'Hervir', minutos: 10 };
  if (/horne|horno/.test(t)) return { etiqueta: 'Hornear', minutos: 30 };
  if (/reposa|descansa|enfri|refriger|marin/.test(t)) return { etiqueta: 'Reposar', minutos: 15 };
  if (/remoj/.test(t)) return { etiqueta: 'Remojar', minutos: 30 };
  if (/fr[ií]e|fre[ií]r|dora|sofr[ií]e|saltea|cocina/.test(t)) return { etiqueta: 'Cocinar', minutos: 5 };
  return null;
}

function formato(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const dos = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${dos(m)}:${dos(r)}` : `${dos(m)}:${dos(r)}`;
}

/* ---------- Componente ---------- */

/* ---------- Celebración al terminar la receta ---------- */
const CONFETI: { icono: keyof typeof Ionicons.glyphMap; color: string; x: number; retraso: number }[] = [
  { icono: 'heart', color: '#FF4D80', x: 0.1, retraso: 0 },
  { icono: 'leaf', color: '#6FBF73', x: 0.22, retraso: 220 },
  { icono: 'heart', color: '#FF8DB2', x: 0.34, retraso: 90 },
  { icono: 'star', color: '#FFD866', x: 0.46, retraso: 330 },
  { icono: 'leaf', color: '#BEE3A5', x: 0.58, retraso: 140 },
  { icono: 'heart', color: '#FF4D80', x: 0.7, retraso: 280 },
  { icono: 'star', color: '#FFD866', x: 0.82, retraso: 60 },
  { icono: 'leaf', color: '#6FBF73', x: 0.92, retraso: 200 },
];

function PiezaConfeti({ icono, color, x, retraso, alto, ancho }: (typeof CONFETI)[number] & { alto: number; ancho: number }) {
  const caida = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(caida, { toValue: 1, duration: 1800, delay: retraso, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
  }, [caida, retraso]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: -30,
        left: ancho * x - 12,
        opacity: caida.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: caida.interpolate({ inputRange: [0, 1], outputRange: [0, alto] }) },
          { rotate: caida.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '300deg'] }) },
        ],
      }}
    >
      <Ionicons name={icono} size={26} color={color} />
    </Animated.View>
  );
}

function Celebracion() {
  const { width, height } = useWindowDimensions();
  const escala = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(escala, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
  }, [escala]);
  return (
    <View style={celebracionEstilos.fondo} pointerEvents="none">
      {CONFETI.map((c, i) => (
        <PiezaConfeti key={i} {...c} alto={height} ancho={width} />
      ))}
      <Animated.View style={[celebracionEstilos.circulo, { transform: [{ scale: escala }] }]}>
        <Ionicons name="checkmark" size={64} color="#fff" />
      </Animated.View>
      <Text style={celebracionEstilos.titulo}>¡Listo!</Text>
      <Text style={celebracionEstilos.texto}>Buen provecho</Text>
    </View>
  );
}

const celebracionEstilos = StyleSheet.create({
  fondo: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,248,246,0.96)', alignItems: 'center', justifyContent: 'center' },
  circulo: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: fonts.displayBold, fontSize: 34, color: colors.primary, marginTop: spacing.md },
  texto: { fontFamily: fonts.body, fontSize: 17, color: colors.textMuted, marginTop: 4 },
});

export default function CocinaGuiada({ visible, onClose, nombre, pasos, recetaId, retomar }: Props) {
  const lista = useMemo(() => [...pasos].sort((a, b) => a.orden - b.orden), [pasos]);
  const [indice, setIndice] = useState(0);
  const [crono, setCrono] = useState<Record<number, Cronometro>>({});
  const [ahora, setAhora] = useState(Date.now());
  const [leyendo, setLeyendo] = useState(false);
  const [celebrando, setCelebrando] = useState(false);
  const deslizar = useRef(new Animated.Value(1)).current;
  const direccion = useRef(1);
  // Evita sobrescribir el paso guardado antes de haberlo leído.
  const puedeGuardar = useRef(true);

  const hayCorriendo = Object.values(crono).some((c) => c.estado === 'corriendo');

  // Reloj: solo gira mientras haya algún cronómetro en marcha
  useEffect(() => {
    if (!hayCorriendo) return;
    const intervalo = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(intervalo);
  }, [hayCorriendo]);

  // Detecta cronómetros que llegaron a cero
  useEffect(() => {
    const terminados = Object.entries(crono).filter(
      ([, c]) => c.estado === 'corriendo' && c.fin !== null && c.fin <= ahora,
    );
    if (terminados.length === 0) return;

    setCrono((prev) => {
      const sig = { ...prev };
      terminados.forEach(([k]) => {
        sig[Number(k)] = { ...prev[Number(k)], estado: 'listo', restante: 0, fin: null };
      });
      return sig;
    });
    Vibration.vibrate([0, 600, 300, 600, 300, 600]);
    exito();
    const ordenes = terminados
      .map(([k]) => lista.find((p) => p.id === Number(k))?.orden)
      .filter(Boolean)
      .join(', ');
    Alert.alert('¡Tiempo cumplido!', `Terminó el cronómetro del paso ${ordenes}.`);
  }, [ahora, crono, lista]);

  // Al abrir: primer paso, o el último guardado si el usuario viene a "Continuar".
  useEffect(() => {
    if (visible) {
      setIndice(0);
      puedeGuardar.current = !(retomar && recetaId !== undefined);
      if (!puedeGuardar.current) {
        leerProgreso().then((p) => {
          if (p && p.recetaId === recetaId) setIndice(Math.min(p.paso, Math.max(lista.length - 1, 0)));
          puedeGuardar.current = true;
        });
      }
    } else {
      Speech.stop();
      setLeyendo(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Guarda el paso actual para poder "Continuar cocinando" más tarde.
  useEffect(() => {
    if (visible && puedeGuardar.current && recetaId !== undefined && lista.length > 0) {
      guardarProgreso({ recetaId, nombre, paso: indice, total: lista.length });
    }
  }, [visible, indice, recetaId, nombre, lista.length]);

  if (lista.length === 0) return null;

  // Cada paso entra deslizando desde el lado al que vas (adelante o atrás).
  useEffect(() => {
    deslizar.setValue(0);
    Animated.timing(deslizar, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [indice, deslizar]);

  const paso = lista[indice];
  const esUltimo = indice === lista.length - 1;
  // Tiempo predeterminado: el que dice el paso o, si no dice, el típico de esa técnica.
  // El usuario no lo modifica: solo lo inicia.
  const segundosTexto = tiempoDelTexto(paso.instruccion);
  const sugerencia = segundosTexto === 0 ? sugerenciaSinTiempo(paso.instruccion) : null;
  const segundosPaso = segundosTexto > 0 ? segundosTexto : (sugerencia ? sugerencia.minutos * 60 : 0);
  const c = crono[paso.id];

  function restanteDe(cr: Cronometro): number {
    return cr.estado === 'corriendo' && cr.fin ? Math.max(0, (cr.fin - ahora) / 1000) : cr.restante;
  }

  function iniciar(segundos: number) {
    setAhora(Date.now());
    setCrono((prev) => ({
      ...prev,
      [paso.id]: { total: segundos, estado: 'corriendo', restante: segundos, fin: Date.now() + segundos * 1000 },
    }));
  }

  function pausarOReanudar() {
    if (!c) return;
    setAhora(Date.now());
    if (c.estado === 'corriendo') {
      setCrono((prev) => ({
        ...prev,
        [paso.id]: { ...c, estado: 'pausa', restante: restanteDe(c), fin: null },
      }));
    } else if (c.estado === 'pausa') {
      setCrono((prev) => ({
        ...prev,
        [paso.id]: { ...c, estado: 'corriendo', fin: Date.now() + c.restante * 1000 },
      }));
    }
  }

  function reiniciar() {
    setCrono((prev) => {
      const sig = { ...prev };
      delete sig[paso.id];
      return sig;
    });
  }

  function terminar() {
    borrarProgreso();
    exito();
    setCelebrando(true);
    setTimeout(() => {
      setCelebrando(false);
      cerrar();
    }, 2200);
  }

  function ir(nuevo: number) {
    seleccion();
    Speech.stop();
    setLeyendo(false);
    direccion.current = nuevo >= indice ? 1 : -1;
    setIndice(Math.min(Math.max(nuevo, 0), lista.length - 1));
  }

  function alternarVoz() {
    if (leyendo) {
      Speech.stop();
      setLeyendo(false);
    } else {
      setLeyendo(true);
      Speech.speak(paso.instruccion, {
        language: 'es-ES',
        onDone: () => setLeyendo(false),
        onStopped: () => setLeyendo(false),
        onError: () => setLeyendo(false),
      });
    }
  }

  function cerrar() {
    Speech.stop();
    setLeyendo(false);
    onClose();
  }

  // Cronómetros activos en otros pasos (para no perderlos de vista)
  const otrosActivos = lista.filter(
    (p) => p.id !== paso.id && crono[p.id] && crono[p.id].estado !== 'listo',
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cerrar}>
      <SafeAreaView style={styles.pantalla}>
        {/* Encabezado */}
        <View style={styles.encabezado}>
          <Pressable onPress={cerrar} style={styles.botonCerrar} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.etiquetaModo}>Cocina guiada</Text>
            <Text style={styles.nombreReceta} numberOfLines={1}>{nombre}</Text>
          </View>
        </View>

        {/* Progreso */}
        <View style={styles.progresoFila}>
          {lista.map((p, i) => (
            <View
              key={p.id}
              style={[
                styles.progresoBarra,
                i <= indice && { backgroundColor: colors.primary },
              ]}
            />
          ))}
        </View>
        <Text style={styles.contador}>Paso {indice + 1} de {lista.length}</Text>

        {/* Cronómetros de otros pasos */}
        {otrosActivos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}
            contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}>
            {otrosActivos.map((p) => (
              <Pressable key={p.id} style={styles.chip} onPress={() => ir(lista.findIndex((x) => x.id === p.id))}>
                <Ionicons name="timer-outline" size={14} color={colors.text} />
                <Text style={styles.chipTexto}>Paso {p.orden} · {formato(restanteDe(crono[p.id]))}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Animated.View
          style={{
            flex: 1,
            opacity: deslizar,
            transform: [{ translateX: deslizar.interpolate({ inputRange: [0, 1], outputRange: [40 * direccion.current, 0] }) }],
          }}
        >
        <ScrollView contentContainerStyle={styles.cuerpo}>
          <View style={styles.tarjetaPaso}>
            <View style={styles.numeroGrande}>
              <Text style={styles.numeroGrandeTexto}>{paso.orden}</Text>
            </View>
            <Text style={styles.textoPaso}>{paso.instruccion}</Text>
            <Pressable style={styles.botonVoz} onPress={alternarVoz}>
              <Ionicons name={leyendo ? 'stop-circle-outline' : 'volume-high-outline'} size={18} color={colors.primary} />
              <Text style={styles.botonVozTexto}>{leyendo ? 'Detener' : 'Leer en voz alta'}</Text>
            </Pressable>
          </View>

          {/* Cronómetro */}
          {c ? (
            <View style={[styles.tarjetaCrono, c.estado === 'listo' && { backgroundColor: colors.magic }]}>
              <Text style={styles.cronoEtiqueta}>
                {c.estado === 'listo' ? '¡Listo!' : c.estado === 'pausa' ? 'En pausa' : 'Cronómetro en marcha'}
              </Text>
              <Text style={styles.cronoTiempo}>{formato(c.estado === 'listo' ? 0 : restanteDe(c))}</Text>
              <View style={styles.cronoBotones}>
                {c.estado !== 'listo' && (
                  <Pressable style={styles.cronoBoton} onPress={pausarOReanudar}>
                    <Ionicons name={c.estado === 'corriendo' ? 'pause' : 'play'} size={18} color={colors.white} />
                    <Text style={styles.cronoBotonTexto}>{c.estado === 'corriendo' ? 'Pausar' : 'Seguir'}</Text>
                  </Pressable>
                )}
                <Pressable style={[styles.cronoBoton, styles.cronoBotonClaro]} onPress={reiniciar}>
                  <Ionicons name="refresh" size={18} color={colors.text} />
                  <Text style={[styles.cronoBotonTexto, { color: colors.text }]}>Reiniciar</Text>
                </Pressable>
              </View>
            </View>
          ) : segundosPaso > 0 ? (
            <Pressable style={styles.botonIniciar} onPress={() => iniciar(segundosPaso)}>
              <Ionicons name="timer-outline" size={22} color={colors.white} />
              <Text style={styles.botonIniciarTexto}>
                {sugerencia ? `${sugerencia.etiqueta} · ` : ''}Poner cronómetro · {formato(segundosPaso)}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
        </Animated.View>

        {/* Navegación */}
        <View style={styles.navegacion}>
          <Pressable
            style={[styles.navBoton, styles.navAtras, indice === 0 && { opacity: 0.4 }]}
            disabled={indice === 0}
            onPress={() => ir(indice - 1)}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
            <Text style={[styles.navTexto, { color: colors.text }]}>Anterior</Text>
          </Pressable>
          <Pressable
            style={[styles.navBoton, styles.navSiguiente]}
            onPress={() => (esUltimo ? terminar() : ir(indice + 1))}
          >
            <Text style={[styles.navTexto, { color: colors.white }]}>{esUltimo ? '¡Terminé!' : 'Siguiente'}</Text>
            <Ionicons name={esUltimo ? 'checkmark' : 'chevron-forward'} size={20} color={colors.white} />
          </Pressable>
        </View>
        {celebrando && <Celebracion />}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  encabezado: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  botonCerrar: {
    width: 38, height: 38, borderRadius: radius.pill, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', ...shadow.card,
  },
  etiquetaModo: { ...typography.caption, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  nombreReceta: { ...typography.h3 },

  progresoFila: { flexDirection: 'row', gap: 4, paddingHorizontal: spacing.md },
  progresoBarra: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.primaryLight },
  contador: { ...typography.bodySmall, paddingHorizontal: spacing.md, marginTop: spacing.sm },

  chipsScroll: { flexGrow: 0, marginTop: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.accent, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  chipTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },

  cuerpo: { padding: spacing.md, gap: spacing.md },
  tarjetaPaso: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card,
  },
  numeroGrande: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  numeroGrandeTexto: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.primary },
  textoPaso: { fontFamily: fonts.body, fontSize: 20, lineHeight: 30, color: colors.text },
  botonVoz: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, alignSelf: 'flex-start' },
  botonVozTexto: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary },

  botonIniciar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16,
  },
  botonIniciarTexto: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },


  tarjetaCrono: {
    backgroundColor: colors.accent, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.sm,
  },
  cronoEtiqueta: { ...typography.body, fontFamily: fonts.bodyBold },
  cronoTiempo: { fontFamily: fonts.displayBold, fontSize: 64, lineHeight: 72, color: colors.text },
  cronoBotones: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cronoBoton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.text, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  cronoBotonClaro: { backgroundColor: colors.white },
  cronoBotonTexto: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.white },

  navegacion: {
    flexDirection: 'row', gap: spacing.md, padding: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
  },
  navBoton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: radius.lg, paddingVertical: 14,
  },
  navAtras: { backgroundColor: colors.primaryLight },
  navSiguiente: { backgroundColor: colors.primary },
  navTexto: { fontFamily: fonts.bodyBold, fontSize: 16 },
});