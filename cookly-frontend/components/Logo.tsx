import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../constants/theme';

type Props = {
  size?: number;                       // alto del isotipo
  variante?: 'rosa' | 'claro' | 'oscuro';
  conTexto?: boolean;                  // muestra "ookly" al lado (el isotipo hace de "C")
  colorTexto?: string;
};

const IMAGENES = {
  rosa: require('../assets/images/isotipo-rosa.png'),
  claro: require('../assets/images/isotipo-claro.png'),
  oscuro: require('../assets/images/isotipo-oscuro.png'),
};

export default function Logo({ size = 40, variante = 'rosa', conTexto = true, colorTexto }: Props) {
  return (
    <View style={styles.fila} accessible accessibilityLabel="Cookly">
      <Image
        source={IMAGENES[variante]}
        style={{ width: size * 0.91, height: size }}
        resizeMode="contain"
      />
      {conTexto && (
        <Text
          style={[
            styles.texto,
            { fontSize: size * 0.82, lineHeight: size, color: colorTexto ?? colors.text },
          ]}
        >
          ookly
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  texto: { fontFamily: fonts.displayBold, letterSpacing: -0.5, includeFontPadding: false },
});