// app/resenas/[id].tsx
// "Reseñas y comentarios" de una receta: resumen con promedio, calificar, reseñas de otras personas y comentarios.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Aparecer, Presionable } from '../../components/Animaciones';
import ResenaFinal from '../../components/ResenaFinal';
import { mostrarAviso } from '../../components/Aviso';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { seleccion, toque } from '../../lib/vibracion';

type Resena = { id: number; puntuacion: number; comentario: string | null; creadoEn?: string; usuario: { nombre: string; correo: string } };
type Comentario = { id: number; contenido: string; creadoEn?: string; usuario: { nombre: string; correo: string } };

const ORO = '#FFB400';
const COLORES_AVATAR = [colors.magic, colors.accent, colors.primaryLight, '#FFC2D3'];

/** "ahora", "hace 5 min", "hace 2 h", "hace 3 días" o la fecha. */
function hace(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias < 30) return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Estrellas({ valor, tam = 14 }: { valor: number; tam?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name="star" size={tam} color={valor >= n - 0.25 ? ORO : 'rgba(43,18,32,0.14)'} />
      ))}
    </View>
  );
}

function Avatar({ nombre, indice }: { nombre: string; indice: number }) {
  const inicial = (nombre || '?').trim().charAt(0).toUpperCase();
  return (
    <View style={[st.avatar, { backgroundColor: COLORES_AVATAR[indice % COLORES_AVATAR.length] }]}>
      <Text style={st.avatarTexto}>{inicial}</Text>
    </View>
  );
}

