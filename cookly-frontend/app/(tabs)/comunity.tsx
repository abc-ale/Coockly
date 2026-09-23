import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography, shadow } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

type Post = {
  id: string;
  contenido: string;
  imagen_url: string | null;
  created_at: string;
  user_id: string;
  profiles: { username: string; nombre_completo: string | null } | null;
  likesCount: number;
  yaLeDiLike: boolean;
  commentsCount: number;
};

export default function CommunityScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargarPosts = async () => {
    const { data: sesion } = await supabase.auth.getSession();
    const userId = sesion.session?.user.id;

    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(username, nombre_completo), likes(user_id), comments(id)')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('ERROR AL CARGAR POSTS:', error.message);
      setCargando(false);
      setRefrescando(false);
      return;
    }

    const procesados = (data || []).map((post: any) => ({
      ...post,
      likesCount: post.likes?.length || 0,
      yaLeDiLike: userId ? post.likes?.some((l: any) => l.user_id === userId) : false,
      commentsCount: post.comments?.length || 0,
    }));

    setPosts(procesados);
    setCargando(false);
    setRefrescando(false);
  };

  useFocusEffect(
    useCallback(() => {
      cargarPosts();
    }, [])
  );

  const alternarLike = async (post: Post) => {
    const { data: sesion } = await supabase.auth.getSession();
    const userId = sesion.session?.user.id;

    if (!userId) {
      router.push('/login');
      return;
    }

    if (post.yaLeDiLike) {
      await supabase.from('likes').delete().match({ post_id: post.id, user_id: userId });
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: userId });
    }
    cargarPosts();
  };

  const irACrearPost = async () => {
    const { data: sesion } = await supabase.auth.getSession();
    if (!sesion.session) {
      router.push('/login');
      return;
    }
    router.push('/create-post');
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={[styles.postCard, shadow.card]}>
      <View style={styles.postHeader}>
        <View style={styles.avatarChico} />
        <View>
          <Text style={styles.autorNombre}>{item.profiles?.nombre_completo || item.profiles?.username || 'Usuario'}</Text>
          <Text style={styles.fecha}>{new Date(item.created_at).toLocaleDateString('es-PE')}</Text>
        </View>
      </View>

      {item.contenido && <Text style={styles.contenido}>{item.contenido}</Text>}
      {item.imagen_url && <Image source={{ uri: item.imagen_url }} style={styles.imagenPost} />}

      <View style={styles.accionesRow}>
        <TouchableOpacity style={styles.accionBoton} onPress={() => alternarLike(item)}>
          <Ionicons name={item.yaLeDiLike ? 'heart' : 'heart-outline'} size={20} color={item.yaLeDiLike ? colors.primary : colors.textMuted} />
          <Text style={styles.accionTexto}>{item.likesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.accionBoton} onPress={() => router.push(`/comments/${item.id}`)}>
          <Ionicons name="chatbubble-outline" size={19} color={colors.textMuted} />
          <Text style={styles.accionTexto}>{item.commentsCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Text style={styles.headerTitulo}>Comunidad</Text>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargarPosts(); }} />}
        ListEmptyComponent={
          <View style={styles.centrado}>
            <Text style={styles.vacioTexto}>Aún no hay publicaciones. ¡Sé la primera en compartir algo! 🍳</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={irACrearPost}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitulo: { ...typography.h1, color: colors.text, paddingHorizontal: spacing.md, paddingTop: spacing.lg, marginBottom: spacing.sm },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  vacioTexto: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  postCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatarChico: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primary },
  autorNombre: { ...typography.h3, color: colors.text },
  fecha: { ...typography.caption, color: colors.textMuted },
  contenido: { ...typography.body, color: colors.text, marginBottom: spacing.sm },
  imagenPost: { width: '100%', height: 220, borderRadius: radius.md, marginBottom: spacing.xs, backgroundColor: colors.border },
  accionesRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  accionBoton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  accionTexto: { ...typography.bodySmall, color: colors.textMuted },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
});