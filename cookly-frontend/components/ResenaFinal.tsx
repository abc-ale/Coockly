// components/ResenaFinal.tsx
// Pantalla que aparece al terminar la Cocina guiada: "¿Qué tal te salió?".
// Foto de la receta de fondo, hoja blanca abajo con estrellas, comentario y botón para publicar.
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ImagenReceta from './ImagenReceta';
import { Presionable } from './Animaciones';
import { mostrarAviso } from './Aviso';
import { colors, fonts, radius } from '../constants/theme';
import { api } from '../lib/api';
import { exito, seleccion } from '../lib/vibracion';

const ORO = '#FFB400';
const MAX = 280;

const ETIQUETAS: Record<number, string> = {
  1: 'No me gustó',
  2: 'Regular',
  3: 'Estuvo bien',
  4: '¡Muy rica!',
  5: '¡Espectacular!',
};

type Props = {
  recetaId: number;
  nombre: string;
  imagen?: string | null;
  /** Si el usuario ya había reseñado esta receta, se parte de ahí. */
  puntuacionInicial?: number;
  comentarioInicial?: string;
  /** Texto de la etiqueta de arriba (por defecto "¡Receta terminada!"). */
  insignia?: string;
  /** true si el usuario ya tenía una reseña (el botón dice "Actualizar reseña"). */
  yaTieneResena?: boolean;
  /** Se llama al publicar con éxito (para refrescar las reseñas de la receta). */
  onPublicada?: () => void;
  /** Cierra todo (Ahora no, la X o después de publicar). */
  onCerrar: () => void;
};

