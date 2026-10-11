import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { colors, radius, spacing, typography, fonts } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import BotonReportarContenido from '../../components/BotonReportarContenido';
import BotonChat from '../../components/BotonChat';
import { Presionable } from '../../components/Animaciones';

const POR_PAGINA = 10;
const TAM_POPULARES = 40; // 'Populares' ordena por likes entre las últimas publicaciones
type Pestana = 'recientes' | 'populares' | 'mios';
const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: 'recientes', etiqueta: 'Recientes' },
  { clave: 'populares', etiqueta: 'Populares' },
  { clave: 'mios', etiqueta: 'Mis posts' },
];
const COLORES_AVATAR = [colors.accent, colors.magic, colors.primaryLight];

function tiempoRelativo(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Ayer';
  if (d < 7) return `Hace ${d} días`;
  return new Date(iso).toLocaleDateString('es-PE');
}

function colorDe(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i)) % 997;
  return COLORES_AVATAR[n % COLORES_AVATAR.length];
}

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

// Última página vista de cada pestaña: al volver a entrar (o al abrir la app) se muestra al instante
// y se actualiza por detrás, en vez de dejar al usuario mirando un spinner.
const cachePosts: Partial<Record<Pestana, Post[]>> = {};
const CLAVE_CACHE = 'cookly_comunidad_recientes_v1';

/** Trae UNA página de posts. Los contadores vienen agregados (count) y solo se piden las columnas necesarias. */
async function traerPagina(desde: number, pestana: Pestana): Promise<Post[]> {
  let userId: string | undefined;
  if (pestana === 'mios') {
    const { data: sesion } = await supabase.auth.getSession();
    userId = sesion.session?.user.id;
    if (!userId) return [];
  }

  let consulta = supabase
    .from('posts')
    .select(
      'id, contenido, imagen_url, created_at, user_id, profiles!posts_user_id_fkey(username, nombre_completo), likes(count), comments(count)'
    );
  if (pestana === 'mios') consulta = consulta.eq('user_id', userId as string);
  const tamano = pestana === 'populares' ? TAM_POPULARES : POR_PAGINA;
  const { data, error } = await consulta
    .order('created_at', { ascending: false })
    .range(desde, desde + tamano - 1);

  if (error) throw error;
  const lista: any[] = data ?? [];

  const posts = lista.map((p) => {
    const { likes, comments, ...resto } = p;
    return {
      ...resto,
      likesCount: likes?.[0]?.count ?? 0,
      commentsCount: comments?.[0]?.count ?? 0,
      yaLeDiLike: false, // se completa enseguida con misLikesDe(), sin hacer esperar a la lista
    } as Post;
  });
  if (pestana === 'populares') posts.sort((a, b) => b.likesCount - a.likesCount || (a.created_at < b.created_at ? 1 : -1));

  // Las fotos de las primeras tarjetas se descargan desde ya.
  posts.slice(0, 4).forEach((p) => {
    if (p.imagen_url) Image.prefetch(p.imagen_url).catch(() => {});
  });
  return posts;
}

