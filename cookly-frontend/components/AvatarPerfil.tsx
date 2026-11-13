// components/AvatarPerfil.tsx
// Dibuja la foto de perfil: el animalito sobre su color de fondo. Si aún no eligió, muestra la inicial.
import React from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts } from '../constants/theme';
import { buscarAnimal, type Avatar } from '../lib/avatar';

type Props = {
  avatar?: Avatar | null;
  inicial?: string;
  tam: number;
  /** Radio de las esquinas. Por defecto es un círculo. */
  radio?: number;
  borde?: number;
  style?: StyleProp<ViewStyle>;
};

export default function AvatarPerfil({ avatar, inicial = 'C', tam, radio, borde = 0, style }: Props) {
  const animal = buscarAnimal(avatar?.animal);
  const caja: ViewStyle = {
    width: tam,
    height: tam,
    borderRadius: radio ?? tam / 2,
    backgroundColor: animal && avatar ? avatar.fondo : colors.primary,
    borderWidth: borde,
    borderColor: colors.white,
  };
  const interior = tam - borde * 2;
  return (
    <View style={[st.base, caja, animal && { justifyContent: 'flex-end' }, style]}>
      {animal ? (
        <Image source={{ uri: animal.uri }} style={{ width: interior * 1.05, height: interior * 1.05, marginBottom: -interior * 0.13 }} resizeMode="contain" />
      ) : (
        <Text style={[st.letra, { fontSize: tam * 0.48, lineHeight: tam * 0.58 }]}>{inicial}</Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  letra: { fontFamily: fonts.display, color: colors.white },
});