export default function ResenasScreen() {
  const { id, nombre: nombreParam } = useLocalSearchParams<{ id: string; nombre?: string }>();
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();

  const [nombre, setNombre] = useState(nombreParam ?? '');
  const [imagen, setImagen] = useState<string | null>(null);
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [promedio, setPromedio] = useState(0);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [verTodas, setVerTodas] = useState(false);
  const [nuevo, setNuevo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [estrellaElegida, setEstrellaElegida] = useState(0);

  const miResena = resenas.find((r) => r.usuario.correo === usuario?.correo);

  const cargar = useCallback(async () => {
    try {
      const [r, c, img] = await Promise.all([
        api.get(`/recetas/${id}/resenas`),
        api.get(`/recetas/${id}/comentarios`),
        api.get(`/imagenes/receta/${id}`).catch(() => ({ data: [] as any[] })),
      ]);
      setResenas(r.data?.resenas ?? []);
      setPromedio(r.data?.promedio ?? 0);
      setComentarios(c.data ?? []);
      setImagen(img.data?.[0]?.url ?? null);
      setFallo(false);
      if (!nombreParam) {
        const rec = await api.get(`/recetas/${id}`).catch(() => null);
        if (rec?.data?.nombre) setNombre(rec.data.nombre);
      }
    } catch {
      setFallo(true);
    } finally {
      setCargando(false);
    }
  }, [id, nombreParam]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function enviarComentario() {
    const texto = nuevo.trim();
    if (!texto || enviando) return;
    setEnviando(true);
    try {
      await api.post(`/recetas/${id}/comentarios`, { contenido: texto });
      setNuevo('');
      const { data } = await api.get(`/recetas/${id}/comentarios`);
      setComentarios(data);
      mostrarAviso('Comentario publicado');
    } catch (error: any) {
      Alert.alert('No se pudo publicar', error?.response?.data?.mensaje || 'No pudimos publicar tu comentario. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  async function eliminarComentario(comentarioId: number) {
    try {
      await api.delete(`/recetas/${id}/comentarios/${comentarioId}`);
      setComentarios((prev) => prev.filter((c) => c.id !== comentarioId));
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo eliminar el comentario.');
    }
  }

  function abrirResena(estrellas = 0) {
    toque();
    setEstrellaElegida(estrellas);
    setEscribiendo(true);
  }

  const total = resenas.length;
  const visibles = verTodas ? resenas : resenas.slice(0, 3);
  const miNota = miResena?.puntuacion ?? 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Math.max(insets.top, 12) + 8, paddingHorizontal: 20, paddingBottom: 110 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado */}
        <View style={st.cabecera}>
          <Pressable style={st.atras} onPress={() => router.back()} accessibilityLabel="Volver">
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={st.nombreReceta} numberOfLines={1}>{nombre}</Text>
        </View>
        <Text style={st.titulo}>Reseñas y comentarios</Text>

        {cargando ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : fallo ? (
          <View style={st.fallo}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.primary} />
            <Text style={st.falloTexto}>No pudimos cargar las reseñas. Revisa tu conexión.</Text>
            <Pressable style={st.reintentar} onPress={() => { setCargando(true); cargar(); }}>
              <Text style={st.reintentarTexto}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Resumen */}
            <Aparecer distancia={14}>
              <View style={st.resumen}>
                {total === 0 ? (
                  <View style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
                    <Ionicons name="star-outline" size={30} color={colors.primary} />
                    <Text style={st.sinResenas}>Todavía no hay reseñas.{'\n'}¡Sé la primera persona en calificar!</Text>
                  </View>
                ) : (
                  <>
                    <View style={st.promedioCaja}>
                      <Text style={st.promedioNumero}>{promedio.toFixed(1)}</Text>
                      <Estrellas valor={promedio} tam={14} />
                      <Text style={st.promedioTotal}>{total} {total === 1 ? 'reseña' : 'reseñas'}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 7 }}>
                      {[5, 4, 3, 2, 1].map((n) => {
                        const cuantas = resenas.filter((r) => r.puntuacion === n).length;
                        return (
                          <View key={n} style={st.barraFila}>
                            <Text style={st.barraNumero}>{n}</Text>
                            <View style={st.barraFondo}>
                              <View style={[st.barraRelleno, { width: `${(cuantas / total) * 100}%` }]} />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>
            </Aparecer>

            {/* Calificar */}
            <Aparecer distancia={14} delay={60}>
              <View style={st.calificar}>
                <Text style={st.calificarTitulo}>{miResena ? 'Tu calificación' : '¿Qué tal te salió?'}</Text>
                <View style={st.calificarFila}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Pressable key={n} onPress={() => { seleccion(); abrirResena(n); }} hitSlop={4} accessibilityLabel={`${n} estrellas`}>
                        <Ionicons name="star" size={30} color={n <= miNota ? ORO : 'rgba(43,18,32,0.16)'} />
                      </Pressable>
                    ))}
                  </View>
                  <Presionable escalaAlPresionar={0.96} style={st.botonEscribir} onPress={() => abrirResena(miNota)}>
                    <Text style={st.botonEscribirTexto} numberOfLines={1}>{miResena ? 'Editar reseña' : 'Escribir reseña'}</Text>
                  </Presionable>
                </View>
              </View>
            </Aparecer>

            {/* Reseñas */}
            {visibles.map((r, i) => (
              <Aparecer key={r.id} delay={100 + Math.min(i, 4) * 60} distancia={12}>
                <View style={st.tarjeta}>
                  <View style={st.autorFila}>
                    <Avatar nombre={r.usuario.nombre} indice={i} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.autor} numberOfLines={1}>
                        {r.usuario.nombre}{r.usuario.correo === usuario?.correo ? '  (tú)' : ''}
                      </Text>
                      <View style={st.estrellasFecha}>
                        <Estrellas valor={r.puntuacion} tam={13} />
                        <Text style={st.fecha}>{hace(r.creadoEn)}</Text>
                      </View>
                    </View>
                  </View>
                  {r.comentario ? <Text style={st.texto}>{r.comentario}</Text> : null}
                </View>
              </Aparecer>
            ))}
            {total > 3 ? (
              <Pressable onPress={() => { toque(); setVerTodas((v) => !v); }} style={st.verTodas} hitSlop={8}>
                <Text style={st.verTodasTexto}>{verTodas ? 'Ver menos reseñas' : `Ver las ${total} reseñas`}</Text>
              </Pressable>
            ) : null}

            {/* Comentarios */}
            <View style={st.seccionCabecera}>
              <Text style={st.seccionTitulo}>Comentarios</Text>
              <View style={st.contador}>
                <Text style={st.contadorTexto}>{comentarios.length}</Text>
              </View>
            </View>

            {comentarios.length === 0 ? (
              <Text style={st.vacio}>Aún no hay comentarios. Pregunta algo o cuenta cómo te quedó.</Text>
            ) : (
              comentarios.map((c, i) => (
                <View key={c.id} style={st.tarjeta}>
                  <View style={st.autorFila}>
                    <Avatar nombre={c.usuario.nombre} indice={i + 1} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.autor} numberOfLines={1}>{c.usuario.nombre}</Text>
                      <Text style={st.fecha}>{hace(c.creadoEn)}</Text>
                    </View>
                    {c.usuario.correo === usuario?.correo ? (
                      <Pressable onPress={() => eliminarComentario(c.id)} hitSlop={10} accessibilityLabel="Eliminar comentario">
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </Pressable>
                    ) : null}
                  </View>
                  <Text style={st.texto}>{c.contenido}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Barra para comentar */}
      <View style={[st.barra, { paddingBottom: insets.bottom + 10 }]}>
        <View style={st.entrada}>
          <TextInput
            style={st.entradaTexto}
            placeholder="Escribe un comentario..."
            placeholderTextColor={colors.textMuted}
            value={nuevo}
            onChangeText={setNuevo}
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={enviarComentario}
          />
          <Pressable style={[st.enviar, !nuevo.trim() && { opacity: 0.5 }]} onPress={enviarComentario} disabled={enviando} accessibilityLabel="Enviar comentario">
            {enviando ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="paper-plane" size={18} color={colors.white} />}
          </Pressable>
        </View>
      </View>

      {/* Escribir o editar mi reseña */}
      <Modal visible={escribiendo} animationType="slide" statusBarTranslucent onRequestClose={() => setEscribiendo(false)}>
        <View style={{ flex: 1 }}>
          <ResenaFinal
            recetaId={Number(id)}
            nombre={nombre}
            imagen={imagen}
            insignia="Tu reseña"
            puntuacionInicial={estrellaElegida || miNota}
            comentarioInicial={miResena?.comentario ?? ''}
            yaTieneResena={!!miResena}
            onPublicada={cargar}
            onCerrar={() => setEscribiendo(false)}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  atras: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  nombreReceta: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted },
  titulo: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 36, color: colors.text, marginTop: 18, marginBottom: 16 },

  fallo: { alignItems: 'center', gap: 10, marginTop: 40 },
  falloTexto: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  reintentar: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 22, paddingVertical: 10 },
  reintentarTexto: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.white },

  resumen: { flexDirection: 'row', alignItems: 'center', gap: 20, backgroundColor: colors.primaryLight, borderRadius: 30, padding: 20 },
  promedioCaja: { alignItems: 'center', gap: 4 },
  promedioNumero: { fontFamily: fonts.displayBold, fontSize: 44, lineHeight: 48, color: colors.text },
  promedioTotal: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  sinResenas: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text, textAlign: 'center', marginTop: 6 },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barraNumero: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text, width: 10 },
  barraFondo: { flex: 1, height: 9, borderRadius: 5, backgroundColor: colors.white, overflow: 'hidden' },
  barraRelleno: { height: 9, borderRadius: 5, backgroundColor: colors.primary },

  calificar: { backgroundColor: colors.accent, borderRadius: 30, padding: 18, marginTop: 14 },
  calificarTitulo: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  calificarFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 8 },
  botonEscribir: { backgroundColor: colors.text, borderRadius: radius.pill, paddingHorizontal: 18, height: 42, alignItems: 'center', justifyContent: 'center' },
  botonEscribirTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.white },

  tarjeta: {
    backgroundColor: colors.surface, borderRadius: 26, borderWidth: 1, borderColor: colors.border, padding: 16, marginTop: 12,
    shadowColor: colors.text, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  autorFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.text },
  autor: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
  estrellasFecha: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  fecha: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  texto: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text, marginTop: 10 },
  verTodas: { alignSelf: 'center', paddingVertical: 14 },
  verTodasTexto: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary },

  seccionCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 },
  seccionTitulo: { fontFamily: fonts.displayBold, fontSize: 24, color: colors.text },
  contador: { minWidth: 36, height: 30, borderRadius: 15, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  contadorTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  vacio: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 12 },

  barra: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, backgroundColor: colors.background },
  entrada: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    paddingLeft: 20, paddingRight: 6, height: 58,
    shadowColor: colors.text, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  entradaTexto: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text, paddingVertical: 0 },
  enviar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});