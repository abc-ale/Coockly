// app/ruleta.tsx
// Ruleta del antojo (página 1): eliges tu vibra (o no), agitas el celular o tocas "Girar" y la rueda decide.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../constants/theme';
import { Aparecer, Presionable } from '../components/Animaciones';
import { mostrarAviso } from '../components/Aviso';
import { exito, seleccion, toque } from '../lib/vibracion';
import { VIBRAS, cargarRecetasRuleta, elegirReceta, type RecetaRuleta } from '../lib/ruleta';

// Sensor de movimiento: si el módulo nativo aún no está en tu APK, el botón "Girar" sigue funcionando.
let Sensores: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sensores = require('expo-sensors');
} catch {
  Sensores = null;
}

// Imagen de la rueda (Cloudinary), pedida en un tamaño liviano.
const URL_RUEDA = 'https://res.cloudinary.com/pjbmwoxn/image/upload/f_auto,q_auto,w_700/v1791705751/rueda_1.png';

const PASO = 360 / VIBRAS.length;
const DURACION = 4200;
const VUELTAS = 5;
const UMBRAL_AGITADO = 1.9; // en "g": reposo ≈ 1

export default function RuletaScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tam = Math.min(width - 150, 230);

  const [vibra, setVibra] = useState<number | null>(null); // null = que decida la ruleta
  const [girando, setGirando] = useState(false);
  const [sensorListo, setSensorListo] = useState(false);

  const giro = useRef(new Animated.Value(0)).current;
  const anguloActual = useRef(0);
  const girandoRef = useRef(false);
  const vibraRef = useRef<number | null>(null);
  const ultimaRecetaId = useRef<number | undefined>(undefined);
  const temporizadores = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ultimoAgitado = useRef(0);

  vibraRef.current = vibra;

  const limpiarTemporizadores = () => {
    temporizadores.current.forEach(clearTimeout);
    temporizadores.current = [];
  };

  useEffect(() => limpiarTemporizadores, []);

  // Descarga la rueda por adelantado para que aparezca de una vez.
  useEffect(() => {
    Image.prefetch(URL_RUEDA).catch(() => {});
  }, []);

  const girar = useCallback(async () => {
    if (girandoRef.current) return;
    girandoRef.current = true;
    setGirando(true);
    toque();

    let lista: RecetaRuleta[] = [];
    try {
      lista = await cargarRecetasRuleta();
    } catch {
      /* se avisa abajo */
    }
    if (lista.length === 0) {
      mostrarAviso('Aún no hay recetas para la ruleta. Revisa tu conexión.', 'info');
      girandoRef.current = false;
      setGirando(false);
      return;
    }

    const indice = vibraRef.current ?? Math.floor(Math.random() * VIBRAS.length);
    const elegida = VIBRAS[indice];
    const receta = elegirReceta(lista, elegida, ultimaRecetaId.current);
    if (!receta) {
      girandoRef.current = false;
      setGirando(false);
      return;
    }
    ultimaRecetaId.current = receta.id;

    // La rueda termina con el sector elegido justo bajo el puntero (arriba).
    const actual = anguloActual.current;
    const falta = (((360 - indice * PASO - (actual % 360)) % 360) + 360) % 360;
    const destino = actual + VUELTAS * 360 + falta;
    anguloActual.current = destino;

    // Un toquecito de vibración cada vez que pasa un sector (frena al final, como la rueda).
    limpiarTemporizadores();
    const cruces = Math.round((destino - actual) / PASO);
    for (let j = 1; j <= cruces; j++) {
      const t = 1 - Math.pow(1 - j / cruces, 1 / 3); // inversa de Easing.out(cubic)
      temporizadores.current.push(setTimeout(seleccion, t * DURACION));
    }

    Animated.timing(giro, {
      toValue: destino,
      duration: DURACION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      exito();
      temporizadores.current.push(
        setTimeout(() => {
          girandoRef.current = false;
          setGirando(false);
          router.push({ pathname: '/ruleta-resultado', params: { id: String(receta.id), vibra: elegida.id, portada: receta.portada ?? '' } });
        }, 450)
      );
    });
  }, [giro]);

  // Agitar el celular = girar. Solo mientras esta pantalla está al frente.
  useFocusEffect(
    useCallback(() => {
      const acelerometro = Sensores?.Accelerometer;
      if (!acelerometro) {
        setSensorListo(false);
        return;
      }
      let suscripcion: any = null;
      try {
        acelerometro.setUpdateInterval(100);
        suscripcion = acelerometro.addListener(({ x, y, z }: { x: number; y: number; z: number }) => {
          const fuerza = Math.sqrt(x * x + y * y + z * z);
          const ahora = Date.now();
          if (fuerza > UMBRAL_AGITADO && ahora - ultimoAgitado.current > 1500) {
            ultimoAgitado.current = ahora;
            girar();
          }
        });
        setSensorListo(true);
      } catch {
        setSensorListo(false);
      }
      return () => {
        try {
          suscripcion?.remove?.();
        } catch {}
      };
    }, [girar])
  );

  const rotar = giro.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <View style={st.pantalla}>
      {/* Cabecera fija: no se mete debajo de la hora al hacer scroll */}
      <View style={[st.cabecera, { paddingTop: insets.top + 10 }]}>
        <Presionable onPress={() => router.back()} style={st.volver} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Presionable>
        <Text style={st.titulo}>Ruleta del antojo</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={st.subtitulo}>Agita el celular y Cookly decide por ti.</Text>

        {/* Rueda */}
        <Aparecer delay={60}>
          <View style={[st.escena, { height: tam + 44 }]}>
            <View style={[st.fondoRueda, { width: tam + 24, height: tam + 24, borderRadius: (tam + 24) / 2, top: 24 }]} />
            <Animated.Image
              source={{ uri: URL_RUEDA }}
              style={{ width: tam, height: tam, marginTop: 34, transform: [{ rotate: rotar }] }}
              resizeMode="contain"
            />
            {/* Centro (no gira) */}
            <View style={[st.centro, { top: 34 + tam / 2 - 28 }]}>
              <View style={st.centroAnillo}>
                <Text style={st.centroTexto}>GIRA</Text>
              </View>
            </View>
            {/* Puntero */}
            <View style={st.puntero} pointerEvents="none">
              <View style={st.punteroTriangulo} />
              <View style={st.punteroPunto} />
            </View>
          </View>
        </Aparecer>

        {/* Vibras */}
        <View style={st.cuerpo}>
          <Text style={st.pregunta}>¿Cuál es la vibra del día?</Text>
          <View style={st.fichas}>
            {VIBRAS.map((v, i) => {
              const activa = vibra === i;
              return (
                <Pressable
                  key={v.id}
                  disabled={girando}
                  onPress={() => {
                    seleccion();
                    setVibra(activa ? null : i);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activa }}
                  style={[st.ficha, activa && st.fichaActiva]}
                >
                  <Ionicons name={v.icono} size={16} color={activa ? colors.white : colors.text} />
                  <Text style={[st.fichaTexto, activa && { color: colors.white }]}>{v.nombre}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={st.ayuda}>{vibra === null ? 'Sin elegir vibra, la ruleta decide por ti.' : 'Toca de nuevo la vibra para quitarla.'}</Text>

          {/* Pista */}
          <View style={st.pista}>
            <View style={st.pistaIcono}>
              <Ionicons name="phone-portrait-outline" size={26} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.pistaTitulo}>{sensorListo ? 'Agita tu celular' : 'Toca el botón para girar'}</Text>
              <Text style={st.pistaSub}>Vibra y gira hasta que algo rico te toque.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Botón fijo */}
      <View style={[st.pie, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Presionable escalaAlPresionar={0.97} onPress={girar} disabled={girando} style={[st.boton, girando && { opacity: 0.7 }]} accessibilityLabel="Girar la ruleta">
          <Text style={st.botonTexto}>{girando ? 'Girando…' : 'Girar la ruleta'}</Text>
          <Ionicons name="refresh" size={22} color={colors.white} />
        </Presionable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  cabecera: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 6, backgroundColor: colors.background,
  },
  volver: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.text, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  titulo: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.text },
  subtitulo: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.textMuted, paddingHorizontal: 20, marginTop: 2 },

  escena: { alignItems: 'center', marginTop: 4 },
  fondoRueda: { position: 'absolute', backgroundColor: colors.primaryLight, opacity: 0.8 },
  centro: { position: 'absolute', width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  centroAnillo: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.text,
    shadowColor: colors.text, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  centroTexto: { fontFamily: fonts.display, fontSize: 13, color: colors.white },
  puntero: { position: 'absolute', top: 4, alignItems: 'center' },
  punteroTriangulo: {
    width: 0, height: 0, borderLeftWidth: 14, borderRightWidth: 14, borderTopWidth: 38,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.primary,
  },
  punteroPunto: {
    position: 'absolute', top: 7, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white,
    borderWidth: 2, borderColor: colors.text,
  },

  cuerpo: { paddingHorizontal: 20, marginTop: 8 },
  pregunta: { fontFamily: fonts.heading, fontSize: 16, color: colors.text, marginBottom: 10 },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ficha: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingLeft: 11, paddingRight: 13, borderRadius: 19,
    backgroundColor: colors.white,
    shadowColor: colors.text, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  fichaActiva: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  fichaTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.text },
  ayuda: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 8 },

  pista: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16, padding: 12, borderRadius: 26, backgroundColor: colors.white,
    shadowColor: colors.text, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },
  pistaIcono: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  pistaTitulo: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  pistaSub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },

  pie: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(255,248,246,0.94)' },
  boton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 58, borderRadius: 29, backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  botonTexto: { fontFamily: fonts.heading, fontSize: 17, color: colors.white },
});