import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors } from '../constants/theme';

// Únicos motivos permitidos. Lo que se guarda en la base de datos es exactamente este texto.
const MOTIVOS = [
  'Spam o publicidad',
  'Fuera de tema (no es cocina)',
  'Información falsa o peligrosa',
  'Acoso u ofensas',
  'Plagio o derechos de autor',
] as const;

type Props = {
  tipo: 'POST' | 'COMENTARIO';
  contenidoId: string;
  tamano?: number;
};

export default function BotonReportarContenido({ tipo, contenidoId, tamano = 19 }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const nombre = tipo === 'POST' ? 'publicación' : 'comentario';

  const cerrar = () => {
    setAbierto(false);
    setMotivo(null);
    setError('');
  };

  const enviar = async () => {
    if (!motivo) {
      setError('Elige un motivo para el reporte.');
      return;
    }
    setEnviando(true);
    setError('');

    const fila =
      tipo === 'POST'
        ? { tipo, post_id: contenidoId, motivo }
        : { tipo, comentario_id: contenidoId, motivo };

    const { error: fallo } = await supabase.from('reportes_comunidad').insert(fila as any);

    setEnviando(false);

    if (fallo) {
      // 23505 = ya reportaste este mismo contenido
      setError(
        fallo.code === '23505'
          ? `Ya reportaste este ${nombre}.`
          : 'No pudimos enviar el reporte. Inténtalo de nuevo.'
      );
      return;
    }

    cerrar();
    Alert.alert('Reporte enviado', 'Gracias. Un moderador lo revisará.');
  };

  return (
    <>
      <TouchableOpacity onPress={() => setAbierto(true)} hitSlop={10}>
        <Ionicons name="flag-outline" size={tamano} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={cerrar}>
        <View style={styles.fondo}>
          <View style={styles.tarjeta}>
            <Text style={styles.titulo}>Reportar {nombre}</Text>
            <Text style={styles.ayuda}>¿Cuál es el problema?</Text>

            {MOTIVOS.map((opcion) => {
              const elegido = motivo === opcion;
              return (
                <Pressable
                  key={opcion}
                  onPress={() => {
                    setMotivo(opcion);
                    if (error) setError('');
                  }}
                  disabled={enviando}
                  style={[styles.opcion, elegido && styles.opcionElegida]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: elegido }}
                >
                  <Ionicons
                    name={elegido ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={elegido ? colors.primary : '#999'}
                  />
                  <Text style={[styles.opcionTexto, elegido && styles.opcionTextoElegido]}>
                    {opcion}
                  </Text>
                </Pressable>
              );
            })}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.acciones}>
              <Pressable onPress={cerrar} disabled={enviando} style={styles.botonSecundario}>
                <Text style={styles.textoSecundario}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={enviar}
                disabled={enviando || !motivo}
                style={[styles.botonPrimario, (!motivo || enviando) && styles.botonDeshabilitado]}
              >
                {enviando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.textoPrimario}>Enviar reporte</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  tarjeta: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  titulo: { fontSize: 18, fontWeight: '600', color: '#222' },
  ayuda: { marginTop: 4, marginBottom: 12, color: '#666', fontSize: 14 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  opcionElegida: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  opcionTexto: { flex: 1, fontSize: 15, color: '#222' },
  opcionTextoElegido: { fontWeight: '600' },
  error: { marginTop: 4, color: '#B3261E', fontSize: 13 },
  acciones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  botonSecundario: { paddingVertical: 10, paddingHorizontal: 16 },
  textoSecundario: { color: '#666', fontSize: 15 },
  botonPrimario: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 130,
    alignItems: 'center',
  },
  botonDeshabilitado: { opacity: 0.5 },
  textoPrimario: { color: '#fff', fontSize: 15, fontWeight: '600' },
});