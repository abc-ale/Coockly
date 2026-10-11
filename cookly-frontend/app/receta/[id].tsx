// app/receta/[id].tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  Alert, KeyboardAvoidingView, Keyboard, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aparecer, Presionable } from '../../components/Animaciones';
import ImagenReceta from '../../components/ImagenReceta';
import CargandoReceta from '../../components/CargandoReceta';
import { mostrarAviso } from '../../components/Aviso';
import { toque, exito } from '../../lib/vibracion';
import { leerProgreso } from '../../lib/progresoCocina';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, fonts, radius, spacing, typography, shadow } from '../../constants/theme';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Estrellas from '../../components/Estrellas';
import EtiquetasReceta from '../../components/EtiquetasReceta';
import CocinaGuiada from '../../components/CocinaGuiada';
import Porciones from '../../components/Porciones';
import { FormularioResena, ResumenResenas, TarjetaResena } from '../../components/Resenas';
import { Modo, PORCIONES_BASE, partesIngrediente } from '../../lib/cantidades';


type Ingrediente = {
  ingrediente: { id: number; nombre: string };
  cantidad: number;
  unidad: string;
};

type Paso = { id: number; orden: number; instruccion: string };

type RecetaDetalle = {
  id: number;
  nombre: string;
  descripcion: string | null;
  minutosPreparacion: number | null;
  detallesIngredientes: Ingrediente[];
  pasos: Paso[];
};

type Comentario = {
  id: number;
  contenido: string;
  creadoEn: string;
  usuario: { nombre: string; correo: string };
};

type Resena = {
  id: number;
  puntuacion: number;
  comentario: string | null;
  creadoEn: string;
  usuario: { nombre: string; correo: string };
};

const ALTO_FOTO = 330;

/** "Sazona el pollo. Sal, ajo y comino." -> título "Sazona el pollo" y detalle "Sal, ajo y comino." */
function dividirPaso(texto: string, orden: number): { titulo: string; detalle: string } {
  const limpio = (texto ?? '').trim();
  const m = limpio.match(/^(.{3,60}?)[.:]\s+([\s\S]+)$/);
  if (m) return { titulo: m[1].trim(), detalle: m[2].trim() };
  return { titulo: '', detalle: limpio };
}

