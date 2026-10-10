// components/CocinaGuiada.tsx
// Modo "Cocina guiada": un paso a la vez, con cronómetro para los pasos
// que llevan tiempo (hervir, sancochar, hornear, reposar...).
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, Pressable, ScrollView, StyleSheet, Vibration, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { colors, fonts, radius, spacing, typography, shadow } from '../constants/theme';

export type PasoGuia = { id: number; orden: number; instruccion: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  nombre: string;
  pasos: PasoGuia[];
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

export default function CocinaGuiada({ visible, onClose, nombre, pasos }: Props) {
  const lista = useMemo(() => [...pasos].sort((a, b) => a.orden - b.orden), [pasos]);
  const [indice, setIndice] = useState(0);
  const [crono, setCrono] = useState<Record<number, Cronometro>>({});
  const [ajuste, setAjuste] = useState<Record<number, number>>({}); // minutos elegidos si no hay tiempo en el texto
  const [ahora, setAhora] = useState(Date.now());
  const [leyendo, setLeyendo] = useState(false);

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
    const ordenes = terminados
      .map(([k]) => lista.find((p) => p.id === Number(k))?.orden)
      .filter(Boolean)
      .join(', ');
    Alert.alert('¡Tiempo cumplido!', `Terminó el cronómetro del paso ${ordenes}.`);
  }, [ahora, crono, lista]);

  // Al abrir, vuelve al primer paso
  useEffect(() => {
    if (visible) setIndice(0);
    else {
      Speech.stop();
      setLeyendo(false);
    }
  }, [visible]);

  if (lista.length === 0) return null;

  const paso = lista[indice];
  const esUltimo = indice === lista.length - 1;
  const segundosTexto = tiempoDelTexto(paso.instruccion);
  const sugerencia = segundosTexto === 0 ? sugerenciaSinTiempo(paso.instruccion) : null;
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

  function ir(nuevo: number) {
    Speech.stop();
    setLeyendo(false);
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
  const minutosAjuste = ajuste[paso.id] ?? sugerencia?.minutos ?? 10;

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
          ) : segundosTexto > 0 ? (
            <Pressable style={styles.botonIniciar} onPress={() => iniciar(segundosTexto)}>
              <Ionicons name="timer-outline" size={22} color={colors.white} />
              <Text style={styles.botonIniciarTexto}>Poner cronómetro · {formato(segundosTexto)}</Text>
            </Pressable>
          ) : sugerencia ? (
            <View style={styles.tarjetaAjuste}>
              <Text style={styles.ajusteTitulo}>{sugerencia.etiqueta}: ¿cuántos minutos?</Text>
              <View style={styles.ajusteFila}>
                <Pressable style={styles.ajusteBoton}
                  onPress={() => setAjuste((p) => ({ ...p, [paso.id]: Math.max(1, minutosAjuste - 1) }))}>
                  <Ionicons name="remove" size={20} color={colors.text} />
                </Pressable>
                <Text style={styles.ajusteValor}>{minutosAjuste} min</Text>
                <Pressable style={styles.ajusteBoton}
                  onPress={() => setAjuste((p) => ({ ...p, [paso.id]: minutosAjuste + 1 }))}>
                  <Ionicons name="add" size={20} color={colors.text} />
                </Pressable>
              </View>
              <Pressable style={styles.botonIniciar} onPress={() => iniciar(minutosAjuste * 60)}>
                <Ionicons name="timer-outline" size={22} color={colors.white} />
                <Text style={styles.botonIniciarTexto}>Poner cronómetro</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

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
            onPress={() => (esUltimo ? cerrar() : ir(indice + 1))}
          >
            <Text style={[styles.navTexto, { color: colors.white }]}>{esUltimo ? '¡Terminé!' : 'Siguiente'}</Text>
            <Ionicons name={esUltimo ? 'checkmark' : 'chevron-forward'} size={20} color={colors.white} />
          </Pressable>
        </View>
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

  tarjetaAjuste: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, ...shadow.card,
  },
  ajusteTitulo: { ...typography.body, fontFamily: fonts.bodyBold, textAlign: 'center' },
  ajusteFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  ajusteBoton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  ajusteValor: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.text, minWidth: 100, textAlign: 'center' },

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