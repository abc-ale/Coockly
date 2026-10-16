// app/chatbot.tsx
// Chef Cookly: conversas con tus ingredientes y te propone una receta de la app.
//  - "Tengo pollo, arroz y zanahoria"  -> busca en las recetas de Cookly y muestra una tarjeta con "Ver receta".
//  - "¿Y si quiero que sea para 8?"    -> recalcula las cantidades.
//  - Botones: "Otra receta", "Cambiar un ingrediente", "Enviar a la lista".
// El servidor del chatbot (Groq) solo entiende lo que dices; la receta y las cantidades salen de la base de datos de Cookly.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, Pressable, KeyboardAvoidingView, Platform, ScrollView, Animated, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ImagenReceta from '../components/ImagenReceta';
import { EntradaSuave } from '../components/RecipeCard';
import { toque, seleccion, exito } from '../lib/vibracion';
import { PORCIONES_BASE, limitar, textoIngrediente } from '../lib/cantidades';
import { api, despertarServidor } from '../lib/api';
import { colors, fonts } from '../constants/theme';

const URL_BASE_CHAT = 'https://cookly-backend-y19h.onrender.com';
const URL_CHAT = `${URL_BASE_CHAT}/chat`;

/** El servidor del chatbot se duerme si nadie lo usa; al abrir la pantalla lo despertamos para que el primer mensaje no espere. */
let chatDespierto = 0;
function despertarChat() {
  if (Date.now() - chatDespierto < 4 * 60 * 1000) return;
  chatDespierto = Date.now();
  fetch(URL_BASE_CHAT, { method: 'GET' }).catch(() => undefined);
}

/** Cosas que casi todos tienen en casa: no se le piden al usuario como "faltantes". */
const DESPENSA = new Set(['sal', 'pimienta', 'aceite', 'agua', 'azucar']);

type TarjetaChat = { id: number; nombre: string; minutos: number | null; pasos: number; portada: string | null };

type Mensaje = {
  id: string;
  esUsuario: boolean;
  texto?: string;
  receta?: TarjetaChat;
  /** Para enviarlo al servidor como parte de la conversación. */
  resumen?: string;
};

type Recomendacion = {
  id: number;
  nombre: string;
  porcentajeCoincidencia: number;
  ingredientesFaltantes: string[];
  minutosPreparacion: number | null;
};

type IngredienteReceta = { ingrediente: { id: number; nombre: string }; cantidad: number; unidad: string };

type Accion = {
  texto: string;
  accion: 'ninguna' | 'buscar_receta' | 'otra_receta' | 'cambiar_ingrediente' | 'porciones' | 'enviar_lista';
  ingredientes: string[];
  excluir: string[];
  porciones: number | null;
};

type Chip = { texto: string; color: string; alTocar: () => void };

