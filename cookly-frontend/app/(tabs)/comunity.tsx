import React, { memo, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography, shadow } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

const POR_PAGINA = 10;

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

/** Trae UNA página de posts. Los contadores vienen agregados (count) en vez de listas completas. */
async function traerPagina(desde: number): Promise<Post[]> {
  const { data: sesion } = await supabase.auth.getSession();
  const userId = sesion.session?.user.id;

  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(username, nombre_completo), likes(count), comments(count)')
    .order('created_at', { ascending: false })
    .range(desde, desde + POR_PAGINA - 1);

  if (error) throw error;
  const lista: any[] = data ?? [];

  // Solo pedimos MIS likes de los posts de esta página (una consulta pequeña).
  let propios = new Set<string>();
  if (userId && lista.length) {
    const { data: misLikes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', lista.map((p) => p.id));
    propios = new Set((misLikes ?? []).map((l: any) => l.post_id));
  }

  return lista.map((p) => {
    const { likes, comments, ...resto } = p;
    return {
      ...resto,
      likesCount: likes?.[0]?.count ?? 0,
      commentsCount: comments?.[0]?.count ?? 0,
      yaLeDiLike: propios.has(p.id),
    } as Post;
  });
}

// Tarjeta memoizada: al dar like solo se vuelve a dibujar ESA tarjeta, no toda la lista.
const PostCard = memo(function PostCard({
  item,
  onLike,
  onComentarios,
}: {
  item: Post;
  onLike: (post: Post) => void;
  onComentarios: (id: string) => void;
}) {
  return (
    <View style={[styles.postCard, shadow.card]}>
      <View style={styles.postHeader}>
        <View style={styles.avatarChico} />
        <View>
          <Text style={styles.autorNombre}>{item.profiles?.nombre_completo || item.profiles?.username || 'Usuario'}</Text>
          <Text style={styles.fecha}>{new Date(item.created_at).toLocaleDateString('es-PE')}</Text>
        </View>
      </View>

      {item.contenido ? <Text style={styles.contenido}>{item.contenido}</Text> : null}
      {item.imagen_url ? (
        <Image
          source={{ uri: item.imagen_url }}
          style={styles.imagenPost}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.accionesRow}>
        <TouchableOpacity style={styles.accionBoton} onPress={() => onLike(item)}>
          <Ionicons
            name={item.yaLeDiLike ? 'heart' : 'heart-outline'}
            size={20}
            color={item.yaLeDiLike ? colors.primary : colors.textMuted}
          />
          <Text style={styles.accionTexto}>{item.likesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.accionBoton} onPress={() => onComentarios(item.id)}>
          <Ionicons name="chatbubble-outline" size={19} color={colors.textMuted} />
          <Text style={styles.accionTexto}>{item.commentsCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function CommunityScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hayMas, setHayMas] = useState(true);
  const ocupado = useRef(false);

  /** Primera página. Si ya hay posts en pantalla se actualiza en silencio (sin spinner ni saltos). */
  const refrescar = useCallback(async (reemplazar: boolean) => {
    try {
      const primera = await traerPagina(0);
      setHayMas(primera.length === POR_PAGINA);
      setPosts((prev) => {
        if (reemplazar || prev.length === 0) return primera;
        const ids = new Set(primera.map((p) => p.id));
        return [...primera, ...prev.filter((p) => !ids.has(p.id))];
      });
    } catch (e: any) {
      console.log('ERROR AL CARGAR POSTS:', e?.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refrescar(false);
    }, [refrescar])
  );

  const cargarMas = useCallback(async () => {
    if (ocupado.current || !hayMas || cargando) return;
    ocupado.current = true;
    setCargandoMas(true);
    try {
      const siguiente = await traerPagina(posts.length);
      setHayMas(siguiente.length === POR_PAGINA);
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...siguiente.filter((p) => !ids.has(p.id))];
      });
    } catch (e: any) {
      console.log('ERROR AL CARGAR MÁS POSTS:', e?.message);
    } finally {
      ocupado.current = false;
      setCargandoMas(false);
    }
  }, [hayMas, cargando, posts.length]);

  // Like "optimista": la UI cambia al instante y la red trabaja detrás. Si falla, se revierte.
  const alternarLike = useCallback(async (post: Post) => {
    const { data: sesion } = await supabase.auth.getSession();
    const userId = sesion.session?.user.id;

    if (!userId) {
      router.push('/login');
      return;
    }

    const darLike = !post.yaLeDiLike;
    const aplicar = (like: boolean) =>
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, yaLeDiLike: like, likesCount: Math.max(0, p.likesCount + (like ? 1 : -1)) } : p
        )
      );

    aplicar(darLike);

    const { error } = darLike
      ? await supabase.from('likes').insert({ post_id: post.id, user_id: userId })
      : await supabase.from('likes').delete().match({ post_id: post.id, user_id: userId });

    if (error) aplicar(!darLike);
  }, []);

  const irAComentarios = useCallback((id: string) => router.push(`/comments/${id}`), []);

  const irACrearPost = useCallback(async () => {
    const { data: sesion } = await supabase.auth.getSession();
    if (!sesion.session) {
      router.push('/login');
      return;
    }
    router.push('/create-post');
  }, []);

  const renderPost = useCallback(
    ({ item }: { item: Post }) => <PostCard item={item} onLike={alternarLike} onComentarios={irAComentarios} />,
    [alternarLike, irAComentarios]
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
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews
        onEndReached={cargarMas}
        onEndReachedThreshold={0.5}
        ListFooterComponent={cargandoMas ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} /> : null}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => {
              setRefrescando(true);
              refrescar(true);
            }}
          />
        }
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