function Estrella({ activa, onPress, indice }: { activa: boolean; onPress: () => void; indice: number }) {
  const escala = useRef(new Animated.Value(1)).current;
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    if (activa) {
      Animated.sequence([
        Animated.timing(escala, { toValue: 1.25, duration: 90, useNativeDriver: true }),
        Animated.spring(escala, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [activa, escala]);
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityLabel={`${indice} ${indice === 1 ? 'estrella' : 'estrellas'}`}>
      <Animated.View style={{ transform: [{ scale: escala }] }}>
        <Ionicons name="star" size={46} color={activa ? ORO : colors.primaryLight} />
      </Animated.View>
    </Pressable>
  );
}

export default function ResenaFinal({ recetaId, nombre, imagen, puntuacionInicial = 0, comentarioInicial = '', insignia = '¡Receta terminada!', yaTieneResena, onPublicada, onCerrar }: Props) {
  const insets = useSafeAreaInsets();
  const [puntuacion, setPuntuacion] = useState(puntuacionInicial);
  const [comentario, setComentario] = useState(comentarioInicial);
  const [enviando, setEnviando] = useState(false);
  const [tecladoAbierto, setTecladoAbierto] = useState(false);
  const [alturaTeclado, setAlturaTeclado] = useState(0);
  const altoInicial = useRef(0);
  const [alto, setAlto] = useState(0);

  // Entrada: la hoja sube desde abajo.
  const sube = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(sube, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, [sube]);

  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', (e) => {
      setTecladoAbierto(true);
      setAlturaTeclado(e.endCoordinates?.height ?? 0);
    });
    const b = Keyboard.addListener('keyboardDidHide', () => {
      setTecladoAbierto(false);
      setAlturaTeclado(0);
    });
    return () => { a.remove(); b.remove(); };
  }, []);

  // Si la ventana ya se achicó sola con el teclado, no hace falta dejarle espacio extra.
  const ventanaSeAchico = altoInicial.current > 0 && alto < altoInicial.current - 60;
  const espacioTeclado = tecladoAbierto && !ventanaSeAchico && Platform.OS === 'android' ? alturaTeclado : 0;

  async function publicar() {
    if (enviando) return;
    if (puntuacion === 0) {
      Alert.alert('Falta tu calificación', 'Toca una estrella para calificar la receta.');
      return;
    }
    setEnviando(true);
    Keyboard.dismiss();
    try {
      await api.put(`/recetas/${recetaId}/resenas`, {
        puntuacion,
        comentario: comentario.trim() || undefined,
      });
      exito();
      mostrarAviso('¡Gracias! Tu reseña se guardó');
      onPublicada?.();
      onCerrar();
    } catch (error: any) {
      Alert.alert('No se pudo publicar', error?.response?.data?.mensaje || 'No pudimos guardar tu reseña. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View
      style={st.raiz}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (altoInicial.current === 0) altoInicial.current = h;
        setAlto(h);
      }}
    >
      <ImagenReceta uri={imagen} ancho={900} tamanoIcono={60} style={StyleSheet.absoluteFill} />
      <View style={st.velo} />

      <Pressable style={[st.cerrar, { top: Math.max(insets.top, 12) + 8 }]} onPress={onCerrar} hitSlop={10} accessibilityLabel="Cerrar">
        <Ionicons name="close" size={22} color={colors.text} />
      </Pressable>

      {/* Parte de arriba: etiqueta + nombre (se esconde cuando sale el teclado) */}
      {!tecladoAbierto ? (
        <View style={st.cabecera}>
          <View style={st.insignia}>
            <Ionicons name="checkmark" size={14} color={colors.text} />
            <Text style={st.insigniaTexto}>{insignia}</Text>
          </View>
          <Text style={st.nombre} numberOfLines={2}>{nombre}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <Animated.View
        style={[
          st.hoja,
          {
            paddingBottom: insets.bottom + 16 + espacioTeclado,
            transform: [{ translateY: sube.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
          },
        ]}
      >
        <View style={st.asa} />
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
          <Text style={st.titulo}>¿Qué tal te salió?</Text>
          <Text style={st.subtitulo}>Tu opinión ayuda a otros a cocinar mejor.</Text>

          <View style={st.estrellas}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Estrella
                key={n}
                indice={n}
                activa={n <= puntuacion}
                onPress={() => {
                  seleccion();
                  setPuntuacion(n);
                }}
              />
            ))}
          </View>

          <View style={st.etiquetaCaja}>
            {puntuacion > 0 ? (
              <View style={st.etiqueta}>
                <Text style={st.etiquetaTexto}>{ETIQUETAS[puntuacion]}</Text>
              </View>
            ) : (
              <Text style={st.pista}>Toca una estrella para calificar</Text>
            )}
          </View>

          <View style={st.entrada}>
            <TextInput
              style={st.texto}
              multiline
              maxLength={MAX}
              value={comentario}
              onChangeText={setComentario}
              placeholder="Cuéntanos cómo te quedó (opcional)"
              placeholderTextColor={colors.textMuted}
              textAlignVertical="top"
            />
            <Text style={st.contador}>{comentario.length}/{MAX}</Text>
          </View>

          <Presionable escalaAlPresionar={0.97} style={[st.publicar, puntuacion === 0 && { opacity: 0.55 }]} onPress={publicar} disabled={enviando}>
            <Text style={st.publicarTexto}>{yaTieneResena ?? puntuacionInicial > 0 ? 'Actualizar reseña' : 'Publicar reseña'}</Text>
            <View style={st.circulo}>
              {enviando ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="arrow-forward" size={22} color={colors.primary} />}
            </View>
          </Presionable>

          <Pressable onPress={onCerrar} hitSlop={10} style={st.ahoraNo}>
            <Text style={st.ahoraNoTexto}>Ahora no</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  raiz: { ...StyleSheet.absoluteFill, backgroundColor: colors.text },
  velo: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(43,18,32,0.42)' },
  cerrar: {
    position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', zIndex: 5,
  },
  cabecera: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, minHeight: 140 },
  insignia: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  insigniaTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  nombre: { fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 38, color: colors.white, textAlign: 'center', marginTop: 14 },

  hoja: {
    backgroundColor: colors.background, borderTopLeftRadius: 40, borderTopRightRadius: 40,
    paddingHorizontal: 22, paddingTop: 10, maxHeight: '82%',
  },
  asa: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.primaryLight, marginBottom: 18 },
  titulo: { fontFamily: fonts.displayBold, fontSize: 26, color: colors.text, textAlign: 'center' },
  subtitulo: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
  estrellas: { flexDirection: 'row', gap: 10, marginTop: 22 },
  etiquetaCaja: { height: 40, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  etiqueta: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 8 },
  etiquetaTexto: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  pista: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  entrada: {
    alignSelf: 'stretch', marginTop: 12, backgroundColor: colors.white, borderRadius: 26, borderWidth: 2, borderColor: colors.primary,
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, minHeight: 120,
  },
  texto: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.text, minHeight: 70, padding: 0 },
  contador: { alignSelf: 'flex-end', fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 4 },
  publicar: {
    alignSelf: 'stretch', height: 62, borderRadius: 31, backgroundColor: colors.primary, marginTop: 18, paddingLeft: 26, paddingRight: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  publicarTexto: { fontFamily: fonts.heading, fontSize: 18, color: colors.white },
  circulo: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  ahoraNo: { paddingVertical: 16 },
  ahoraNoTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.textMuted },
});