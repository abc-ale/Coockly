import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { api } from '../lib/api';
import { colors } from '../constants/theme';

type Etiqueta = { id: number; nombre: string };

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

  const chip = (texto: string, activo: boolean, alPulsar: () => void, clave: string) => (
    <Pressable
      key={clave}
      onPress={alPulsar}
      style={[styles.chip, activo && styles.chipActivo]}
    >
      <Text style={[styles.texto, activo && styles.textoActivo]}>{texto}</Text>
    </Pressable>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.fila}
    >
      {chip('Todas', seleccionada === null, () => onCambiar(null), 'todas')}
      {etiquetas.map((e) =>
        chip(e.nombre, seleccionada === e.id, () => onCambiar(seleccionada === e.id ? null : e.id), String(e.id))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fila: { gap: 8, paddingVertical: 8 },
  chip: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipActivo: { backgroundColor: colors.primary },
  texto: { color: colors.primaryDark, fontSize: 14 },
  textoActivo: { color: '#fff', fontWeight: '600' },
})