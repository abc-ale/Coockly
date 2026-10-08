import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors } from '../constants/theme';

const MAX_MOTIVO = 500;

type Props = {
  tipo: 'POST' | 'COMENTARIO';
  contenidoId: string;
  tamano?: number;
};

export default function BotonReportarContenido({ tipo, contenidoId, tamano = 19 }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const nombre = tipo === 'POST' ? 'publicación' : 'comentario';

  const cerrar = () => {
    setAbierto(false);
    setMotivo('');
    setError('');
  };

  const enviar = async () => {
    if (!motivo.trim()) {
      setError('Cuéntanos el motivo del reporte.');
      return;
    }
    setEnviando(true);
    setError('');

    const fila =
      tipo === 'POST'
      ? { tipo, post_id: contenidoId, motivo: motivo.trim() }
      : { tipo, comentario_id: contenidoId, motivo: motivo.trim() };

    const { error: fallo } = await supabase
      .from('reportes_comunidad')
      .insert(fila as any);

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
            <Text style={styles.ayuda}>¿Qué problema tiene este {nombre}?</Text>

            <TextInput
              style={styles.input}
              value={motivo}
              onChangeText={(t) => {
                setMotivo(t);
                if (error) setError('');
              }}
              placeholder="Escribe el motivo"
              multiline
              maxLength={MAX_MOTIVO}
              textAlignVertical="top"
              editable={!enviando}
            />
            <Text style={styles.contador}>
              {motivo.length}/{MAX_MOTIVO}
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.acciones}>
              <Pressable onPress={cerrar} disabled={enviando} style={styles.botonSecundario}>
                <Text style={styles.textoSecundario}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={enviar} disabled={enviando} style={styles.botonPrimario}>
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
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#222',
  },
  contador: { alignSelf: 'flex-end', marginTop: 4, color: '#999', fontSize: 12 },
  error: { marginTop: 8, color: '#B3261E', fontSize: 13 },
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
  textoPrimario: { color: '#fff', fontSize: 15, fontWeight: '600' },
});