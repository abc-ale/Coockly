import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { Presionable } from './Animaciones';
import { seleccion } from '../lib/vibracion';
import { colors } from '../constants/theme';

type Etiqueta = { id: number; nombre: string };

// Icono según el nombre de la categoría (si no se reconoce, un cubierto).
const ICONOS: [RegExp, keyof typeof Ionicons.glyphMap][] = [
  [/postre|dulce|helado|torta|pastel/i, 'ice-cream-outline'],
  [/saludable|light|ensalada|vegetar|vegan|fit/i, 'leaf-outline'],
  [/r[aá]pid|snack|hamburg|antojo/i, 'fast-food-outline'],
  [/pizza|pasta|italian/i, 'pizza-outline'],
  [/pescado|marisco|mar|ceviche/i, 'fish-outline'],
  [/desayuno|ma[ñn]ana/i, 'sunny-outline'],
  [/cena|noche/i, 'moon-outline'],
  [/sopa|caldo|crema|sancocho/i, 'water-outline'],
  [/parrilla|brasa|asado|horno|frito/i, 'flame-outline'],
  [/bebida|jugo|cóctel|coctel|trago/i, 'wine-outline'],
  [/caf[eé]|t[eé]|infusi/i, 'cafe-outline'],
  [/huevo/i, 'egg-outline'],
  [/fruta|nutri/i, 'nutrition-outline'],
];

function iconoDe(nombre: string): keyof typeof Ionicons.glyphMap {
  return ICONOS.find(([re]) => re.test(nombre))?.[1] ?? 'restaurant-outline';
}

type Props = {
  seleccionada: number | null;
  onCambiar: (etiquetaId: number | null) => void;
};

export default function FiltroEtiquetas({ seleccionada, onCambiar }: Props) {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);

  useEffect(() => {
    let activo = true;
    api
      .get('/catalogos')
      .then((r) => {
        if (activo) setEtiquetas(r.data.etiquetas ?? []);
      })
      .catch(() => {
        if (activo) setEtiquetas([]);
      });
    return () => {
      activo = false;
    };
  }, []);

  if (etiquetas.length === 0) return null;

  const chip = (texto: string, icono: keyof typeof Ionicons.glyphMap, activo: boolean, alPulsar: () => void, clave: string) => (
    <Presionable
      key={clave}
      escalaAlPresionar={0.9}
      onPress={() => {
        seleccion();
        alPulsar();
      }}
      style={[styles.chip, activo && styles.chipActivo]}
    >
      <Ionicons name={icono} size={16} color={activo ? '#fff' : colors.primaryDark} />
      <Text style={[styles.texto, activo && styles.textoActivo]}>{texto}</Text>
    </Presionable>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.fila}
    >
      {chip('Todas', 'grid-outline', seleccionada === null, () => onCambiar(null), 'todas')}
      {etiquetas.map((e) =>
        chip(e.nombre, iconoDe(e.nombre), seleccionada === e.id, () => onCambiar(seleccionada === e.id ? null : e.id), String(e.id))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // paddingHorizontal: separa 'Todas' del borde del teléfono.
  fila: { gap: 8, paddingVertical: 8, paddingHorizontal: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActivo: { backgroundColor: colors.primary },
  texto: { color: colors.primaryDark, fontSize: 14 },
  textoActivo: { color: '#fff', fontWeight: '600' },
})