export default function RecetaDetalleScreen() {
  // nombre, portada y minutos llegan desde la tarjeta que se tocó: así la pantalla ya muestra algo mientras carga el resto.
  const { id, continuar, nombre: nombreParam, portada: portadaParam, minutos: minutosParam } =
    useLocalSearchParams<{ id: string; continuar?: string; nombre?: string; portada?: string; minutos?: string }>();
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();

  const [receta, setReceta] = useState<RecetaDetalle | null>(null);
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [esFavorito, setEsFavorito] = useState(false);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [promedio, setPromedio] = useState(0);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [miPuntuacion, setMiPuntuacion] = useState(0);
  const [miComentarioResena, setMiComentarioResena] = useState('');
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [enviandoResena, setEnviandoResena] = useState(false);
  const [cocinando, setCocinando] = useState(false);
  const [personas, setPersonas] = useState(PORCIONES_BASE);
  const [modo, setModo] = useState<Modo>('original');
  const [retomar, setRetomar] = useState(false);
  const [pasoGuardado, setPasoGuardado] = useState<number | null>(null);
  const [enviandoLista, setEnviandoLista] = useState(false);
  const [tecladoVisible, setTecladoVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const yResenas = useRef(0);
  const yComentarios = useRef(0);

  // Con el teclado abierto se esconde la barra de abajo (así no tapa lo que escribes).
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setTecladoVisible(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setTecladoVisible(false));
    return () => { a.remove(); b.remove(); };
  }, []);

  const cargarTodo = useCallback(async () => {
    setFallo(false);
    setCargando(true);
    try {
      api.post(`/historial/${id}`).catch(() => {}); // registra la vista, sin bloquear si falla

      const [resReceta, resImagenes, resFavoritos, resComentarios, resResenas] = await Promise.all([
        api.get(`/recetas/${id}`),
        api.get(`/imagenes/receta/${id}`),
        api.get('/recetas/favoritos'),
        api.get(`/recetas/${id}/comentarios`),
        api.get(`/recetas/${id}/resenas`),
      ]);

      setReceta(resReceta.data);
      setImagenUrl(resImagenes.data?.[0]?.url ?? null);
      setEsFavorito(resFavoritos.data.some((r: any) => r.id === Number(id)));
      setComentarios(resComentarios.data);
      setResenas(resResenas.data.resenas ?? []);
      setPromedio(resResenas.data.promedio ?? 0);

      const miResena = (resResenas.data.resenas ?? []).find((r: Resena) => r.usuario.correo === usuario?.correo);
      if (miResena) {
        setMiPuntuacion(miResena.puntuacion);
        setMiComentarioResena(miResena.comentario ?? '');
      }
    } catch (error: any) {
      setFallo(true);
    } finally {
      setCargando(false);
    }
  }, [id, usuario]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  // ¿Dejó esta receta a medias en Cocina guiada? Se vuelve a revisar cada vez que se cierra la Cocina guiada.
  const yaAbiertoPorContinuar = useRef(false);
  useEffect(() => {
    leerProgreso().then((p) => {
      const esta = p && p.recetaId === Number(id);
      setPasoGuardado(esta ? p!.paso : null);
      // Si viene de "Continuar cocinando" (Inicio), se abre directo, una sola vez.
      if (esta && continuar === '1' && !yaAbiertoPorContinuar.current) {
        yaAbiertoPorContinuar.current = true;
        setRetomar(true);
        setCocinando(true);
      }
    });
  }, [id, continuar, cocinando]);

  // El corazón cambia al instante; si el servidor falla, vuelve a como estaba.
  async function alternarFavorito() {
    const eraFavorito = esFavorito;
    toque();
    setEsFavorito(!eraFavorito);
    try {
      if (eraFavorito) await api.delete(`/recetas/${id}/favorito`);
      else await api.post(`/recetas/${id}/favorito`);
    } catch (error: any) {
      setEsFavorito(eraFavorito);
      Alert.alert('No se pudo actualizar', error?.response?.data?.mensaje || 'No pudimos actualizar tu favorito. Inténtalo de nuevo.');
    }
  }

  async function enviarComentario() {
    if (!nuevoComentario.trim()) return;
    setEnviandoComentario(true);
    try {
      await api.post(`/recetas/${id}/comentarios`, { contenido: nuevoComentario.trim() });
      setNuevoComentario('');
      const { data } = await api.get(`/recetas/${id}/comentarios`);
      setComentarios(data);
      mostrarAviso('Comentario publicado');
    } catch (error: any) {
      Alert.alert('No se pudo publicar', error?.response?.data?.mensaje || 'No pudimos publicar tu comentario. Inténtalo de nuevo.');
    } finally {
      setEnviandoComentario(false);
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

  async function enviarResena() {
    if (miPuntuacion === 0) {
      Alert.alert('Falta tu calificación', 'Toca una estrella para calificar la receta.');
      return;
    }
    setEnviandoResena(true);
    try {
      await api.put(`/recetas/${id}/resenas`, {
        puntuacion: miPuntuacion,
        comentario: miComentarioResena.trim() || undefined,
      });
      const { data } = await api.get(`/recetas/${id}/resenas`);
      setResenas(data.resenas ?? []);
      setPromedio(data.promedio ?? 0);
      mostrarAviso('¡Gracias! Tu reseña se guardó');
    } catch (error: any) {
      Alert.alert('No se pudo guardar', error?.response?.data?.mensaje || 'No pudimos guardar tu reseña. Inténtalo de nuevo.');
    } finally {
      setEnviandoResena(false);
    }
  }

  // Crea una lista de compras con los ingredientes, ya ajustados a las personas elegidas.
  async function enviarALaLista() {
    if (!receta || enviandoLista || receta.detallesIngredientes.length === 0) return;
    setEnviandoLista(true);
    toque();
    try {
      const { data: lista } = await api.post('/listas-compra', {
        nombre: `${receta.nombre} (${personas} ${personas === 1 ? 'persona' : 'personas'})`.slice(0, 80),
      });
      const factor = personas / PORCIONES_BASE;
      await Promise.all(
        receta.detallesIngredientes.map((i) =>
          api.post(`/listas-compra/${lista.id}/elementos`, {
            ingredienteId: i.ingrediente.id,
            cantidad: Math.round(i.cantidad * factor * 100) / 100,
            unidad: i.unidad,
          })
        )
      );
      exito();
      mostrarAviso('Ingredientes enviados a tu lista');
    } catch (error: any) {
      Alert.alert('No se pudo enviar', error?.response?.data?.mensaje || 'No pudimos enviar los ingredientes a tu lista. Inténtalo de nuevo.');
    } finally {
      setEnviandoLista(false);
    }
  }

  function irA(y: number) {
    toque();
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }

  function cocinar() {
    toque();
    setRetomar(pasoGuardado !== null);
    setCocinando(true);
  }

  // Mientras llegan los datos: foto y nombre al instante + bloques que laten (sin pantalla en blanco ni saltos).
  if (cargando || !receta) {
    return (
      <CargandoReceta
        portada={portadaParam || undefined}
        nombre={nombreParam || undefined}
        minutos={minutosParam ? Number(minutosParam) : undefined}
        fallo={fallo && !cargando}
        onReintentar={cargarTodo}
      />
    );
  }

  const pasosOrdenados = [...receta.pasos].sort((a, b) => a.orden - b.orden);
  const tienePasos = pasosOrdenados.length > 0;
  const textoResenas = resenas.length === 0 ? 'Sin reseñas' : `${promedio.toFixed(1)} · ${resenas.length} ${resenas.length === 1 ? 'reseña' : 'reseñas'}`;
  const mostrarBarra = !tecladoVisible;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: mostrarBarra ? 120 + insets.bottom : spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Foto grande con esquinas de abajo muy redondeadas */}
        <View style={styles.fotoCaja}>
          <ImagenReceta uri={imagenUrl ?? (portadaParam || null)} ancho={900} tamanoIcono={48} style={styles.foto} />

          <Pressable style={[styles.botonRedondo, { top: Math.max(insets.top, 12) + 8, left: 16 }]} onPress={() => router.back()} accessibilityLabel="Volver">
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>

          <Pressable
            style={[styles.botonRedondo, { top: Math.max(insets.top, 12) + 8, right: 16 }, esFavorito && styles.botonFavoritoOn]}
            onPress={alternarFavorito}
            accessibilityLabel="Favorito"
          >
            <Ionicons name={esFavorito ? 'heart' : 'heart-outline'} size={21} color={esFavorito ? colors.white : colors.text} />
          </Pressable>
        </View>

        <Aparecer distancia={18} style={styles.contenido}>
          <Text style={styles.titulo}>{receta.nombre}</Text>

          <View style={styles.metaRow}>
            <Pressable style={[styles.pastilla, { backgroundColor: colors.accent }]} onPress={() => irA(ALTO_FOTO + yResenas.current)}>
              <Ionicons name="star" size={14} color={colors.text} />
              <Text style={styles.pastillaTexto}>{textoResenas}</Text>
            </Pressable>
            {receta.minutosPreparacion ? (
              <View style={[styles.pastilla, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.pastillaTexto}>{receta.minutosPreparacion} min</Text>
              </View>
            ) : null}
            <Pressable style={[styles.pastilla, { backgroundColor: colors.magic }]} onPress={() => irA(ALTO_FOTO + yComentarios.current)}>
              <Ionicons name="chatbubble-outline" size={13} color={colors.text} />
              <Text style={styles.pastillaTexto}>{comentarios.length}</Text>
            </Pressable>
          </View>

          <EtiquetasReceta recetaId={Number(id)} />

          {receta.descripcion ? <Text style={styles.descripcion}>{receta.descripcion}</Text> : null}

          {/* Ingredientes */}
          <View style={styles.seccion}>
            {receta.detallesIngredientes.length === 0 ? (
              <>
                <Text style={styles.seccionTitulo}>Ingredientes</Text>
                <Text style={styles.vacioTexto}>Sin ingredientes registrados.</Text>
              </>
            ) : (
              <>
                <Porciones personas={personas} modo={modo} onPersonas={setPersonas} onModo={setModo} />
                <View style={styles.listaIngredientes}>
                  {receta.detallesIngredientes.map((item, idx) => {
                    const p = partesIngrediente(item.cantidad, item.unidad, item.ingrediente.nombre, personas, modo);
                    return (
                      <View key={idx} style={[styles.ingredienteRow, idx > 0 && styles.ingredienteLinea]}>
                        <Text style={styles.ingredienteNombre} numberOfLines={2}>{p.nombre}</Text>
                        <Text style={styles.ingredienteCantidad}>{p.cantidad}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          {/* Preparación */}
          <View style={styles.seccion}>
            <View style={styles.seccionCabecera}>
              <Text style={styles.seccionTitulo}>Preparación</Text>
            </View>
            {!tienePasos ? (
              <Text style={styles.vacioTexto}>Sin pasos registrados.</Text>
            ) : (
              pasosOrdenados.map((paso) => {
                const d = dividirPaso(paso.instruccion, paso.orden);
                return (
                  <View key={paso.id} style={styles.pasoTarjeta}>
                    <View style={styles.pasoNumero}>
                      <Text style={styles.pasoNumeroTexto}>{paso.orden}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      {d.titulo ? <Text style={styles.pasoTitulo}>{d.titulo}</Text> : null}
                      {d.detalle ? <Text style={d.titulo ? styles.pasoTexto : styles.pasoTextoSolo}>{d.detalle}</Text> : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Reseñas */}
          <View onLayout={(e) => { yResenas.current = e.nativeEvent.layout.y; }}>
            <Text style={[styles.seccionTitulo, { marginTop: spacing.lg }]}>Reseñas</Text>
            <ResumenResenas resenas={resenas} promedio={promedio} />
            <FormularioResena
              puntuacion={miPuntuacion}
              comentario={miComentarioResena}
              onPuntuacion={setMiPuntuacion}
              onComentario={setMiComentarioResena}
              onEnviar={enviarResena}
              enviando={enviandoResena}
              yaTieneResena={resenas.some((r) => r.usuario.correo === usuario?.correo)}
            />

            {resenas.filter((r) => r.usuario.correo !== usuario?.correo).length > 0 && (
              <>
                <Text style={styles.subTitulo}>Otras reseñas</Text>
                {resenas
                  .filter((r) => r.usuario.correo !== usuario?.correo)
                  .map((r, i) => (
                    <TarjetaResena key={r.id} resena={r} indice={i} />
                  ))}
              </>
            )}
          </View>

          {/* Comentarios */}
          <View onLayout={(e) => { yComentarios.current = e.nativeEvent.layout.y; }}>
            <Text style={[styles.seccionTitulo, { marginTop: spacing.lg }]}>Comentarios ({comentarios.length})</Text>

            <View style={styles.filaInputComentario}>
              <TextInput
                placeholder="Escribe un comentario..."
                placeholderTextColor={colors.textMuted}
                value={nuevoComentario}
                onChangeText={setNuevoComentario}
                style={styles.inputComentario}
              />
              <Pressable style={styles.botonEnviar} onPress={enviarComentario} disabled={enviandoComentario}>
                <Ionicons name="send" size={16} color={colors.white} />
              </Pressable>
            </View>

            {comentarios.map((c) => (
              <View key={c.id} style={styles.tarjeta}>
                <View style={styles.filaAutor}>
                  <Text style={styles.autorNombre}>{c.usuario.nombre}</Text>
                  {c.usuario.correo === usuario?.correo && (
                    <Pressable onPress={() => eliminarComentario(c.id)}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
                <Text style={styles.comentarioTexto}>{c.contenido}</Text>
              </View>
            ))}
          </View>
        </Aparecer>
      </ScrollView>

      {/* Barra fija de abajo: Enviar a mi lista + Cocinar */}
      {mostrarBarra && (
        <View style={[styles.barra, { paddingBottom: insets.bottom + 12 }]}>
          {receta.detallesIngredientes.length > 0 && (
            <Presionable escalaAlPresionar={0.96} style={styles.botonLista} onPress={enviarALaLista} disabled={enviandoLista}>
              {enviandoLista ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Ionicons name="cart" size={20} color={colors.accent} />
              )}
              <Text style={styles.botonListaTexto}>Enviar a mi lista</Text>
            </Presionable>
          )}
          {tienePasos && (
            <Presionable escalaAlPresionar={0.97} style={styles.botonCocinar} onPress={cocinar}>
              <Text style={styles.botonCocinarTexto}>{pasoGuardado !== null ? 'Continuar' : 'Cocinar'}</Text>
              <View style={styles.circuloPlay}>
                <Ionicons name="play" size={16} color={colors.primary} style={{ marginLeft: 2 }} />
              </View>
            </Presionable>
          )}
        </View>
      )}

      <CocinaGuiada
        visible={cocinando}
        onClose={() => setCocinando(false)}
        nombre={receta.nombre}
        pasos={receta.pasos}
        recetaId={Number(id)}
        retomar={retomar}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  fotoCaja: { width: '100%', height: ALTO_FOTO, borderBottomLeftRadius: 44, borderBottomRightRadius: 44, overflow: 'hidden', backgroundColor: colors.primaryLight },
  foto: { width: '100%', height: '100%' },
  botonRedondo: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  botonFavoritoOn: { backgroundColor: colors.primary },
  contenido: { paddingHorizontal: 20, paddingTop: spacing.lg },
  titulo: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 36, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: spacing.md, gap: 8 },
  pastilla: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  pastillaTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  descripcion: { ...typography.body, color: colors.textMuted, marginTop: spacing.md },
  seccion: { marginTop: spacing.lg },
  seccionCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  seccionTitulo: { fontFamily: fonts.heading, fontSize: 22, color: colors.text },
  enlace: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  subTitulo: { ...typography.h3, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm, fontSize: 15 },
  vacioTexto: { ...typography.bodySmall, color: colors.textMuted },
  listaIngredientes: { marginTop: spacing.sm },
  ingredienteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, gap: spacing.md },
  ingredienteLinea: { borderTopWidth: 1, borderTopColor: colors.border },
  ingredienteNombre: { fontFamily: fonts.body, fontSize: 16, color: colors.text, flex: 1 },
  ingredienteCantidad: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  pasoTarjeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primaryLight, borderRadius: 28, padding: 16, marginTop: spacing.sm },
  pasoNumero: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pasoNumeroTexto: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.white },
  pasoTitulo: { fontFamily: fonts.heading, fontSize: 17, color: colors.text },
  pasoTextoSolo: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  pasoTexto: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 2 },
  tarjeta: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, ...shadow.card },
  filaAutor: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  autorNombre: { ...typography.body, fontWeight: 'bold', color: colors.text },
  comentarioTexto: { ...typography.body, color: colors.text },
  filaInputComentario: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.sm },
  inputComentario: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, height: 44, color: colors.text,
  },
  botonEnviar: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  barra: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.background,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  botonLista: {
    flex: 1.15, height: 58, borderRadius: 29, backgroundColor: colors.text, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  botonListaTexto: { fontFamily: fonts.bodyBold, fontSize: 13, flexShrink: 1, color: colors.white },
  botonCocinar: {
    flex: 1, height: 58, borderRadius: 29, backgroundColor: colors.primary, paddingLeft: 22, paddingRight: 7,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  botonCocinarTexto: { fontFamily: fonts.bodyBold, fontSize: 16, marginRight: 8, color: colors.white },
  circuloPlay: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});