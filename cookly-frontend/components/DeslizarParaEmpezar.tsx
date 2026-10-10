// components/DeslizarParaEmpezar.tsx
// Botón "desliza para empezar": se arrastra el círculo blanco hacia la derecha y, al llegar
// casi al final, se ejecuta onCompletar. Si se suelta antes, regresa con un rebote.
// Mientras se arrastra, el fondo recorre la paleta de Cookly: rosado → mantequilla → pistacho.
// Mientras nadie lo toca, el círculo hace un pequeño gesto hacia la derecha para enseñar qué hacer.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, Text, View, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../constants/theme';
import { exito, seleccion, toque } from '../lib/vibracion';

const ALTO = 62;
const PERILLA = 46;
const MARGEN = 8;

type Props = {
  texto?: string;
  onCompletar: () => void;
  onArrastrando?: (arrastrando: boolean) => void; // para bloquear el deslizamiento de la pantalla mientras se arrastra
};

export default function DeslizarParaEmpezar({ texto = 'Desliza para empezar', onCompletar, onArrastrando }: Props) {
  const [ancho, setAncho] = useState(0);
  const recorrido = Math.max(ancho - PERILLA - MARGEN * 2, 1);

  const x = useRef(new Animated.Value(0)).current;
  const pista = useRef(new Animated.Value(0)).current;
  const completado = useRef(false);
  const tramo = useRef(0); // para vibrar suave al cruzar cada tercio del recorrido
  const tocado = useRef(false);
  const recorridoRef = useRef(recorrido);
  recorridoRef.current = recorrido;

  useEffect(() => {
    const id = x.addListener(({ value }) => {
      const nuevo = Math.min(3, Math.floor((value / recorridoRef.current) * 3));
      if (nuevo !== tramo.current) {
        if (nuevo > tramo.current && nuevo < 3) seleccion();
        tramo.current = nuevo;
      }
    });
    return () => x.removeListener(id);
  }, [x]);

  // Gesto de ayuda: la perilla se mueve un poquito hacia la derecha y vuelve.
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(pista, { toValue: 18, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(pista, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
      ])
    );
    bucle.start();
    return () => bucle.stop();
  }, [pista]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          if (completado.current) return;
          tocado.current = true;
          pista.stopAnimation();
          pista.setValue(0);
          toque();
          onArrastrando?.(true);
        },
        onPanResponderMove: (_e, g) => {
          if (completado.current) return;
          x.setValue(Math.min(Math.max(g.dx, 0), recorridoRef.current));
        },
        onPanResponderRelease: (_e, g) => {
          onArrastrando?.(false);
          if (completado.current) return;
          const llegoLejos = g.dx > recorridoRef.current * 0.7;
          if (llegoLejos) {
            completado.current = true;
            exito();
            Animated.timing(x, { toValue: recorridoRef.current, duration: 140, useNativeDriver: true }).start(() => {
              onCompletar();
              // Cuando la pantalla ya cambió, deja el botón listo por si el usuario vuelve.
              setTimeout(() => {
                completado.current = false;
                x.setValue(0);
              }, 700);
            });
          } else {
            Animated.spring(x, { toValue: 0, friction: 5, tension: 140, useNativeDriver: true }).start();
          }
        },
        onPanResponderTerminate: () => {
          onArrastrando?.(false);
          if (!completado.current) Animated.spring(x, { toValue: 0, friction: 5, useNativeDriver: true }).start();
        },
      }),
    [onCompletar, onArrastrando, x, pista]
  );

  const capaMantequilla = x.interpolate({ inputRange: [0, recorrido * 0.5, recorrido], outputRange: [0, 1, 0], extrapolate: 'clamp' });
  const capaPistacho = x.interpolate({ inputRange: [0, recorrido * 0.5, recorrido], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const opacidadTexto = x.interpolate({ inputRange: [0, recorrido * 0.6], outputRange: [1, 0], extrapolate: 'clamp' });
  const desplazarTexto = x.interpolate({ inputRange: [0, recorrido], outputRange: [0, 24], extrapolate: 'clamp' });
  const escalaPerilla = x.interpolate({ inputRange: [0, recorrido], outputRange: [1, 1.08], extrapolate: 'clamp' });

  return (
    <View style={st.sombra} onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}>
      <View style={st.pista}>
        {/* Capas de color de la paleta: se mezclan según qué tan lejos está la perilla */}
        <Animated.View style={[st.capa, { backgroundColor: colors.accent, opacity: capaMantequilla }]} pointerEvents="none" />
        <Animated.View style={[st.capa, { backgroundColor: colors.magic, opacity: capaPistacho }]} pointerEvents="none" />

        {/* Texto central que se va apagando mientras se arrastra */}
        <Animated.View style={[st.textoWrap, { opacity: opacidadTexto, transform: [{ translateX: desplazarTexto }] }]} pointerEvents="none">
          <Text style={st.texto}>{texto}</Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.9)" />
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.55)" style={{ marginLeft: -10 }} />
        </Animated.View>

        {/* Perilla que se arrastra */}
        <Animated.View
          {...responder.panHandlers}
          style={[st.perilla, { transform: [{ translateX: Animated.add(x, pista) }, { scale: escalaPerilla }] }]}
        >
          <Ionicons name="arrow-forward" size={22} color={colors.primary} />
        </Animated.View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  capa: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  pista: {
    height: ALTO,
    borderRadius: ALTO / 2,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sombra: {
    height: ALTO,
    borderRadius: ALTO / 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  textoWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    paddingLeft: PERILLA + MARGEN * 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  texto: { fontFamily: fonts.heading, fontSize: 17, color: colors.white },
  perilla: {
    position: 'absolute',
    left: MARGEN,
    width: PERILLA,
    height: PERILLA,
    borderRadius: PERILLA / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});