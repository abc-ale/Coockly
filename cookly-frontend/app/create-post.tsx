import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, spacing, typography } from '../constants/theme';
import { supabase } from '../lib/supabase';

// Tipos que acepta el bucket "posts-images" de Supabase.
const EXTENSION_POR_TIPO: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export default function CreatePostScreen() {
  const [contenido, setContenido] = useState('');
  const [imagen, setImagen] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [publicando, setPublicando] = useState(false);

  const elegirImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Cookly necesita acceso a tus fotos.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!resultado.canceled) {
      setImagen(resultado.assets[0]);
    }
  };

  const publicar = async () => {
    if (publicando) return;

    if (!contenido.trim() && !imagen) {
      Alert.alert('Publicación vacía', 'Escribe algo o agrega una foto.');
      return;
    }

    const { data: sesion } = await supabase.auth.getSession();
    const userId = sesion.session?.user.id;
    if (!userId) {
      router.push('/login');
      return;
    }

    setPublicando(true);
    let imagenUrl: string | null = null;

    try {
      if (imagen) {
        // Tipo real de la imagen; si no viene, se usa JPEG (el selector comprime a JPEG).
        const tipoSolicitado = (imagen.mimeType || 'image/jpeg').toLowerCase();
        const contentType = EXTENSION_POR_TIPO[tipoSolicitado] ? tipoSolicitado : 'image/jpeg';
        const extension = EXTENSION_POR_TIPO[contentType];

        // arrayBuffer (no blob): el blob de React Native llega a Supabase como "text/plain".
        const respuesta = await fetch(imagen.uri);
        const archivo = await respuesta.arrayBuffer();

        // La carpeta DEBE empezar con el id del usuario (lo exigen las reglas de seguridad).
        const nombreArchivo = `${userId}/${Date.now()}.${extension}`;

        const { error: errorSubida } = await supabase.storage
          .from('posts-images')
          .upload(nombreArchivo, archivo, { contentType, upsert: false });

        if (errorSubida) throw errorSubida;

        const { data: urlPublica } = supabase.storage
          .from('posts-images')
          .getPublicUrl(nombreArchivo);
        imagenUrl = urlPublica.publicUrl;
      }

      const { error: errorInsert } = await supabase.from('posts').insert({
        user_id: userId,
        contenido: contenido.trim(),
        imagen_url: imagenUrl,
      });

      if (errorInsert) throw errorInsert;

      router.back();
    } catch (error: any) {
      console.log('ERROR AL PUBLICAR:', error);
      Alert.alert('Error al publicar', error?.message || 'Intenta de nuevo.');
    } finally {
      setPublicando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Nueva publicación</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="¿Qué cocinaste hoy? Comparte tu receta o consejo..."
          placeholderTextColor={colors.textMuted}
          value={contenido}
          onChangeText={setContenido}
          multiline
          textAlignVertical="top"
          maxLength={1000}
        />

        {imagen ? (
          <View>
            <Image source={{ uri: imagen.uri }} style={styles.previewImagen} />
            <TouchableOpacity style={styles.quitarImagen} onPress={() => setImagen(null)}>
              <Ionicons name="close-circle" size={26} color={colors.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.botonImagen} onPress={elegirImagen}>
            <Ionicons name="image-outline" size={22} color={colors.primary} />
            <Text style={styles.botonImagenTexto}>Agregar foto</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.botonPublicar, publicando && { opacity: 0.6 }]}
          onPress={publicar}
          disabled={publicando}
        >
          {publicando ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.botonPublicarTexto}>Publicar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitulo: { ...typography.h3, color: colors.text },
  content: { flex: 1, padding: spacing.md, gap: spacing.md },
  input: { minHeight: 100, ...typography.body, color: colors.text },
  botonImagen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: 'center',
  },
  botonImagenTexto: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  previewImagen: {
    width: '100%',
    height: 240,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  quitarImagen: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 13,
  },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  botonPublicar: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonPublicarTexto: { color: colors.white, fontWeight: '700', fontSize: 16 },
});