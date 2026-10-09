import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../lib/api';
import { colors } from '../constants/theme';

type Etiqueta = { id: number; nombre: string };

export default function EtiquetasReceta({ recetaId }: { recetaId: number }) {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);

  useEffect(() => {
    let activo = true;
    api
      .get(`/recetas/${recetaId}/etiquetas`)
      .then((r) => {
        if (activo) setEtiquetas(r.data);
      })
      .catch(() => {
        if (activo) setEtiquetas([]);
      });
    return () => {
      activo = false;
    };
  }, [recetaId]);

  if (etiquetas.length === 0) return null;

  return (
    <View style={styles.fila}>
      {etiquetas.map((e) => (
        <View key={e.id} style={styles.chip}>
          <Text style={styles.texto}>{e.nombre}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  chip: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  texto: { color: colors.primaryDark, fontSize: 13 },
});