import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Presionable } from '../../components/Animaciones';
import { colors, fonts, spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

type Comentario = {
  id: string;
  contenido: string;
  parent_comment_id: string | null;
  profiles: { username: string; nombre_completo: string | null } | null;
  likesCount: number;
  yaLeDiLike: boolean;
  respuestas: Comentario[];
  user_id: string;
  created_at?: string;
};

const COLORES_AVATAR = ['#BEE3A5', '#FFD866', '#F3D9DC', '#FFB3C7', '#CFE8FF'];

function colorDe(id: string) {
  let n = 0;
  for (let i = 0; i < (id || '').length; i++) n = (n + id.charCodeAt(i)) % 997;
  return COLORES_AVATAR[n % COLORES_AVATAR.length];
}

function nombreDe(c: Comentario) {
  return (c.profiles?.nombre_completo || c.profiles?.username || 'Usuario').replace(/_[0-9a-f]{6,}$/i, '');
}

function tiempoRelativo(iso?: string) {
  if (!iso) return '';
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-PE');
}

export default function CommentsScreen() {
  const insets = useSafeAreaInsets();
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set()); // comentarios con respuestas desplegadas
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondiendoA, setRespondiendoA] = useState<{ id: string; nombre: string } | null>(null);

  const cargarComentarios = useCallback(async () => {
    const { data: sesion } = await supabase.auth.getSession();
    const userId = sesion.session?.user.id;

    const { data, error: errorCarga } = await supabase
      .from('comments')
      .select(
        '*, profiles!comments_user_id_fkey(username, nombre_completo), comment_likes(user_id)'
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (errorCarga) {
      console.log('ERROR AL CARGAR COMENTARIOS:', errorCarga.message);
      setError('No se pudieron cargar los comentarios.');
      setCargando(false);
      return;
    }

    setError(null);

    const procesados: Comentario[] = (data || []).map((c: any) => ({
      ...c,
      likesCount: c.comment_likes?.length || 0,
      yaLeDiLike: userId ? !!c.comment_likes?.some((l: any) => l.user_id === userId) : false,
      respuestas: [],
    }));

    const principales = procesados.filter((c) => !c.parent_comment_id);
    const respuestas = procesados.filter((c) => c.parent_comment_id);
    principales.forEach((p) => {
      p.respuestas = respuestas.filter((r) => r.parent_comment_id === p.id);
    });

    setComentarios(principales);
    setCargando(false);
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      cargarComentarios();
    }, [cargarComentarios])
  );

  const enviarComentario = async () => {
    if (!texto.trim() || enviando) return;
    const { data: sesion } = await supabase.auth.getSession();
    const userId = sesion.session?.user.id;
    if (!userId) {
      router.push('/login');
      return;
    }

    setEnviando(true);
    const { error: errorEnvio } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: userId,
      contenido: texto.trim(),
      parent_comment_id: respondiendoA?.id || null,
    });
    setEnviando(false);

    if (errorEnvio) {
      console.log('ERROR AL COMENTAR:', errorEnvio.message);
      Alert.alert('No se pudo comentar', 'Inténtalo de nuevo en unos segundos.');
      return;
    }

    if (respondiendoA) setAbiertos((prev) => new Set(prev).add(respondiendoA.id)); // que se vea la respuesta recién enviada
    setTexto('');
    setRespondiendoA(null);
    cargarComentarios();
  };

  const alternarLikeComentario = async (comentario: Comentario) => {
    const { data: sesion } = await supabase.auth.getSession();
    const userId = sesion.session?.user.id;
    if (!userId) {
      router.push('/login');
      return;
    }

    const { error: errorLike } = comentario.yaLeDiLike
      ? await supabase
          .from('comment_likes')
          .delete()
          .match({ comment_id: comentario.id, user_id: userId })
      : await supabase
          .from('comment_likes')
          .insert({ comment_id: comentario.id, user_id: userId });

    if (errorLike) {
      console.log('ERROR EN LIKE DE COMENTARIO:', errorLike.message);
      return;
    }
    cargarComentarios();
  };

  const iniciarRespuesta = async (comentario: Comentario) => {
    const { data: sesion } = await supabase.auth.getSession();
    if (!sesion.session) {
      router.push('/login');
      return;
    }
    setRespondiendoA({
      id: comentario.id,
      nombre: comentario.profiles?.nombre_completo || comentario.profiles?.username || 'Usuario',
    });
  };

  const alternarRespuestas = (id: string) =>
    setAbiertos((prev) => {
      const sig = new Set(prev);
      if (sig.has(id)) sig.delete(id);
      else sig.add(id);
      return sig;
    });

  const totalComentarios = comentarios.reduce((n, c) => n + 1 + (c.respuestas?.length || 0), 0);

  const renderTarjeta = (item: Comentario, esRespuesta: boolean) => {
    const nombre = nombreDe(item);
    return (
      <View style={[styles.tarjeta, esRespuesta && styles.tarjetaRespuesta]}>
        <View style={styles.autorFila}>
          <View style={[styles.avatar, esRespuesta && styles.avatarChico, { backgroundColor: colorDe(item.user_id) }]}>
            <Text style={[styles.avatarLetra, esRespuesta && { fontSize: 14 }]}>{nombre.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.autorNombre} numberOfLines={1}>{nombre}</Text>
            {item.created_at ? <Text style={styles.hora}>{tiempoRelativo(item.created_at)}</Text> : null}
          </View>
        </View>
        <Text style={styles.comentarioTexto}>{item.contenido}</Text>
        <View style={styles.accionesRow}>
          <TouchableOpacity
            style={[styles.pastillaLike, item.yaLeDiLike && styles.pastillaLikeActiva]}
            onPress={() => alternarLikeComentario(item)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={item.yaLeDiLike ? 'heart' : 'heart-outline'}
              size={16}
              color={item.yaLeDiLike ? colors.primary : colors.text}
            />
            <Text style={[styles.pastillaLikeTexto, item.yaLeDiLike && { color: colors.primary }]}>{item.likesCount}</Text>
          </TouchableOpacity>
          {!esRespuesta && (
            <TouchableOpacity onPress={() => iniciarRespuesta(item)} style={styles.responderBoton}>
              <Text style={styles.responderTexto}>Responder</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderComentario = (item: Comentario) => {
    const n = item.respuestas?.length || 0;
    const abierto = abiertos.has(item.id);
    return (
      <View style={{ gap: 8 }}>
        {renderTarjeta(item, false)}
        {n > 0 && (
          <TouchableOpacity style={styles.verRespuestas} onPress={() => alternarRespuestas(item.id)} activeOpacity={0.7}>
            <View style={styles.verRespuestasLinea} />
            <Text style={styles.verRespuestasTexto}>
              {abierto ? 'Ocultar respuestas' : n === 1 ? 'Ver 1 respuesta' : `Ver ${n} respuestas`}
            </Text>
            <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        {abierto && n > 0 && (
          <View style={styles.respuestasBloque}>
            {item.respuestas.map((r) => (
              <View key={r.id}>{renderTarjeta(r, true)}</View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Presionable onPress={() => router.back()} style={styles.botonVolver} accessibilityLabel="Volver">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Presionable>
        <Text style={styles.headerTitulo}>Comentarios</Text>
        {totalComentarios > 0 ? (
          <View style={styles.contador}>
            <Text style={styles.contadorTexto}>{totalComentarios}</Text>
          </View>
        ) : null}
      </View>

      {cargando ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={comentarios}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => renderComentario(item)}
          ListEmptyComponent={
            error ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.vacioTexto}>{error}</Text>
                <TouchableOpacity
                  style={styles.botonReintentar}
                  onPress={() => {
                    setCargando(true);
                    cargarComentarios();
                  }}
                >
                  <Text style={styles.botonReintentarTexto}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.vacioTexto}>Aún no hay comentarios. Sé la primera en opinar.</Text>
            )
          }
        />
      )}

      {respondiendoA && (
        <View style={styles.respondiendoBar}>
          <Text style={styles.respondiendoTexto}>Respondiendo a {respondiendoA.nombre}</Text>
          <TouchableOpacity onPress={() => setRespondiendoA(null)}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 12 }]}>
        <TextInput
          style={styles.input}
          placeholder={respondiendoA ? 'Escribe tu respuesta...' : 'Escribe un comentario...'}
          placeholderTextColor="#A8959D"
          value={texto}
          onChangeText={setTexto}
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.enviarBoton, (enviando || !texto.trim()) && { opacity: 0.55 }]}
          onPress={enviarComentario}
          disabled={enviando}
          activeOpacity={0.85}
        >
          <Ionicons name="send" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const SOMBRA = { shadowColor: colors.text, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 } as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: spacing.sm },
  botonVolver: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.text, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  headerTitulo: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.text },
  contador: { marginLeft: 'auto', backgroundColor: '#FFE3EB', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  contadorTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.primary },
  tarjeta: { backgroundColor: colors.white, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 14, ...SOMBRA },
  tarjetaRespuesta: { borderRadius: 22, paddingHorizontal: 14, paddingVertical: 12 },
  autorFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarChico: { width: 32, height: 32, borderRadius: 16 },
  avatarLetra: { fontFamily: fonts.display, fontSize: 17, color: colors.text },
  autorNombre: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  hora: { fontFamily: fonts.body, fontSize: 12, color: '#A8959D' },
  comentarioTexto: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.text, marginTop: 10 },
  accionesRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  pastillaLike: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background, borderWidth: 1.5,
    borderColor: colors.primaryLight, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5,
  },
  pastillaLikeActiva: { backgroundColor: '#FFE3EB', borderColor: '#FFE3EB' },
  pastillaLikeTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.text },
  responderBoton: { paddingHorizontal: 8, paddingVertical: 6 },
  responderTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.primary },
  verRespuestas: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 28, paddingVertical: 2 },
  verRespuestasLinea: { width: 24, height: 2, borderRadius: 1, backgroundColor: colors.primaryLight },
  verRespuestasTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.textMuted },
  respuestasBloque: { marginLeft: 28, paddingLeft: 14, borderLeftWidth: 3, borderLeftColor: colors.primaryLight, gap: 8 },
  vacioTexto: { textAlign: 'center', color: colors.textMuted, marginTop: 30, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  botonReintentar: { marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 12, paddingHorizontal: spacing.lg },
  botonReintentarTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.white },
  respondiendoBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: spacing.sm, backgroundColor: '#FFEEF0',
  },
  respondiendoTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, gap: 10,
    borderTopWidth: 1, borderTopColor: colors.primaryLight, backgroundColor: colors.background,
  },
  input: {
    flex: 1, height: 52, backgroundColor: colors.white, borderRadius: 26, paddingHorizontal: 20,
    fontFamily: fonts.body, fontSize: 16, color: colors.text,
    shadowColor: colors.text, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  enviarBoton: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
});