/** Minúsculas, sin tildes y sin plural simple: "Zanahorias" = "zanahoria". */
function claveIng(t: string): string {
  const x = (t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return x.length > 3 && x.endsWith('s') ? x.slice(0, -1) : x;
}

/** ¿La receta usa este ingrediente que dijo el usuario? ("carne" también cuenta para "carne de res"). */
function recetaUsa(detalle: IngredienteReceta[], ing: string): boolean {
  const k = claveIng(ing);
  if (!k) return false;
  return detalle.some((d) => {
    const n = claveIng(d.ingrediente.nombre);
    return n === k || n.split(' ').some((w) => claveIng(w) === k) || k.split(' ').some((w) => claveIng(w) === n);
  });
}

/** ["a","b","c"] -> "a, b y c" */
function unir(lista: string[]): string {
  if (lista.length <= 1) return lista.join('');
  return `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
}

const SALUDO = '¡Hola! Soy tu chef. Dime qué tienes en la nevera y te armo una receta.';

/** Convierte "**Arroz con pollo**" en negrita. */
function TextoConNegrita({ texto, estilo, estiloNegrita }: { texto: string; estilo: any; estiloNegrita: any }) {
  const partes = texto.split('**');
  return (
    <Text style={estilo}>
      {partes.map((p, i) => (i % 2 === 1 ? <Text key={i} style={estiloNegrita}>{p}</Text> : p))}
    </Text>
  );
}

/** Tres puntitos que laten mientras el chef "piensa". */
function Escribiendo() {
  const v = useRef([new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]).current;
  useEffect(() => {
    const anims = v.map((x, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(x, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(x, { toValue: 0.3, duration: 320, useNativeDriver: true }),
          Animated.delay((2 - i) * 160),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [v]);
  return (
    <View style={[st.burbuja, st.burbujaBot, { flexDirection: 'row', gap: 6, paddingVertical: 16 }]}>
      {v.map((x, i) => (
        <Animated.View key={i} style={[st.punto, { opacity: x }]} />
      ))}
    </View>
  );
}

// ---- Entender lo que escribe el usuario ----

const RE_OTRA = /\b(otra( receta| opci[oó]n)?|algo (distinto|diferente)|no me gusta)\b/i;
const RE_LISTA = /\b(env[ií]a|manda|pasa|agrega|a[ñn]ade|guarda)\b.*\blista\b|\blista (de compras?|del s[uú]per)\b/i;
const RE_PORCIONES = /(?:para|x|por)\s*(\d{1,3})(?:\s*(?:personas?|porciones|comensales|pax))?/i;

/** Plan B si el servidor del chatbot no responde: saca ingredientes de frases como "tengo pollo, arroz y zanahoria". */
function ingredientesDe(texto: string): string[] {
  const m = texto.toLowerCase().match(/(?:tengo|hay|con|usar)\s+(.+)/);
  if (!m) return [];
  return m[1]
    .replace(/[.!?¿¡]/g, '')
    .split(/,|\sy\s|\se\s/)
    .map((s) => s.replace(/^(un|una|unos|unas|el|la|los|las|de|algo de)\s+/, '').trim())
    .filter((s) => s.length > 1 && s.split(' ').length <= 3)
    .map((s) => (s.endsWith('s') && s.length > 4 ? s.slice(0, -1) : s));
}

async function preguntarAlServidor(historial: Mensaje[], contexto: any): Promise<Accion | null> {
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), 15000);
  try {
    const r = await fetch(URL_CHAT, {
      method: 'POST',
      signal: corte.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensajes: historial.slice(-8).map((m) => ({ esUsuario: m.esUsuario, texto: m.resumen ?? m.texto ?? '' })),
        contexto,
      }),
    });
    const d = await r.json();
    if (typeof d?.texto !== 'string' && !d?.accion) return null;
    return {
      texto: d.texto ?? '',
      accion: d.accion ?? 'ninguna',
      ingredientes: Array.isArray(d.ingredientes) ? d.ingredientes : [],
      excluir: Array.isArray(d.excluir) ? d.excluir : [],
      porciones: typeof d.porciones === 'number' ? d.porciones : null,
    };
  } catch (e) {
    console.log('ERROR AL LLAMAR AL CHATBOT:', e);
    return null;
  } finally {
    clearTimeout(reloj);
  }
}

export default function ChatbotScreen() {
  const insets = useSafeAreaInsets();
  const [mensajes, setMensajes] = useState<Mensaje[]>([{ id: '0', esUsuario: false, texto: SALUDO }]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [modoVoz, setModoVoz] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [chips, setChips] = useState<Chip[]>([]);

  const lista = useRef<FlatList<Mensaje>>(null);
  const textoReconocidoRef = useRef('');
  const modoVozRef = useRef(false);
  const mensajesRef = useRef<Mensaje[]>(mensajes);
  mensajesRef.current = mensajes;

  // Lo que el chef recuerda de la conversación.
  const ctx = useRef({
    ingredientes: [] as string[],
    resultados: [] as Recomendacion[],
    mostradas: new Set<number>(),
    receta: null as null | { id: number; nombre: string; detalle: IngredienteReceta[]; minutos: number | null; pasos: number },
    personas: PORCIONES_BASE,
  }).current;

  const bajar = useCallback(() => {
    setTimeout(() => lista.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const agregar = useCallback(
    (m: Omit<Mensaje, 'id'>) => {
      setMensajes((prev) => [...prev, { ...m, id: `${Date.now()}-${prev.length}` }]);
      bajar();
    },
    [bajar]
  );

  // ---- Voz (igual que antes) ----
  useSpeechRecognitionEvent('start', () => setEscuchando(true));
  useSpeechRecognitionEvent('result', (event) => {
    const resultado = event.results[0]?.transcript;
    if (resultado) {
      textoReconocidoRef.current = resultado;
      setTexto(resultado);
    }
  });
  useSpeechRecognitionEvent('end', () => {
    setEscuchando(false);
    const dicho = textoReconocidoRef.current.trim();
    textoReconocidoRef.current = '';
    if (modoVozRef.current && dicho !== '') enviar(dicho, true);
  });
  useSpeechRecognitionEvent('error', (event) => {
    console.log('ERROR DE RECONOCIMIENTO DE VOZ:', event.error, event.message);
    setEscuchando(false);
  });

  const iniciarEscucha = async () => {
    const permiso = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Cookly necesita acceso al micrófono para escucharte.');
      return;
    }
    ExpoSpeechRecognitionModule.start({ lang: 'es-PE', interimResults: true, continuous: false });
  };
  const activarModoVoz = async () => {
    modoVozRef.current = true;
    setModoVoz(true);
    await iniciarEscucha();
  };
  const desactivarModoVoz = () => {
    modoVozRef.current = false;
    setModoVoz(false);
    ExpoSpeechRecognitionModule.stop();
    Speech.stop();
    setEscuchando(false);
    setHablando(false);
  };
  const manejarToqueMicrofono = () => {
    toque();
    if (hablando) {
      Speech.stop();
      setHablando(false);
      iniciarEscucha();
    } else if (modoVoz) desactivarModoVoz();
    else activarModoVoz();
  };

  // ---- Lo que hace el chef ----

  /** Dice algo (y lo lee en voz alta si el modo voz está activo). */
  const decir = useCallback(
    (t: string, extra: Partial<Mensaje> = {}, leer = false) => {
      agregar({ esUsuario: false, texto: t, ...extra });
      if (leer && modoVozRef.current) {
        setHablando(true);
        Speech.speak(t.replace(/\*\*/g, ''), {
          language: 'es-PE', pitch: 1.05, rate: 0.92,
          onDone: () => {
            setHablando(false);
            if (modoVozRef.current) iniciarEscucha();
          },
          onStopped: () => setHablando(false),
        });
      }
    },
    [agregar]
  );

  /** Botones que aparecen debajo, según en qué punto va la conversación. */
  const chipsDeReceta = (): Chip[] => [
    { texto: 'Otra receta', color: colors.magic, alTocar: () => enviar('Otra receta', false, true) },
    { texto: 'Cambiar un ingrediente', color: colors.accent, alTocar: () => cambiarIngredienteChip() },
    { texto: 'Enviar a la lista', color: colors.primaryLight, alTocar: () => enviar('Envía los ingredientes a mi lista', false, true) },
  ];

  const proponer = useCallback(
    async (porVoz: boolean) => {
      if (ctx.ingredientes.length === 0) {
        decir('Cuéntame qué ingredientes tienes y te busco una receta.', {}, porVoz);
        return;
      }
      try {
        const { data } = await api.post('/recetas/menu-express', { ingredientes: Array.from(new Set(ctx.ingredientes.map((i) => i.trim().toLowerCase()).filter(Boolean))) });
        const todas: Recomendacion[] = data?.recetas ?? [];
        ctx.resultados = todas;
        const candidatas = todas.filter((r) => !ctx.mostradas.has(r.id));
        if (candidatas.length === 0) {
          decir(
            todas.length === 0
              ? 'Con eso no encontré una receta en Cookly. Cuéntame qué otros ingredientes tienes y lo intento de nuevo.'
              : 'Ya te mostré todas las opciones que encontré con esos ingredientes. Dime si tienes algo más y busco otra.',
            {},
            porVoz
          );
          setChips(ctx.receta ? chipsDeReceta() : chipsIniciales());
          return;
        }

        // Se miran las mejores candidatas y se elige la que de verdad usa lo que el usuario tiene.
        const quiere = Array.from(new Set(ctx.ingredientes.map((i) => i.trim().toLowerCase()).filter(Boolean)));
        const revisadas = await Promise.all(
          candidatas.slice(0, 4).map(async (r) => {
            try {
              const { data: det } = await api.get(`/recetas/${r.id}`);
              const usados = quiere.filter((q) => recetaUsa(det.detallesIngredientes ?? [], q));
              return { r, det, usados };
            } catch {
              return null;
            }
          })
        );
        const validas = revisadas
          .filter((x): x is NonNullable<typeof x> => !!x && x.usados.length > 0)
          .sort((p, q) => q.usados.length - p.usados.length || q.r.porcentajeCoincidencia - p.r.porcentajeCoincidencia);

        if (validas.length === 0) {
          decir(`No encontré una receta en Cookly que use ${unir(quiere)}. Cuéntame qué otros ingredientes tienes y lo intento de nuevo.`, {}, porVoz);
          setChips(ctx.receta ? chipsDeReceta() : chipsIniciales());
          return;
        }

        const elegida = validas[0];
        const siguiente = elegida.r;
        const det = elegida.det;
        ctx.mostradas.add(siguiente.id);

        const resImg = await api.get(`/imagenes/receta/${siguiente.id}`).catch(() => ({ data: [] as any[] }));
        const minutos: number | null = det.minutosPreparacion ?? siguiente.minutosPreparacion ?? null;
        ctx.receta = { id: det.id, nombre: det.nombre, detalle: det.detallesIngredientes ?? [], minutos, pasos: det.pasos?.length ?? 0 };
        ctx.personas = PORCIONES_BASE;

        // El mensaje dice la verdad: qué de lo que tienes se usa, qué no, y qué te falta.
        const falta = (siguiente.ingredientesFaltantes ?? []).filter((f) => !DESPENSA.has(claveIng(f)));
        const noUsa = quiere.filter((q) => !elegida.usados.includes(q));
        // Si la receta usa todo lo que dijo el usuario, es una buena propuesta aunque falten otros ingredientes.
        const encaja = noUsa.length === 0;
        const cuando = minutos ? `, lista en ${minutos} minutos` : '';
        let frase: string;
        if (encaja && falta.length === 0) {
          frase = `¡Perfecto! Con lo que tienes puedes preparar **${det.nombre}**${cuando}.`;
        } else if (encaja) {
          frase = `Con ${unir(elegida.usados)} puedes preparar **${det.nombre}**${cuando}. ${falta.length <= 2 ? 'Solo te faltaría' : 'Para completarla te faltarían'}: ${unir(falta.slice(0, 5))}.`;
        } else {
          frase =
            `No encontré una receta que use todo lo que tienes. La más cercana es **${det.nombre}**${cuando}: usa ${unir(elegida.usados)}, pero no ${unir(noUsa)}` +
            `${falta.length ? `, y te faltarían: ${unir(falta.slice(0, 5))}` : ''}. ¿Te sirve, o buscamos otra?`;
        }
        decir(frase, { resumen: `Te propongo ${det.nombre}${cuando}.` }, porVoz);
        agregar({
          esUsuario: false,
          resumen: `[tarjeta de ${det.nombre}]`,
          receta: {
            id: det.id,
            nombre: det.nombre,
            minutos,
            pasos: det.pasos?.length ?? 0,
            portada: resImg.data?.[0]?.url ?? null,
          },
        });
        setChips(chipsDeReceta());
      } catch (e: any) {
        decir('No pude buscar recetas ahora mismo. Revisa tu conexión e inténtalo de nuevo.', {}, porVoz);
      }
    },
    [agregar, decir]
  );

  const ajustarPorciones = useCallback(
    (n: number, porVoz: boolean) => {
      if (!ctx.receta) {
        decir('Primero dime qué tienes y te propongo una receta; luego la ajusto para las personas que quieras.', {}, porVoz);
        return;
      }
      const personas = limitar(n);
      ctx.personas = personas;
      const lineas = ctx.receta.detalle.map(
        (i) => `• ${textoIngrediente(i.cantidad, i.unidad, i.ingrediente.nombre, personas, 'original')}`
      );
      decir(`Claro, ajusto las cantidades para ${personas} ${personas === 1 ? 'persona' : 'personas'}.`, {}, porVoz);
      if (lineas.length > 0) agregar({ esUsuario: false, texto: lineas.join('\n'), resumen: `Cantidades para ${personas} personas.` });
      setChips(chipsDeReceta());
    },
    [agregar, decir]
  );

  const enviarALaLista = useCallback(
    async (porVoz: boolean) => {
      const r = ctx.receta;
      if (!r) {
        decir('Primero elige una receta y luego envío sus ingredientes a tu lista.', {}, porVoz);
        return;
      }
      try {
        const { data: lista } = await api.post('/listas-compra', { nombre: `${r.nombre} (${ctx.personas} personas)`.slice(0, 80) });
        for (const i of r.detalle) {
          const e = ctx.personas / PORCIONES_BASE;
          await api.post(`/listas-compra/${lista.id}/elementos`, {
            ingredienteId: i.ingrediente.id,
            cantidad: Math.round(i.cantidad * e * 100) / 100,
            unidad: i.unidad,
          });
        }
        exito();
        decir(`¡Listo! Envié los ingredientes de **${r.nombre}** para ${ctx.personas} personas a tu lista de compras.`, {}, porVoz);
        setChips([
          { texto: 'Ver mi lista', color: colors.magic, alTocar: () => router.push(`/lista-compra/${lista.id}`) },
          { texto: 'Otra receta', color: colors.accent, alTocar: () => enviar('Otra receta', false, true) },
        ]);
      } catch {
        decir('No pude enviar los ingredientes a tu lista. Inténtalo de nuevo en un momento.', {}, porVoz);
      }
    },
    [decir]
  );

  const cambiarIngredienteChip = () => {
    seleccion();
    agregar({ esUsuario: true, texto: 'Cambiar un ingrediente' });
    decir('Claro. Dime cuál no tienes y qué tienes en su lugar. Por ejemplo: "no tengo zanahoria, tengo papa".');
    setChips(chipsDeReceta());
  };

  /** Procesa lo que dijo el usuario. `yaMostrado`: el mensaje del usuario ya está en pantalla (botones). */
  async function enviar(contenido: string, esPorVoz = false, yaMostrado = false) {
    const limpio = contenido.trim();
    if (!limpio || cargando) return;

    if (!yaMostrado) agregar({ esUsuario: true, texto: limpio });
    setTexto('');
    setChips([]);
    setCargando(true);

    try {
      // 1) Casos claros, sin esperar al servidor del chatbot.
      if (RE_LISTA.test(limpio)) return await enviarALaLista(esPorVoz);
      if (RE_OTRA.test(limpio) && ctx.receta) return await proponer(esPorVoz);
      const pers = limpio.match(RE_PORCIONES);
      if (pers && ctx.receta) return ajustarPorciones(Number(pers[1]), esPorVoz);

      // 1b) "Tengo pollo y arroz": se entiende aquí mismo, sin esperar a la IA (más rápido y sin confundirse).
      if (/^\s*(hola,?\s*)?(solo\s+)?(tengo|me quedan|me sobran|hay)\b/i.test(limpio)) {
        const ing = ingredientesDe(limpio);
        if (ing.length > 0) {
          ctx.ingredientes = ing;
          ctx.mostradas.clear();
          return await proponer(esPorVoz);
        }
      }

      // 2) El chatbot entiende el resto (ingredientes, cambios, charla).
      const historial = [...mensajesRef.current, { id: 'u', esUsuario: true, texto: limpio }];
      const a = await preguntarAlServidor(historial, {
        receta: ctx.receta?.nombre ?? null,
        personas: ctx.receta ? ctx.personas : null,
        ingredientes: ctx.ingredientes,
        // Datos reales de la receta que se está viendo, para que el chef responda "¿cuánto tarda?" o "¿qué lleva?" sin inventar.
        detalle: ctx.receta
          ? {
              minutos: ctx.receta.minutos,
              pasos: ctx.receta.pasos,
              ingredientes: ctx.receta.detalle.map((d) => d.ingrediente.nombre).slice(0, 25),
            }
          : null,
      });

      if (!a) {
        // Plan B: sin servidor de IA, igual se puede buscar si dijo "tengo ...".
        const ing = ingredientesDe(limpio);
        if (ing.length > 0) {
          ctx.ingredientes = ing;
          ctx.mostradas.clear();
          return await proponer(esPorVoz);
        }
        decir('Ahora mismo no puedo pensar muy bien. Dime tus ingredientes así: "tengo pollo, arroz y zanahoria" y te busco una receta.', {}, esPorVoz);
        return;
      }

      // Si el modelo se equivocó y dejó una frase tipo "tengo pollo y arroz" como charla, igual se busca la receta.
      if (a.accion === 'ninguna' && /\btengo\b/i.test(limpio)) {
        const ing = ingredientesDe(limpio);
        if (ing.length > 0) {
          ctx.ingredientes = ing;
          ctx.mostradas.clear();
          return await proponer(esPorVoz);
        }
      }

      switch (a.accion) {
        case 'buscar_receta':
          ctx.ingredientes = a.ingredientes.length ? a.ingredientes : ctx.ingredientes;
          ctx.mostradas.clear();
          return await proponer(esPorVoz);
        case 'otra_receta':
          return await proponer(esPorVoz);
        case 'cambiar_ingrediente': {
          const fuera = new Set(a.excluir);
          ctx.ingredientes = [...ctx.ingredientes.filter((i) => !fuera.has(i)), ...a.ingredientes.filter((i) => !ctx.ingredientes.includes(i))];
          return await proponer(esPorVoz);
        }
        case 'porciones':
          if (a.porciones) return ajustarPorciones(a.porciones, esPorVoz);
          decir('¿Para cuántas personas la quieres?', {}, esPorVoz);
          return;
        case 'enviar_lista':
          return await enviarALaLista(esPorVoz);
        default:
          decir(a.texto || 'Cuéntame qué ingredientes tienes y te armo una receta.', {}, esPorVoz);
          if (ctx.receta) setChips(chipsDeReceta());
          else setChips(chipsIniciales());
      }
    } finally {
      setCargando(false);
      // Los botones nunca se quedan sin aparecer: si ninguna rama puso otros, vuelven los que tocan.
      setChips((prev) => (prev.length > 0 ? prev : ctx.receta ? chipsDeReceta() : chipsIniciales()));
    }
  }

  const chipsIniciales = (): Chip[] => [
    { texto: 'Tengo pollo y arroz', color: colors.magic, alTocar: () => enviar('Tengo pollo y arroz') },
    { texto: 'Algo rápido', color: colors.accent, alTocar: () => enviar('Quiero algo rápido para cocinar hoy') },
    { texto: 'Un postre', color: colors.primaryLight, alTocar: () => enviar('Quiero un postre') },
  ];

  useEffect(() => {
    despertarChat();
    despertarServidor();
    setChips(chipsIniciales());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estado = escuchando ? 'Escuchando...' : hablando ? 'Hablando...' : cargando ? 'Pensando...' : modoVoz ? 'Modo voz activo' : 'En línea';

  const verReceta = (r: TarjetaChat) => {
    toque();
    router.push({
      pathname: '/receta/[id]',
      params: { id: String(r.id), nombre: r.nombre, portada: r.portada ?? '', minutos: r.minutos ? String(r.minutos) : '' },
    });
  };

  return (
    <KeyboardAvoidingView style={st.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Cabecera rosadita con esquinas redondeadas abajo */}
      <View style={[st.cabecera, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => { toque(); router.back(); }} style={st.atras} hitSlop={8} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={st.avatar}>
          <Ionicons name="restaurant" size={22} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.nombre}>Chef Cookly</Text>
          <View style={st.estadoFila}>
            <View style={st.estadoPunto} />
            <Text style={st.estadoTexto}>{estado}</Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={lista}
        data={mensajes}
        keyExtractor={(m) => m.id}
        contentContainerStyle={st.lista}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={bajar}
        renderItem={({ item }) => (
          <EntradaSuave distancia={8} style={item.receta ? { alignSelf: 'flex-start', width: '88%' } : { alignSelf: item.esUsuario ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
            {item.receta ? (
              <View style={st.tarjetaReceta}>
                <ImagenReceta uri={item.receta.portada} ancho={240} tamanoIcono={26} style={st.tarjetaFoto} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.tarjetaNombre} numberOfLines={2}>{item.receta.nombre}</Text>
                  <Text style={st.tarjetaMeta}>
                    {[item.receta.minutos ? `${item.receta.minutos} min` : null, item.receta.pasos ? `${item.receta.pasos} pasos` : null].filter(Boolean).join(' · ')}
                  </Text>
                  <Pressable onPress={() => verReceta(item.receta!)} style={({ pressed }) => [st.verReceta, pressed && { opacity: 0.85 }]}>
                    <Text style={st.verRecetaTexto}>Ver receta</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={[st.burbuja, item.esUsuario ? st.burbujaUsuario : st.burbujaBot]}>
                <TextoConNegrita
                  texto={item.texto ?? ''}
                  estilo={item.esUsuario ? st.textoUsuario : st.textoBot}
                  estiloNegrita={{ fontFamily: fonts.bodyBold }}
                />
              </View>
            )}
          </EntradaSuave>
        )}
        ListFooterComponent={cargando ? <Escribiendo /> : null}
      />

      {chips.length > 0 && !cargando ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={st.chips}>
          {chips.map((c) => (
            <Pressable
              key={c.texto}
              onPress={() => { seleccion(); c.alTocar(); }}
              style={({ pressed }) => [st.chip, { backgroundColor: c.color }, pressed && { opacity: 0.85 }]}
            >
              <Text style={st.chipTexto} numberOfLines={1}>{c.texto}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={[st.barra, { paddingBottom: insets.bottom + 12 }]}>
        <View style={st.entrada}>
          <Pressable onPress={manejarToqueMicrofono} style={[st.micro, (escuchando || modoVoz) && st.microActivo]} hitSlop={6} accessibilityLabel="Hablar">
            <Ionicons name={modoVoz ? 'mic' : 'mic-outline'} size={20} color={escuchando || modoVoz ? colors.white : colors.primary} />
          </Pressable>
          <TextInput
            style={st.input}
            placeholder={escuchando ? 'Escuchando...' : 'Escribe tu mensaje...'}
            placeholderTextColor={colors.textMuted}
            value={texto}
            onChangeText={setTexto}
            editable={!modoVoz}
            onSubmitEditing={() => enviar(texto)}
            returnKeyType="send"
          />
          <Pressable onPress={() => { toque(); enviar(texto); }} style={st.enviar} accessibilityLabel="Enviar">
            <Ionicons name="paper-plane" size={18} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  cabecera: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 22,
    backgroundColor: colors.primaryLight, borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  atras: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  nombre: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  estadoFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  estadoPunto: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E8B57' },
  estadoTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#2E8B57' },

  lista: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, gap: 12 },
  burbuja: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 24 },
  burbujaBot: { backgroundColor: colors.primaryLight, borderBottomLeftRadius: 8, alignSelf: 'flex-start' },
  burbujaUsuario: {
    backgroundColor: colors.primary, borderBottomRightRadius: 8,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  textoBot: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  textoUsuario: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 22, color: colors.white },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },

  tarjetaReceta: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFE9A8', borderRadius: 24, padding: 12 },
  tarjetaFoto: { width: 68, height: 68, borderRadius: 16 },
  tarjetaNombre: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
  tarjetaMeta: { fontFamily: fonts.body, fontSize: 13, color: '#6B5360', marginTop: 1 },
  verReceta: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginTop: 8 },
  verRecetaTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.white },

  chips: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 16, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  chipTexto: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: colors.text, includeFontPadding: false },

  barra: { paddingHorizontal: 16, paddingTop: 6 },
  entrada: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: 999,
    paddingLeft: 8, paddingRight: 6, paddingVertical: 6, borderWidth: 1, borderColor: colors.primaryLight,
    shadowColor: colors.text, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  micro: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  microActivo: { backgroundColor: colors.primary },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text, paddingVertical: 8 },
  enviar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
});