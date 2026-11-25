// app/ruleta-resultado.tsx
// Ruleta del antojo (página 2): "¡Te tocó!" con la receta sorpresa, "Ver receta" y "Girar otra vez".
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../constants/theme';
import { api } from '../lib/api';
import { Aparecer, Presionable, Rebote } from '../components/Animaciones';
import ImagenReceta from '../components/ImagenReceta';
import { buscarVibra, type RecetaRuleta } from '../lib/ruleta';
import { exito } from '../lib/vibracion';
import { obtenerPortada } from '../lib/portada';

// Confeti fijo (aparece con un saltito): [izquierda %, arriba, color, ancho, alto, giro]
const CONFETI: [number, number, string, number, number, number][] = [
  [8, 128, colors.accent, 14, 6, 20], [18, 176, colors.primary, 10, 10, 0], [84, 138, colors.magic, 14, 6, -30],
  [92, 196, colors.primary, 8, 8, 0], [28, 104, colors.magic, 10, 10, 0], [72, 100, colors.accent, 12, 6, 40],
  [6, 236, colors.primary, 12, 6, -20], [93, 256, colors.accent, 10, 10, 0], [15, 84, colors.primary, 8, 8, 0],
  [80, 74, colors.primary, 10, 6, 15],
];

export default function RuletaResultadoScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id, vibra: vibraId, portada: portadaParam } = useLocalSearchParams<{ id?: string; vibra?: string; portada?: string }>();
  const vibra = buscarVibra(vibraId);

  const [receta, setReceta] = useState<RecetaRuleta | null>(null);
  const [fallo, setFallo] = useState(false);
  const [portada, setPortada] = useState<string | null>(portadaParam || null);

  useEffect(() => {
    let vivo = true;
    api
      .get(`/recetas/${id}`)
      .then((r) => {
        if (!vivo) return;
        setReceta(r.data as RecetaRuleta);
        exito();
        // /recetas/{id} no trae la foto: si no llegó por parámetro, se pide aparte.
        if (!portadaParam) {
          obtenerPortada(r.data.id, r.data.nombre).then((u) => vivo && u && setPortada(u));
        }
      })
      .catch(() => vivo && setFallo(true));
    return () => {
      vivo = false;
    };
  }, [id]);

  const ingredientes = receta?.detallesIngredientes?.length ?? 0;

  return (
    <View style={st.pantalla}>
      {CONFETI.map(([x, y, color, w, h, giro], i) => (
        <Rebote key={i} delay={120 + i * 50} style={{ position: 'absolute', left: (width * x) / 100, top: y }}>
          <View style={{ width: w, height: h, borderRadius: w === h ? w / 2 : 3, backgroundColor: color, transform: [{ rotate: `${giro}deg` }] }} />
        </Rebote>
      ))}

      <View style={[st.cabecera, { paddingTop: insets.top + 14 }]}>
        <Presionable onPress={() => router.back()} style={st.volver} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Presionable>
        <Text style={st.titulo}>Ruleta del antojo</Text>
      </View>

      <View style={st.encabezado}>
        {vibra && (
          <Rebote>
            <View style={st.pildora}>
              <Ionicons name={vibra.icono} size={17} color={colors.white} />
              <Text style={st.pildoraTexto}>{vibra.nombre}</Text>
            </View>
          </Rebote>
        )}
        <Text style={st.teToco}>¡Te tocó!</Text>
        <Text style={st.frase}>{vibra?.frase ?? 'Sin pensar, sin dudar: a cocinar.'}</Text>
      </View>

      <View style={st.centroCaja}>
        {receta ? (
          <Aparecer delay={150}>
            <View style={st.tarjeta}>
              <ImagenReceta uri={portada} ancho={800} tamanoIcono={44} style={st.foto} />
              <View style={st.tarjetaTexto}>
                <Text style={st.nombre} numberOfLines={2}>{receta.nombre}</Text>
                <View style={st.datos}>
                  {!!receta.minutosPreparacion && (
                    <View style={[st.dato, { backgroundColor: colors.accent }]}>
                      <Ionicons name="time-outline" size={15} color={colors.text} />
                      <Text style={st.datoTexto}>{receta.minutosPreparacion} min</Text>
                    </View>
                  )}
                  {ingredientes > 0 && (
                    <View style={[st.dato, { backgroundColor: colors.magic }]}>
                      <Text style={st.datoTexto}>{ingredientes} ingredientes</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </Aparecer>
        ) : fallo ? (
          <Text style={st.error}>No pudimos cargar la receta. Gira otra vez.</Text>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>

      <View style={[st.pie, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Presionable
          escalaAlPresionar={0.97}
          onPress={() => receta && router.replace(`/receta/${receta.id}`)}
          disabled={!receta}
          style={[st.botonPrincipal, !receta && { opacity: 0.6 }]}
          accessibilityLabel="Ver receta"
        >
          <Text style={st.botonPrincipalTexto}>Ver receta</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </Presionable>
        <Presionable escalaAlPresionar={0.97} onPress={() => router.back()} style={st.botonSecundario} accessibilityLabel="Girar otra vez">
          <Ionicons name="refresh" size={20} color={colors.primary} />
          <Text style={st.botonSecundarioTexto}>Girar otra vez</Text>
        </Presionable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  volver: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.text, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  titulo: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.text },

  encabezado: { alignItems: 'center', marginTop: 22, paddingHorizontal: 20 },
  pildora: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingLeft: 11, paddingRight: 15, borderRadius: 17, backgroundColor: colors.primary },
  pildoraTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.white },
  teToco: { fontFamily: fonts.display, fontSize: 38, lineHeight: 46, color: colors.text, marginTop: 8 },
  frase: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.textMuted, textAlign: 'center' },

  centroCaja: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  tarjeta: {
    backgroundColor: colors.white, borderRadius: 34, padding: 12,
    shadowColor: colors.text, shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8,
  },
  foto: { height: 200, borderRadius: 26 },
  tarjetaTexto: { paddingHorizontal: 6, paddingTop: 14, paddingBottom: 6 },
  nombre: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.text },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 12, borderRadius: 16 },
  datoTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.text },
  error: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center' },

  pie: { paddingHorizontal: 20, gap: 12 },
  botonPrincipal: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 58, borderRadius: 29, backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  botonPrincipalTexto: { fontFamily: fonts.heading, fontSize: 17, color: colors.white },
  botonSecundario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 54, borderRadius: 27,
    backgroundColor: colors.white, borderWidth: 2, borderColor: colors.primaryLight,
  },
  botonSecundarioTexto: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
});