import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, spacing, typography } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function CreatePostScreen() {
  const [contenido, setContenido] = useState('');
  const [imagenLocal, setImagenLocal] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);

  const elegirImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Cookly necesita acceso a tus fotos.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!resultado.canceled) {
      setImagenLocal(resultado.assets[0].uri);
    }
  };

  const publicar = async () => {
    if (!contenido.trim() && !imagenLocal) {
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
      if (imagenLocal) {
        const respuesta = await fetch(imagenLocal);
        const blob = await respuesta.blob();
        const extension = imagenLocal.split('.').pop() || 'jpg';
        const nombreArchivo = `${userId}/${Date.now()}.${extension}`;

        const { error: errorSubida } = await supabase.storage
          .from('posts-images')
          .upload(nombreArchivo, blob, { contentType: `image/${extension}` });

        if (errorSubida) throw errorSubida;

        const { data: urlPublica } = supabase.storage.from('posts-images').getPublicUrl(nombreArchivo);
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
      Alert.alert('Error al publicar', error.message || 'Intenta de nuevo.');
    } finally {
      setPublicando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
        />

        {imagenLocal ? (
          <View>
            <Image source={{ uri: imagenLocal }} style={styles.previewImagen} />
            <TouchableOpacity style={styles.quitarImagen} onPress={() => setImagenLocal(null)}>
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
        <TouchableOpacity style={styles.botonPublicar} onPress={publicar} disabled={publicando}>
          {publicando ? <ActivityIndicator color={colors.white} /> : <Text style={styles.botonPublicarTexto}>Publicar</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitulo: { ...typography.h3, color: colors.text },
  content: { flex: 1, padding: spacing.md, gap: spacing.md },
  input: { minHeight: 100, ...typography.body, color: colors.text },
  botonImagen: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, padding: spacing.md, justifyContent: 'center' },
  botonImagenTexto: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  previewImagen: { width: '100%', height: 240, borderRadius: radius.md, backgroundColor: colors.border },
  quitarImagen: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 13 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  botonPublicar: { backgroundColor: colors.primary, borderRadius: radius.md, height: 50, justifyContent: 'center', alignItems: 'center' },
  botonPublicarTexto: { color: colors.white, fontWeight: '700', fontSize: 16 },
});