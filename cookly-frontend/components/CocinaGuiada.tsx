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
import ResenaFinal from './ResenaFinal';

// Pantalla siempre encendida mientras se cocina (manos mojadas, el celular no se apaga).
// Si el módulo nativo aún no está en tu APK, simplemente no hace nada.
let KeepAwake: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  KeepAwake = require('expo-keep-awake');
} catch {
  KeepAwake = null;
}

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
  /** Foto de la receta (para la pantalla de reseña del final). */
  imagen?: string | null;
  /** Reseña que el usuario ya había dejado (si existe). */
  puntuacionInicial?: number;
  comentarioInicial?: string;
  /** Se llama cuando publica su reseña al terminar. */
  onResenaPublicada?: () => void;
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

/** Separa la primera frase (título grande de la tarjeta) del resto (detalle más pequeño). */
function dividirPaso(texto: string): { titulo: string; detalle: string } {
  const limpio = (texto ?? '').trim();
  const m = limpio.match(/^(.{3,110}?[.!?:])\s+([\s\S]+)$/);
  if (m) return { titulo: m[1].trim(), detalle: m[2].trim() };
  return { titulo: limpio, detalle: '' };
}

function formato(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const dos = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${dos(m)}:${dos(r)}` : `${dos(m)}:${dos(r)}`;
}

/* ---------- Reloj con aro de progreso ---------- */
// Un aro que se va llenando y una aguja que gira mientras pasa el tiempo. Solo usa vistas (no necesita módulos nativos nuevos).
function RelojProgreso({ avance, listo = false, tamano = 58 }: { avance: number; listo?: boolean; tamano?: number }) {
  const S = tamano;
  const G = 5; // grosor del aro
  const p = listo ? 1 : Math.min(1, Math.max(0, avance));
  const grados = p * 360;
  const giroDerecha = Math.min(grados, 180) - 180;          // mitad derecha: 0°–180°
  const giroIzquierda = Math.max(grados, 180) - 180;        // mitad izquierda: 180°–360°
  const oscuro = colors.text;
  const pista = 'rgba(43,18,32,0.16)';
  const aro = { position: 'absolute' as const, width: S, height: S, borderRadius: S / 2, borderWidth: G };
  // Medio aro de un solo color (sin esquinas en diagonal): gira dentro de una ventana fija y así el corte queda recto.
  const medioAro = (giro: number) => (
    <View style={{ position: 'absolute', left: 0, top: 0, width: S, height: S, transform: [{ rotate: `${giro}deg` }] }}>
      <View style={{ position: 'absolute', left: S / 2, top: 0, width: S / 2, height: S, overflow: 'hidden' }}>
        <View style={[aro, { left: -S / 2, borderColor: oscuro }]} />
      </View>
    </View>
  );

  return (
    <View style={{ width: S, height: S }}>
      {/* Pista (aro claro) */}
      <View style={[aro, { borderColor: pista }]} />

      {/* Aro de avance: dos ventanas fijas (derecha e izquierda) */}
      <View style={{ position: 'absolute', left: S / 2, width: S / 2, height: S, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: -S / 2, width: S, height: S }}>{medioAro(giroDerecha)}</View>
      </View>
      <View style={{ position: 'absolute', left: 0, width: S / 2, height: S, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, width: S, height: S }}>{medioAro(giroIzquierda)}</View>
      </View>

      {listo ? (
        <View style={{ position: 'absolute', width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={S * 0.5} color={oscuro} />
        </View>
      ) : (
        <>
          {/* Aguja que gira con el tiempo */}
          <View style={{ position: 'absolute', width: S, height: S, transform: [{ rotate: `${grados}deg` }] }}>
            <View style={{ position: 'absolute', left: S / 2 - 1.5, top: S / 2 - S * 0.28, width: 3, height: S * 0.28, borderRadius: 2, backgroundColor: oscuro }} />
          </View>
          {/* Aguja corta fija y centro, como el ícono de reloj */}
          <View style={{ position: 'absolute', left: S / 2, top: S / 2 - 1.5, width: S * 0.17, height: 3, borderRadius: 2, backgroundColor: oscuro }} />
          <View style={{ position: 'absolute', left: S / 2 - 3.5, top: S / 2 - 3.5, width: 7, height: 7, borderRadius: 4, backgroundColor: oscuro }} />
        </>
      )}
    </View>
  );
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

export default function CocinaGuiada({ visible, onClose, nombre, pasos, recetaId, retomar, imagen, puntuacionInicial, comentarioInicial, onResenaPublicada }: Props) {
  const lista = useMemo(() => [...pasos].sort((a, b) => a.orden - b.orden), [pasos]);
  const [indice, setIndice] = useState(0);
  const [crono, setCrono] = useState<Record<number, Cronometro>>({});
  const [ahora, setAhora] = useState(Date.now());
  const [leyendo, setLeyendo] = useState(false);
  const [celebrando, setCelebrando] = useState(false);
  const [resenando, setResenando] = useState(false);
  const deslizar = useRef(new Animated.Value(1)).current;
  const direccion = useRef(1);
  // Evita sobrescribir el paso guardado antes de haberlo leído.
  const puedeGuardar = useRef(true);

  const hayCorriendo = Object.values(crono).some((c) => c.estado === 'corriendo');

  // Mantiene la pantalla encendida mientras la cocina guiada está abierta.
  useEffect(() => {
    if (!visible) return;
    try {
      Promise.resolve(KeepAwake?.activateKeepAwakeAsync?.('cocina-guiada')).catch(() => {});
    } catch {}
    return () => {
      try {
        Promise.resolve(KeepAwake?.deactivateKeepAwake?.('cocina-guiada')).catch(() => {});
      } catch {}
    };
  }, [visible]);

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
      setResenando(false);
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

  // Cada paso entra deslizando desde el lado al que vas (adelante o atrás).
  useEffect(() => {
    deslizar.setValue(0);
    Animated.timing(deslizar, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [indice, deslizar]);

  if (lista.length === 0) return null;

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
    // Tras la celebración se pide la reseña (si la receta tiene id); si no, se cierra.
    setTimeout(() => {
      setCelebrando(false);
      if (recetaId !== undefined) setResenando(true);
      else cerrar();
    }, 1800);
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

  const partes = dividirPaso(paso.instruccion);
  const siguiente = esUltimo ? null : lista[indice + 1];
  const textoSiguiente = siguiente ? dividirPaso(siguiente.instruccion).titulo.replace(/[.!?:]+$/, '') : '';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cerrar}>
      <SafeAreaView style={styles.pantalla}>
        <View style={styles.decoracion} pointerEvents="none" />

        {/* Encabezado: cerrar + nombre de la receta */}
        <View style={styles.encabezado}>
          <Pressable onPress={cerrar} style={styles.botonCerrar} hitSlop={10} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.nombreReceta} numberOfLines={1}>{nombre}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Progreso */}
        <View style={styles.progresoFila}>
          {lista.map((p, i) => (
            <View key={p.id} style={[styles.progresoBarra, i <= indice && { backgroundColor: colors.primary }]} />
          ))}
        </View>

        {/* Cronómetros de otros pasos */}
        {otrosActivos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}
            contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: 20 }}>
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
          <ScrollView contentContainerStyle={styles.cuerpo} showsVerticalScrollIndicator={false}>
            {/* Tarjeta del paso (color ciruela liso) */}
            <View style={styles.tarjetaPaso}>
              <View style={styles.pasoCabecera}>
                <View style={styles.numeroGrande}>
                  <Text style={styles.numeroGrandeTexto}>{paso.orden}</Text>
                </View>
                <Text style={styles.etiquetaPaso}>PASO {indice + 1} DE {lista.length}</Text>
              </View>

              <Text style={styles.tituloPaso}>{partes.titulo}</Text>
              {partes.detalle ? <Text style={styles.detallePaso}>{partes.detalle}</Text> : null}

              <Pressable style={styles.botonVoz} onPress={alternarVoz}>
                <Ionicons name={leyendo ? 'stop-circle-outline' : 'volume-high-outline'} size={18} color={colors.accent} />
                <Text style={styles.botonVozTexto}>{leyendo ? 'Detener' : 'Leer en voz alta'}</Text>
              </Pressable>
            </View>

            {/* Temporizador */}
            {c ? (
              <View style={[styles.tarjetaCrono, c.estado === 'listo' && { backgroundColor: colors.magic }]}>
                <Pressable onPress={reiniciar} accessibilityLabel="Reiniciar cronómetro" hitSlop={6}>
                  <RelojProgreso avance={c.total > 0 ? 1 - restanteDe(c) / c.total : 0} listo={c.estado === 'listo'} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cronoTiempo}>{formato(c.estado === 'listo' ? 0 : restanteDe(c))}</Text>
                  <Text style={styles.cronoEtiqueta}>
                    {c.estado === 'listo' ? '¡Tiempo cumplido!' : c.estado === 'pausa' ? 'Temporizador en pausa' : 'Temporizador en marcha'}
                  </Text>
                </View>
                {c.estado !== 'listo' ? (
                  <Pressable style={styles.cronoBoton} onPress={pausarOReanudar} accessibilityLabel={c.estado === 'corriendo' ? 'Pausar' : 'Seguir'}>
                    <Ionicons name={c.estado === 'corriendo' ? 'pause' : 'play'} size={20} color={colors.white} style={c.estado === 'corriendo' ? undefined : { marginLeft: 2 }} />
                  </Pressable>
                ) : (
                  <Pressable style={styles.cronoBoton} onPress={reiniciar} accessibilityLabel="Reiniciar">
                    <Ionicons name="refresh" size={20} color={colors.white} />
                  </Pressable>
                )}
              </View>
            ) : segundosPaso > 0 ? (
              <Pressable style={styles.tarjetaCrono} onPress={() => iniciar(segundosPaso)}>
                <RelojProgreso avance={0} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cronoTiempo}>{formato(segundosPaso)}</Text>
                  <Text style={styles.cronoEtiqueta}>{sugerencia ? `${sugerencia.etiqueta} · ` : ''}Toca para poner el temporizador</Text>
                </View>
                <View style={styles.cronoBoton}>
                  <Ionicons name="play" size={20} color={colors.white} style={{ marginLeft: 2 }} />
                </View>
              </Pressable>
            ) : null}

            {/* Lo que viene después */}
            {siguiente ? (
              <View style={styles.despues}>
                <View style={styles.despuesNumero}>
                  <Text style={styles.despuesNumeroTexto}>{siguiente.orden}</Text>
                </View>
                <Text style={styles.despuesTexto} numberOfLines={2}>
                  <Text style={{ fontFamily: fonts.bodyBold }}>Después: </Text>{textoSiguiente}
                </Text>
              </View>
            ) : (
              <View style={styles.despues}>
                <View style={styles.despuesNumero}>
                  <Ionicons name="checkmark" size={16} color={colors.text} />
                </View>
                <Text style={styles.despuesTexto}>
                  <Text style={{ fontFamily: fonts.bodyBold }}>Último paso. </Text>¡Ya casi está lista!
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {/* Navegación */}
        <View style={styles.navegacion}>
          <Pressable
            style={[styles.navAtras, indice === 0 && { opacity: 0.4 }]}
            disabled={indice === 0}
            onPress={() => ir(indice - 1)}
          >
            <Ionicons name="arrow-back" size={18} color={colors.text} />
            <Text style={styles.navAtrasTexto}>Anterior</Text>
          </Pressable>
          <Pressable style={styles.navSiguiente} onPress={() => (esUltimo ? terminar() : ir(indice + 1))}>
            <Text style={styles.navSiguienteTexto}>{esUltimo ? '¡Terminé!' : 'Siguiente'}</Text>
            <View style={styles.navCirculo}>
              <Ionicons name={esUltimo ? 'checkmark' : 'arrow-forward'} size={22} color={colors.primary} />
            </View>
          </Pressable>
        </View>
        {celebrando && <Celebracion />}
        {resenando && recetaId !== undefined && (
          <ResenaFinal
            recetaId={recetaId}
            nombre={nombre}
            imagen={imagen}
            puntuacionInicial={puntuacionInicial}
            comentarioInicial={comentarioInicial}
            onPublicada={onResenaPublicada}
            onCerrar={() => {
              setResenando(false);
              cerrar();
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  // Círculo suave de adorno arriba a la izquierda (el fondo del mockup).
  decoracion: { position: 'absolute', top: -90, left: -70, width: 260, height: 260, borderRadius: 130, backgroundColor: colors.primaryLight, opacity: 0.55 },
  encabezado: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  botonCerrar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', ...shadow.card,
  },
  nombreReceta: { flex: 1, textAlign: 'center', fontFamily: fonts.heading, fontSize: 16, color: colors.text, paddingHorizontal: spacing.sm },

  progresoFila: { flexDirection: 'row', gap: 6, paddingHorizontal: 20 },
  progresoBarra: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.primaryLight },

  chipsScroll: { flexGrow: 0, marginTop: spacing.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.accent, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  chipTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },

  cuerpo: { paddingHorizontal: 20, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: 14 },

  // Tarjeta ciruela, color liso (sin círculos de adorno).
  tarjetaPaso: {
    backgroundColor: colors.text, borderRadius: 34, padding: 24,
    shadowColor: colors.text, shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  pasoCabecera: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numeroGrande: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  numeroGrandeTexto: { fontFamily: fonts.displayBold, fontSize: 26, color: colors.white },
  etiquetaPaso: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.5, color: colors.accent },
  tituloPaso: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 36, color: colors.white, marginTop: 20 },
  detallePaso: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: 'rgba(255,248,246,0.72)', marginTop: 14 },
  botonVoz: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, alignSelf: 'flex-start' },
  botonVozTexto: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accent },

  // Temporizador mantequilla
  tarjetaCrono: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.accent, borderRadius: 30, padding: 14 },
  cronoTiempo: { fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 38, color: colors.text },
  cronoEtiqueta: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, color: colors.text },
  cronoBoton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },

  // "Después: ..."
  despues: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primaryLight, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 14 },
  despuesNumero: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  despuesNumeroTexto: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  despuesTexto: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text },

  navegacion: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, backgroundColor: colors.background },
  navAtras: {
    height: 62, borderRadius: 31, paddingHorizontal: 22, backgroundColor: colors.primaryLight,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  navAtrasTexto: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
  navSiguiente: {
    flex: 1, height: 62, borderRadius: 31, backgroundColor: colors.primary, paddingLeft: 28, paddingRight: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  navSiguienteTexto: { fontFamily: fonts.heading, fontSize: 18, color: colors.white },
  navCirculo: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});