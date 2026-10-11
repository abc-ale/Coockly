// components/FavoritosVacio.tsx
// Pantalla de "aún no tienes favoritos": 6 fotos fijas (un plato central y cinco alrededor, cada una distinta),
// corazón que late y corazones que suben por toda la escena. Las fotos no se mueven; solo aparecen al entrar.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../constants/theme';
import { Presionable } from './Animaciones';
import ImagenReceta from './ImagenReceta';

type Props = { portadas: string[]; onExplorar: () => void };

const ND = { useNativeDriver: true } as const;

// Las fotos traen margen blanco alrededor del plato; se acercan un poco para que el plato llene el círculo.
const ZOOM = 1.28;

/** Aparece creciendo (rebote) al entrar a la pantalla. */
function usePop(retraso: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(retraso),
      Animated.spring(v, { toValue: 1, friction: 5, tension: 90, ...ND }),
    ]).start();
  }, [v, retraso]);
  return v;
}

function Platillo({
  uri, tam, estilo, retraso, borde = 5,
}: {
  uri?: string; tam: number; estilo: object; retraso: number; borde?: number;
}) {
  const pop = usePop(retraso);
  return (
    <Animated.View
      style={[
        styles.platillo,
        { width: tam, height: tam, borderRadius: tam / 2, borderWidth: borde },
        estilo,
        { transform: [{ scale: pop }] },
      ]}
    >
      <ImagenReceta uri={uri} ancho={300} tamanoIcono={tam / 3} style={{ width: '100%', height: '100%', backgroundColor: colors.white, transform: [{ scale: ZOOM }] }} />
    </Animated.View>
  );
}

/** Corazoncito que sube y se desvanece, en bucle. */
function CorazonSube({ estilo, color, tam, retraso }: { estilo: object; color: string; tam: number; retraso: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.delay(retraso),
        Animated.timing(v, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), ...ND }),
        Animated.delay(500),
      ])
    );
    bucle.start();
    return () => bucle.stop();
  }, [v, retraso]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute' },
        estilo,
        {
          opacity: v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, -26] }) },
            { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 1, 0.9] }) },
          ],
        },
      ]}
    >
      <Ionicons name="heart" size={tam} color={color} />
    </Animated.View>
  );
}

export default function FavoritosVacio({ portadas, onExplorar }: Props) {
  // Entrada del texto y del botón
  const entrada = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrada, { toValue: 1, duration: 520, delay: 450, easing: Easing.out(Easing.cubic), ...ND }).start();
  }, [entrada]);

  // Latido del corazón + onda
  const latido = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(latido, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), ...ND }),
        Animated.timing(latido, { toValue: 0, duration: 0, ...ND }),
        Animated.delay(350),
      ])
    );
    b.start();
    return () => b.stop();
  }, [latido]);

  // Las 6 fotos: la primera va al centro y las otras cinco alrededor.
  const popCentro = usePop(0);
  const p = (i: number) => (portadas.length ? portadas[i % portadas.length] : undefined);

  return (
    <View>
      <View style={styles.escena}>
        {/* Círculo rosado de fondo (quieto) */}
        <View style={styles.fondo} />

        {/* Plato central */}
        <Animated.View style={[styles.centro, { transform: [{ scale: popCentro }] }]}>
          <View style={styles.centroFoto}>
            <ImagenReceta uri={p(0)} ancho={500} style={[StyleSheet.absoluteFill as any, { backgroundColor: colors.white, transform: [{ scale: ZOOM }] }]} />
          </View>

          {/* Corazón con onda */}
          <View style={styles.corazonCaja}>
            <Animated.View
              style={[
                styles.onda,
                {
                  opacity: latido.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] }),
                  transform: [{ scale: latido.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.corazon,
                { transform: [{ scale: latido.interpolate({ inputRange: [0, 0.15, 0.3, 1], outputRange: [1, 1.18, 1, 1] }) }] },
              ]}
            >
              <Ionicons name="heart" size={22} color={colors.white} />
            </Animated.View>
          </View>
        </Animated.View>

        {/* Cinco platillos alrededor, quietos */}
        <Platillo uri={p(1)} tam={86} estilo={{ left: 4, top: 14 }} retraso={120} />
        <Platillo uri={p(2)} tam={64} estilo={{ right: 14, top: 2 }} retraso={240} borde={4} />
        <Platillo uri={p(3)} tam={96} estilo={{ right: 2, top: 196 }} retraso={360} />
        <Platillo uri={p(4)} tam={92} estilo={{ left: 10, top: 222 }} retraso={480} />
        <Platillo uri={p(5)} tam={60} estilo={{ left: '42%', top: 270 }} retraso={600} borde={4} />

        {/* Corazones repartidos por la escena */}
        <CorazonSube estilo={{ left: '36%', top: 4 }} color={colors.primary} tam={18} retraso={0} />
        <CorazonSube estilo={{ right: 4, top: 120 }} color={colors.accent} tam={15} retraso={700} />
        <CorazonSube estilo={{ left: 2, top: 130 }} color={colors.primary} tam={14} retraso={1400} />
        <CorazonSube estilo={{ right: '30%', top: 262 }} color={colors.primary} tam={16} retraso={2000} />
        <CorazonSube estilo={{ left: '24%', top: 300 }} color={colors.accent} tam={13} retraso={2600} />
        <CorazonSube estilo={{ left: '60%', top: 24 }} color={colors.accent} tam={12} retraso={3200} />
      </View>

      <Animated.View
        style={{
          opacity: entrada,
          transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        }}
      >
        <View style={styles.textos}>
          <Text style={styles.titulo}>¿Cómo se llama el hermano vegetariano de Bruce Lee?</Text>
          <Text style={styles.remate}>¡Broco Lee!</Text>
          <Text style={styles.sub}>Y tú, ¿cuándo guardas tu primer favorito? Toca el corazón en cualquier receta.</Text>
        </View>

        <View style={styles.botonFila}>
          <Presionable escalaAlPresionar={0.96} onPress={onExplorar} style={styles.boton} accessibilityLabel="Explorar recetas">
            <Text style={styles.botonTexto}>Explorar recetas</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color={colors.white} />
          </Presionable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  escena: { height: 330, marginTop: 4 },
  fondo: {
    position: 'absolute', left: '50%', marginLeft: -140, top: 10, width: 280, height: 280, borderRadius: 140,
    backgroundColor: colors.primaryLight,
  },
  centro: { position: 'absolute', left: '50%', marginLeft: -90, top: 55, width: 180, height: 180 },
  centroFoto: {
    width: 180, height: 180, borderRadius: 90, overflow: 'hidden', borderWidth: 7, borderColor: colors.white,
    backgroundColor: colors.primaryLight,
  },
  corazonCaja: { position: 'absolute', right: -4, top: 4, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  onda: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary },
  corazon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, borderWidth: 4, borderColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  platillo: {
    position: 'absolute', overflow: 'hidden', borderColor: colors.white, backgroundColor: colors.primaryLight,
    shadowColor: colors.text, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  textos: { alignItems: 'center', marginTop: 10, paddingHorizontal: spacing.sm },
  titulo: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 29, color: colors.text, textAlign: 'center' },
  remate: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.primary, textAlign: 'center', marginTop: 8 },
  sub: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  botonFila: { alignItems: 'center', marginTop: 20 },
  boton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: 250, height: 56,
    borderRadius: 28, backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  botonTexto: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
});