/** Cuáles de estos posts ya tienen MI like (consulta pequeña que corre después de mostrar la lista). */
async function misLikesDe(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data: sesion } = await supabase.auth.getSession();
  const userId = sesion.session?.user.id;
  if (!userId) return new Set();
  const { data } = await supabase.from('likes').select('post_id').eq('user_id', userId).in('post_id', ids);
  return new Set((data ?? []).map((l: any) => l.post_id as string));
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
  // El usuario puede traer un sufijo automático (ej. mell_df337297): se quita para que se vea limpio.
  const nombre = (item.profiles?.nombre_completo || item.profiles?.username || 'Usuario').replace(/_[0-9a-f]{6,}$/i, '');
  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={[styles.avatar, { backgroundColor: colorDe(item.user_id) }]}>
          <Text style={styles.avatarLetra}>{nombre.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.autorNombre} numberOfLines={1}>{nombre}</Text>
          <Text style={styles.fecha}>{tiempoRelativo(item.created_at)}</Text>
        </View>
        <BotonReportarContenido tipo="POST" contenidoId={item.id} circulo tamano={18} />
      </View>

      {item.imagen_url ? (
        <Image source={{ uri: item.imagen_url }} style={styles.imagenPost} resizeMode="cover" />
      ) : null}

      {item.contenido ? <Text style={styles.contenido}>{item.contenido}</Text> : null}

      <View style={styles.accionesRow}>
        <TouchableOpacity
          style={[styles.pastilla, item.yaLeDiLike && styles.pastillaLike]}
          onPress={() => onLike(item)}
          hitSlop={6}
        >
          <Ionicons
            name={item.yaLeDiLike ? 'heart' : 'heart-outline'}
            size={18}
            color={item.yaLeDiLike ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.accionTexto, item.yaLeDiLike && { color: colors.primary }]}>{item.likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.pastilla} onPress={() => onComentarios(item.id)} hitSlop={6}>
          <Ionicons name="chatbubble-outline" size={17} color={colors.textMuted} />
          <Text style={styles.accionTexto}>{item.commentsCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function CommunityScreen() {
  const [posts, setPosts] = useState<Post[]>(cachePosts.recientes ?? []);
  const [cargando, setCargando] = useState(!(cachePosts.recientes && cachePosts.recientes.length));
  const [refrescando, setRefrescando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hayMas, setHayMas] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('recientes');
  const pestanaRef = useRef<Pestana>('recientes');

  const ocupado = useRef(false);
  const totalPostsRef = useRef(0);
  totalPostsRef.current = posts.length;

  /** Primera página. Si ya hay posts en pantalla se actualiza en silencio (sin spinner ni saltos). */
  const refrescar = useCallback(async (reemplazar: boolean) => {
    try {
      const modo = pestanaRef.current;
      const primera = await traerPagina(0, modo);
      if (modo !== pestanaRef.current) return; // el usuario cambió de pestaña mientras cargaba
      setError(null);
      setHayMas(modo !== 'populares' && primera.length === POR_PAGINA);
      setPosts((prev) => {
        // Se conserva MI like de lo que ya estaba en pantalla mientras llega la consulta de likes.
        const mios = new Set(prev.filter((p) => p.yaLeDiLike).map((p) => p.id));
        const nueva = primera.map((p) => (mios.has(p.id) ? { ...p, yaLeDiLike: true } : p));
        if (reemplazar || prev.length === 0 || modo === 'populares') return nueva;
        const ids = new Set(nueva.map((p) => p.id));
        return [...nueva, ...prev.filter((p) => !ids.has(p.id))];
      });
      // Segunda fase: marca los corazones propios sin haber hecho esperar a la lista.
      misLikesDe(primera.map((p) => p.id))
        .then((mios) => {
          if (modo !== pestanaRef.current) return;
          setPosts((prev) => prev.map((p) => (mios.has(p.id) && !p.yaLeDiLike ? { ...p, yaLeDiLike: true } : p)));
        })
        .catch(() => {});
      if (modo === 'recientes') {
        cachePosts.recientes = primera;
        AsyncStorage.setItem(CLAVE_CACHE, JSON.stringify(primera)).catch(() => {});
      }
    } catch (e: any) {
      console.log('ERROR AL CARGAR POSTS:', e?.message);
      setError('No se pudieron cargar las publicaciones.');
      setHayMas(false); // evita que la lista vacía vuelva a pedir "más" en bucle
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  // Al abrir la app: si no hay nada en memoria, se muestra lo último guardado en el celular (al instante).
  useEffect(() => {
    if (cachePosts.recientes?.length) return;
    AsyncStorage.getItem(CLAVE_CACHE)
      .then((txt) => {
        if (!txt || pestanaRef.current !== 'recientes') return;
        const guardados: Post[] = JSON.parse(txt);
        if (!Array.isArray(guardados) || guardados.length === 0) return;
        setPosts((prev) => {
          if (prev.length > 0) return prev; // ya llegó la información fresca
          cachePosts.recientes = guardados;
          setCargando(false);
          return guardados;
        });
      })
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      refrescar(false);
    }, [refrescar])
  );

  const cargarMas = useCallback(async () => {
    // No pedir más si: ya hay una carga en curso, no hay más, hubo error o la lista está vacía.
    if (ocupado.current || !hayMas || cargando || error || totalPostsRef.current === 0) return;
    ocupado.current = true;
    setCargandoMas(true);
    try {
      const modo = pestanaRef.current;
      const siguiente = await traerPagina(totalPostsRef.current, modo);
      if (modo !== pestanaRef.current) return;
      setHayMas(siguiente.length === POR_PAGINA);
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...siguiente.filter((p) => !ids.has(p.id))];
      });
      misLikesDe(siguiente.map((p) => p.id))
        .then((mios) => setPosts((prev) => prev.map((p) => (mios.has(p.id) && !p.yaLeDiLike ? { ...p, yaLeDiLike: true } : p))))
        .catch(() => {});
    } catch (e: any) {
      console.log('ERROR AL CARGAR MÁS POSTS:', e?.message);
      setHayMas(false); // se reactiva al hacer "tirar para refrescar"
    } finally {
      ocupado.current = false;
      setCargandoMas(false);
    }
  }, [hayMas, cargando, error]);

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
          p.id === post.id
            ? { ...p, yaLeDiLike: like, likesCount: Math.max(0, p.likesCount + (like ? 1 : -1)) }
            : p
        )
      );

    aplicar(darLike);

    const { error: errorLike } = darLike
      ? await supabase.from('likes').insert({ post_id: post.id, user_id: userId })
      : await supabase.from('likes').delete().match({ post_id: post.id, user_id: userId });

    if (errorLike) aplicar(!darLike);
  }, []);

  const cambiarPestana = useCallback((nueva: Pestana) => {
    if (nueva === pestanaRef.current) return;
    pestanaRef.current = nueva;
    setPestana(nueva);
    setPosts([]);
    setError(null);
    setHayMas(true);
    setCargando(true);
    refrescar(true);
  }, [refrescar]);

  const irAComentarios = useCallback((id: string) => router.push(`/comments/${id}`), []);

  const irACrearPost = useCallback(async () => {
    const { data: sesion } = await supabase.auth.getSession();
    if (!sesion.session) {
      router.push('/login');
      return;
    }
    router.push('/create-post');
  }, []);

  const reintentar = useCallback(() => {
    setCargando(true);
    setError(null);
    refrescar(true);
  }, [refrescar]);

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard item={item} onLike={alternarLike} onComentarios={irAComentarios} />
    ),
    [alternarLike, irAComentarios]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.encabezado}>
        <Text style={styles.kicker}>Cocina junto a otros</Text>
        <Text style={styles.headerTitulo}>Comunidad</Text>
      </View>

      <View style={styles.pestanas}>
        {PESTANAS.map(({ clave, etiqueta }) => {
          const activa = pestana === clave;
          return (
            <TouchableOpacity
              key={clave}
              style={[styles.pestana, activa && styles.pestanaActiva]}
              onPress={() => cambiarPestana(clave)}
            >
              <Text style={[styles.pestanaTexto, activa && styles.pestanaTextoActivo]}>{etiqueta}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs, gap: spacing.md, paddingBottom: 190 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews
        onEndReached={cargarMas}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          cargandoMas ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : null
        }
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
            {cargando ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : error ? (
              <>
                <Text style={styles.vacioTexto}>{error}</Text>
                <TouchableOpacity style={styles.botonReintentar} onPress={reintentar}>
                  <Text style={styles.botonReintentarTexto}>Reintentar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.vacioTexto}>
                {pestana === 'mios'
                  ? 'Todavía no has publicado nada. Toca + para compartir tu primer plato.'
                  : 'Aún no hay publicaciones. ¡Sé la primera en compartir algo!'}
              </Text>
            )}
          </View>
        }
      />

      <View style={styles.fabContenedor}>
        <Presionable style={styles.fab} onPress={irACrearPost} accessibilityLabel="Crear publicación">
          <Ionicons name="add" size={30} color={colors.white} />
        </Presionable>
      </View>
      <BotonChat />
    </View>
  );
}

const styles = StyleSheet.create({
  encabezado: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  kicker: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  headerTitulo: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.text },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  vacioTexto: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  botonReintentar: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  botonReintentarTexto: { ...typography.body, color: colors.white, fontWeight: '600' },
  postCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarLetra: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  autorNombre: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
  fecha: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  contenido: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text, marginTop: 12 },
  imagenPost: {
    width: '100%',
    height: 180,
    borderRadius: 22,
    backgroundColor: colors.border,
  },
  accionesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  pastilla: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14,
    borderRadius: 999, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  pastillaLike: { backgroundColor: '#FFE3EB', borderColor: '#FFE3EB' },
  pestanas: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, marginBottom: spacing.xs },
  pestana: { paddingHorizontal: 16, height: 38, borderRadius: 999, backgroundColor: colors.primaryLight, justifyContent: 'center' },
  pestanaActiva: { backgroundColor: colors.primary },
  pestanaTexto: { fontFamily: fonts.heading, fontSize: 13, lineHeight: 18, color: colors.text },
  pestanaTextoActivo: { color: colors.white },
  accionTexto: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted },
  fabContenedor: { position: 'absolute', right: 20, bottom: 96 },
  fab: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', elevation: 6,
    shadowColor: colors.text, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
});