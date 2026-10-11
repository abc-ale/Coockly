import React, { useEffect, useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Presionable } from '../components/Animaciones';
import { colors, fonts, spacing } from '../constants/theme';
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

const COLORES_AVATAR = ['#BEE3A5', '#FFD866', '#F3D9DC', '#FFB3C7', '#CFE8FF'];
const LIMITE = 1000;

function colorDe(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i)) % 997;
  return COLORES_AVATAR[n % COLORES_AVATAR.length];
}

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets();
  const [autor, setAutor] = useState<{ nombre: string; id: string } | null>(null);
  const [contenido, setContenido] = useState('');
  const [imagen, setImagen] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [publicando, setPublicando] = useState(false);

  // Nombre y avatar de quien publica (solo decorativo; si falla, se muestra "Tú").
  useEffect(() => {
    (async () => {
      try {
        const { data: sesion } = await supabase.auth.getSession();
        const id = sesion.session?.user.id;
        if (!id) return;
        const { data } = await supabase.from('profiles').select('username, nombre_completo').eq('user_id', id).maybeSingle();
        const nombre = (data?.nombre_completo || data?.username || 'Tú').replace(/_[0-9a-f]{6,}$/i, '');
        setAutor({ nombre, id });
      } catch {
        /* sin nombre, no pasa nada */
      }
    })();
  }, []);

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

  const nombre = autor?.nombre ?? 'Tú';
  const puedePublicar = (contenido.trim().length > 0 || !!imagen) && !publicando;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Presionable onPress={() => router.back()} style={styles.botonCerrar} accessibilityLabel="Cerrar">
          <Ionicons name="close" size={22} color={colors.text} />
        </Presionable>
        <Text style={styles.headerTitulo}>Nueva publicación</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.autorFila}>
          <View style={[styles.avatar, { backgroundColor: autor ? colorDe(autor.id) : colors.primaryLight }]}>
            <Text style={styles.avatarLetra}>{nombre.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.autorNombre}>{nombre}</Text>
            <Text style={styles.autorSub}>Comparte con la comunidad</Text>
          </View>
        </View>

        <View style={styles.tarjetaTexto}>
          <TextInput
            style={styles.input}
            placeholder="¿Qué cocinaste hoy? Comparte tu receta o consejo..."
            placeholderTextColor="#A8959D"
            value={contenido}
            onChangeText={setContenido}
            multiline
            textAlignVertical="top"
            maxLength={LIMITE}
          />
          <Text style={styles.contador}>{contenido.length} / {LIMITE}</Text>
        </View>

        {imagen ? (
          <View>
            <Image source={{ uri: imagen.uri }} style={styles.previewImagen} />
            <TouchableOpacity style={styles.quitarImagen} onPress={() => setImagen(null)} accessibilityLabel="Quitar foto">
              <Ionicons name="close" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <Presionable onPress={elegirImagen} style={styles.zonaFoto} escalaAlPresionar={0.97}>
            <View style={styles.zonaFotoCirculo}>
              <Ionicons name="image-outline" size={28} color={colors.white} />
            </View>
            <Text style={styles.zonaFotoTitulo}>Agregar foto</Text>
            <Text style={styles.zonaFotoSub}>Una buena foto hace que se antojen</Text>
          </Presionable>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity
          style={[styles.botonPublicar, !puedePublicar && { opacity: 0.55 }]}
          onPress={publicar}
          disabled={publicando}
          activeOpacity={0.85}
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
    paddingHorizontal: 20,
    paddingBottom: spacing.sm,
  },
  botonCerrar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.text, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  headerTitulo: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.text },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, gap: 14 },
  autorFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarLetra: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  autorNombre: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
  autorSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  tarjetaTexto: {
    backgroundColor: colors.white, borderRadius: 28, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, minHeight: 150,
    shadowColor: colors.text, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  input: { flex: 1, minHeight: 100, fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: colors.text, padding: 0 },
  contador: { alignSelf: 'flex-end', fontFamily: fonts.body, fontSize: 12, color: '#A8959D', marginTop: 4 },
  zonaFoto: {
    height: 210, borderRadius: 28, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary,
    backgroundColor: '#FFEEF0', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  zonaFotoCirculo: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  zonaFotoTitulo: { fontFamily: fonts.heading, fontSize: 16, color: colors.primary },
  zonaFotoSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  previewImagen: { width: '100%', height: 260, borderRadius: 28, backgroundColor: colors.primaryLight },
  quitarImagen: {
    position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(43,18,32,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  footer: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.primaryLight, backgroundColor: colors.background },
  botonPublicar: {
    backgroundColor: colors.primary, borderRadius: 28, height: 56, justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  botonPublicarTexto: { fontFamily: fonts.heading, fontSize: 17, color: colors.white },
});