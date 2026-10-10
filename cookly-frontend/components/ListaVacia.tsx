import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../constants/theme';

type Props = { onCrear: () => void };

export default function ListaVacia({ onCrear }: Props) {
  return (
    <View style={s.tarjeta}>
      <Image source={require('../assets/images/ilustracion-lista.png')} style={s.imagen} resizeMode="contain" />
      <Text style={s.titulo}>Aún no tienes listas</Text>
      <Text style={s.texto}>
        Crea una lista para guardar ingredientes{'\n'}y marcar lo que ya compraste.
      </Text>

      <TouchableOpacity style={s.boton} activeOpacity={0.85} onPress={onCrear}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={s.botonTexto}>Crear mi primera lista</Text>
      </TouchableOpacity>

      <Text style={s.pista}>Empieza con un nombre y agrega tus productos.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#fff',
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    paddingHorizontal: 24,
    paddingVertical: 36,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  imagen: { width: 190, height: 190 },
  titulo: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginTop: 18 },
  texto: {
    fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.textMuted,
    textAlign: 'center', marginTop: 8,
  },
  boton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, height: 56, alignSelf: 'stretch', borderRadius: 999, marginTop: 26,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  botonTexto: { fontFamily: fonts.heading, fontSize: 16, color: '#fff' },
  pista: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 22, textAlign: 'center' },
});