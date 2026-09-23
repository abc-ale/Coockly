import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { colors, radius, spacing, typography } from '../constants/theme';

type Mensaje = {
  id: string;
  texto: string;
  esUsuario: boolean;
};

const sugerenciasRapidas = ['¿Qué puedo cocinar hoy?', 'Receta rápida con pollo', 'Ideas para postre'];

function respuestaDeRespaldo(pregunta: string): string {
  const texto = pregunta.toLowerCase();
  if (texto.includes('pollo')) {
    return 'Con pollo te recomiendo un Ají de Gallina o un Pollo al Horno con papas.';
  }
  if (texto.includes('postre')) {
    return 'Podrías probar una Torta de Chocolate o un Suspiro a la Limeña.';
  }
  return 'Ahora mismo no puedo conectarme a mi cerebro de IA, pero puedo ayudarte con lo básico de tu despensa y recetas guardadas.';
}

async function preguntarAlAsistente(historial: Mensaje[]): Promise<string> {
  try {
    const response = await fetch('https://cookly-backend-y19h.onrender.com/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensajes: historial }),
    });

    const data = await response.json();

    if (!data.texto) {
      console.log('RESPUESTA SIN TEXTO DEL BACKEND:', JSON.stringify(data));
      return respuestaDeRespaldo(historial[historial.length - 1].texto);
    }
    return data.texto;
  } catch (error) {
    console.log('ERROR AL LLAMAR AL BACKEND:', error);
    return respuestaDeRespaldo(historial[historial.length - 1].texto);
  }
}

export default function ChatbotScreen() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { id: '1', texto: '¡Hola! Soy tu asistente Cookly 🔍 Puedo ayudarte a encontrar recetas, sugerir menús semanales o responder preguntas de cocina. ¿Por dónde empezamos?', esUsuario: false },
  ]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [modoVoz, setModoVoz] = useState(false);
  const [hablando, setHablando] = useState(false);

  const textoReconocidoRef = useRef('');
  const modoVozRef = useRef(false);

  useSpeechRecognitionEvent('start', () => setEscuchando(true));

  useSpeechRecognitionEvent('result', (event) => {
    const resultado = event.results[0]?.transcript;
    if (resultado) {
      textoReconocidoRef.current = resultado;
      setTexto(resultado);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setEscuchando(false);
    const dicho = textoReconocidoRef.current.trim();
    textoReconocidoRef.current = '';

    if (modoVozRef.current && dicho !== '') {
      enviarMensaje(dicho, true);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('ERROR DE RECONOCIMIENTO DE VOZ:', event.error, event.message);
    setEscuchando(false);
  });

  const iniciarEscucha = async () => {
    const permiso = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Cookly necesita acceso al micrófono para escucharte.');
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: 'es-PE',
      interimResults: true,
      continuous: false,
    });
  };

  const activarModoVoz = async () => {
    modoVozRef.current = true;
    setModoVoz(true);
    await iniciarEscucha();
  };

  const desactivarModoVoz = () => {
    modoVozRef.current = false;
    setModoVoz(false);
    ExpoSpeechRecognitionModule.stop();
    Speech.stop();
    setEscuchando(false);
    setHablando(false);
  };

  const enviarMensaje = async (contenido: string, esPorVoz: boolean = false) => {
    if (contenido.trim() === '' || cargando) return;

    const nuevoMensajeUsuario: Mensaje = { id: Date.now().toString(), texto: contenido, esUsuario: true };
    const historialActualizado = [...mensajes, nuevoMensajeUsuario];

    setMensajes(historialActualizado);
    setTexto('');
    setCargando(true);

    const respuestaTexto = await preguntarAlAsistente(historialActualizado);
    const respuestaBot: Mensaje = { id: (Date.now() + 1).toString(), texto: respuestaTexto, esUsuario: false };

    setMensajes((prev) => [...prev, respuestaBot]);
    setCargando(false);

    if (esPorVoz && modoVozRef.current) {
      setHablando(true);
      Speech.speak(respuestaTexto, {
        language: 'es-PE',
        pitch: 1.05,
        rate: 0.92,
        onDone: () => {
          setHablando(false);
          if (modoVozRef.current) {
            iniciarEscucha();
          }
        },
        onStopped: () => {
          setHablando(false);
        },
      });
    }
  };

  const manejarToqueMicrofono = () => {
    if (hablando) {
      Speech.stop();
      setHablando(false);
      iniciarEscucha();
    } else if (modoVoz) {
      desactivarModoVoz();
    } else {
      activarModoVoz();
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Ionicons name="restaurant" size={18} color={colors.white} />
        </View>
        <View>
          <Text style={styles.headerName}>Asistente Cookly</Text>
          <Text style={styles.headerStatus}>
            {escuchando ? 'Escuchando...' : hablando ? 'Hablando... (toca el micro para interrumpir)' : cargando ? 'Pensando...' : modoVoz ? 'Modo voz activo' : 'En línea ahora'}
          </Text>
        </View>
      </View>

      <FlatList
        data={mensajes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.esUsuario ? styles.bubbleUsuario : styles.bubbleBot]}>
            <Text style={item.esUsuario ? styles.bubbleTextUsuario : styles.bubbleTextBot}>{item.texto}</Text>
          </View>
        )}
        ListFooterComponent={cargando ? <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} /> : null}
      />

      <View style={styles.suggestionsRow}>
        {sugerenciasRapidas.map((sug) => (
          <TouchableOpacity key={sug} style={styles.suggestionChip} onPress={() => enviarMensaje(sug)}>
            <Text style={styles.suggestionText}>{sug}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[styles.micButton, (escuchando || modoVoz) && styles.micButtonActivo]}
          onPress={manejarToqueMicrofono}
        >
          <Ionicons name={modoVoz ? 'mic' : 'mic-outline'} size={20} color={(escuchando || modoVoz) ? colors.white : colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder={escuchando ? 'Escuchando...' : modoVoz ? 'Modo voz activo...' : 'Escribe aquí...'}
          placeholderTextColor={colors.textMuted}
          value={texto}
          onChangeText={setTexto}
          editable={!modoVoz}
        />
        <TouchableOpacity style={styles.sendButton} onPress={() => enviarMensaje(texto)}>
          <Ionicons name="send" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerAvatar: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  headerName: { ...typography.h3, color: colors.text },
  headerStatus: { ...typography.caption, color: colors.success },
  messagesList: { padding: spacing.md, gap: spacing.sm },
  bubble: { maxWidth: '80%', padding: spacing.sm + 4, borderRadius: radius.md, marginBottom: 4 },
  bubbleBot: { backgroundColor: colors.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleUsuario: { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleTextBot: { color: colors.text, ...typography.bodySmall },
  bubbleTextUsuario: { color: colors.white, ...typography.bodySmall },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  suggestionChip: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.sm + 4, paddingVertical: 6 },
  suggestionText: { ...typography.caption, color: colors.primary },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm + 4, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  micButton: { width: 40, height: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  micButtonActivo: { backgroundColor: colors.primary },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.md, height: 44, ...typography.bodySmall, color: colors.text },
  sendButton: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center' },
});