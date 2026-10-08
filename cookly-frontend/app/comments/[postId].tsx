import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import BotonReportarContenido from '../../components/BotonReportarContenido';

type Comentario = {
  id: string;
  contenido: string;
  parent_comment_id: string | null;
  profiles: { username: string; nombre_completo: string | null } | null;
  likesCount: number;
  yaLeDiLike: boolean;
  respuestas: Comentario[];
};

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [respondiendoA, setRespondiendoA] = useState<{ id: string; nombre: string } | null>(null);

  const cargarComentarios = async () => {
    const { data: sesion } = await supabase.auth.getSession();
    const userId = sesion.session?.user.id;

    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(username, nombre_completo), comment_likes(user_id)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      setCargando(false);
      return;
    }

    const procesados: Comentario[] = (data || []).map((c: any) => ({
      ...c,
      likesCount: c.comment_likes?.length || 0,
      yaLeDiLike: userId ? c.comment_likes?.some((l: any) => l.user_id === userId) : false,
      respuestas: [],
    }));

    const principales = procesados.filter((c) => !c.parent_comment_id);
    const respuestas = procesados.filter((c) => c.parent_comment_id);
    principales.forEach((p) => {
      p.respuestas = respuestas.filter((r) => r.parent_comment_id === p.id);
    });

    setComentarios(principales);
    setCargando(false);
  };

  useFocusEffect(
    useCallback(() => {
      cargarComentarios();
    }, [postId])
  );

  const enviarComentario = async () => {
    if (!texto.trim()) return;
    const { data: sesion } = await supabase.auth.getSession();
    const userId = sesion.session?.user.id;
    if (!userId) {
      router.push('/login');
      return;
    }

    setEnviando(true);
    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: userId,
      contenido: texto.trim(),
      parent_comment_id: respondiendoA?.id || null,
    });
    setEnviando(false);

    if (!error) {
      setTexto('');
      setRespondiendoA(null);
      cargarComentarios();
    }
  };

  const alternarLikeComentario = async (comentario: Comentario) => {
    const { data: sesion } = await supabase.auth.getSession();
    const userId = sesion.session?.user.id;
    if (!userId) {
      router.push('/login');
      return;
    }

    if (comentario.yaLeDiLike) {
      await supabase.from('comment_likes').delete().match({ comment_id: comentario.id, user_id: userId });
    } else {
      await supabase.from('comment_likes').insert({ comment_id: comentario.id, user_id: userId });
    }
    cargarComentarios();
  };

  const iniciarRespuesta = async (comentario: Comentario) => {
    const { data: sesion } = await supabase.auth.getSession();
    if (!sesion.session) {
      router.push('/login');
      return;
    }
    setRespondiendoA({ id: comentario.id, nombre: comentario.profiles?.nombre_completo || comentario.profiles?.username || 'Usuario' });
  };

  const renderComentario = (item: Comentario, esRespuesta: boolean = false) => (
    <View style={[styles.comentarioCard, esRespuesta && styles.respuestaCard]} key={item.id}>
      <Text style={styles.autorNombre}>{item.profiles?.nombre_completo || item.profiles?.username || 'Usuario'}</Text>
      <Text style={styles.comentarioTexto}>{item.contenido}</Text>

      <View style={styles.accionesRow}>
        <TouchableOpacity style={styles.accionBoton} onPress={() => alternarLikeComentario(item)}>
          <Ionicons name={item.yaLeDiLike ? 'heart' : 'heart-outline'} size={16} color={item.yaLeDiLike ? colors.primary : colors.textMuted} />
          <Text style={styles.accionTexto}>{item.likesCount}</Text>
        </TouchableOpacity>
        {!esRespuesta && (
          <TouchableOpacity onPress={() => iniciarRespuesta(item)}>
            <Text style={styles.responderTexto}>Responder</Text>
          </TouchableOpacity>
        )}
      </View>

      {item.respuestas?.map((r) => renderComentario(r, true))}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Comentarios</Text>
        <View style={{ width: 24 }} />
      </View>

      {cargando ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={comentarios}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          renderItem={({ item }) => renderComentario(item)}
          ListEmptyComponent={<Text style={styles.vacioTexto}>Sé la primera en comentar 💬</Text>}
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

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={respondiendoA ? 'Escribe tu respuesta...' : 'Escribe un comentario...'}
          placeholderTextColor={colors.textMuted}
          value={texto}
          onChangeText={setTexto}
        />
        <TouchableOpacity style={styles.enviarBoton} onPress={enviarComentario} disabled={enviando}>
          <Ionicons name="send" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitulo: { ...typography.h3, color: colors.text },
  comentarioCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm + 4, gap: spacing.xs },
  respuestaCard: { marginLeft: 20, marginTop: spacing.xs, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  autorNombre: { ...typography.bodySmall, fontWeight: '600', color: colors.text },
  comentarioTexto: { ...typography.body, color: colors.text },
  accionesRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  accionBoton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  accionTexto: { ...typography.caption, color: colors.textMuted },
  responderTexto: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  vacioTexto: { textAlign: 'center', color: colors.textMuted, marginTop: 30, ...typography.body },
  respondiendoBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  respondiendoTexto: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm + 4, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.md, height: 44, ...typography.bodySmall, color: colors.text },
  enviarBoton: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center' },
});