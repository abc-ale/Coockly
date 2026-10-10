import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

type AparecerProps = {
  children: React.ReactNode;
  delay?: number;        // milisegundos de espera antes de entrar
  distancia?: number;    // cuánto sube al entrar
  style?: StyleProp<ViewStyle>;
};

/** Hace que el contenido aparezca con fundido y un leve deslizamiento hacia arriba. */
export function Aparecer({ children, delay = 0, distancia = 18, style }: AparecerProps) {
  const progreso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progreso, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progreso, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progreso,
          transform: [
            { translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [distancia, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Aparece con un pequeño rebote (ideal para botones flotantes). */
export function Rebote({ children, delay = 0, style }: Omit<AparecerProps, 'distancia'>) {
  const escala = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(escala, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [escala, delay]);

  return <Animated.View style={[style, { transform: [{ scale: escala }] }]}>{children}</Animated.View>;
}

type PresionableProps = PressableProps & {
  style?: StyleProp<ViewStyle>;
  escalaAlPresionar?: number;
  children: React.ReactNode;
};

/** Pressable que se encoge suavemente al tocarlo y vuelve con un rebote. */
export function Presionable({ children, style, escalaAlPresionar = 0.94, onPressIn, onPressOut, ...resto }: PresionableProps) {
  const escala = useRef(new Animated.Value(1)).current;

  const animar = (valor: number) =>
    Animated.spring(escala, { toValue: valor, friction: 6, tension: 220, useNativeDriver: true }).start();

  return (
    <Pressable
      {...resto}
      onPressIn={(e) => {
        animar(escalaAlPresionar);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animar(1);
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale: escala }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Late suavemente sin parar (para llamar la atención sobre un botón). */
export function Pulso({ children, style, intensidad = 1.04 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; intensidad?: number }) {
  const latido = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(latido, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(latido, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    bucle.start();
    return () => bucle.stop();
  }, [latido]);

  return (
    <Animated.View style={[style, { transform: [{ scale: latido.interpolate({ inputRange: [0, 1], outputRange: [1, intensidad] }) }] }]}>
      {children}
    </Animated.View>
  );
}