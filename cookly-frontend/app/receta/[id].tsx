// app/receta/[id].tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  Alert, KeyboardAvoidingView, Keyboard, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aparecer, Presionable } from '../../components/Animaciones';
import ImagenReceta from '../../components/ImagenReceta';
import CargandoReceta from '../../components/CargandoReceta';
import { mostrarAviso } from '../../components/Aviso';
import { toque, exito } from '../../lib/vibracion';
import { leerProgreso } from '../../lib/progresoCocina';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router';
import { colors, fonts, radius, spacing, typography, shadow } from '../../constants/theme';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Estrellas from '../../components/Estrellas';
import EtiquetasReceta from '../../components/EtiquetasReceta';
import CocinaGuiada from '../../components/CocinaGuiada';
import Porciones from '../../components/Porciones';
import { Modo, PORCIONES_BASE, partesIngrediente } from '../../lib/cantidades';
import { alergiasDeIngrediente, listaEnTexto, useMisAlergias } from '../../lib/alergias';


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
  const misAlergias = useMisAlergias();
  // Al pasar la foto, la barra de la hora (arriba) se tapa con una franja fija para que el contenido no se mezcle con ella.
  const [pasoLaFoto, setPasoLaFoto] = useState(false);
  const [promedio, setPromedio] = useState(0);
  const [miPuntuacion, setMiPuntuacion] = useState(0);
  const [miComentarioResena, setMiComentarioResena] = useState('');
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [cocinando, setCocinando] = useState(false);
  const [personas, setPersonas] = useState(PORCIONES_BASE);
  const [modo, setModo] = useState<Modo>('original');
  const [retomar, setRetomar] = useState(false);
  const [pasoGuardado, setPasoGuardado] = useState<number | null>(null);
  const [enviandoLista, setEnviandoLista] = useState(false);
  const [tecladoVisible, setTecladoVisible] = useState(false);

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



  function irAResenas() {
    toque();
    router.push({ pathname: '/resenas/[id]', params: { id: String(id), nombre: receta?.nombre ?? '' } });
  }

  // Se vuelven a leer reseñas, promedio y comentarios (al publicar desde la Cocina guiada o al volver de la pantalla de reseñas).
  async function refrescarResenas() {
    try {
      api.get(`/recetas/${id}/comentarios`).then((r) => setComentarios(r.data)).catch(() => {});
      const { data } = await api.get(`/recetas/${id}/resenas`);
      const lista: Resena[] = data.resenas ?? [];
      setResenas(lista);
      setPromedio(data.promedio ?? 0);
      const mia = lista.find((r) => r.usuario.correo === usuario?.correo);
      if (mia) {
        setMiPuntuacion(mia.puntuacion);
        setMiComentarioResena(mia.comentario ?? '');
      }
    } catch {}
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


  function cocinar() {
    toque();
    setRetomar(pasoGuardado !== null);
    setCocinando(true);
  }

  // Al volver de la pantalla de reseñas se actualizan los números (la primera vez ya vienen cargados).
  const primeraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeraVez.current) {
        primeraVez.current = false;
        return;
      }
      refrescarResenas();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

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

  // Ingredientes que contienen alguna de MIS alergias (por el nombre del ingrediente).
  const alertasPorIngrediente = receta.detallesIngredientes.map((d) => alergiasDeIngrediente(d.ingrediente.nombre, misAlergias));
  const ingredientesConAlergia = alertasPorIngrediente.filter((a) => a.length > 0).length;
  const nombresAlergias = Array.from(new Set(alertasPorIngrediente.flat().map((a) => a.nombre)));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: mostrarBarra ? 130 + insets.bottom : spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const paso = e.nativeEvent.contentOffset.y > ALTO_FOTO - insets.top - 8;
          setPasoLaFoto((anterior) => (anterior === paso ? anterior : paso));
        }}
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
            <Pressable style={[styles.pastilla, { backgroundColor: colors.accent }]} onPress={irAResenas}>
              <Ionicons name="star" size={14} color={colors.text} />
              <Text style={styles.pastillaTexto}>{textoResenas}</Text>
            </Pressable>
            {receta.minutosPreparacion ? (
              <View style={[styles.pastilla, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.pastillaTexto}>{receta.minutosPreparacion} min</Text>
              </View>
            ) : null}
            <Pressable style={[styles.pastilla, { backgroundColor: colors.magic }]} onPress={irAResenas}>
              <Ionicons name="chatbubble-outline" size={13} color={colors.text} />
              <Text style={styles.pastillaTexto}>{comentarios.length}</Text>
            </Pressable>
          </View>

          <EtiquetasReceta recetaId={Number(id)} />

          {receta.descripcion ? <Text style={styles.descripcion}>{receta.descripcion}</Text> : null}

          {/* Aviso de alergias */}
          {ingredientesConAlergia > 0 && (
            <View style={styles.alergiaCaja} accessibilityRole="alert">
              <View style={styles.alergiaIcono}>
                <Ionicons name="warning-outline" size={22} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alergiaTitulo}>
                  Contiene {ingredientesConAlergia} {ingredientesConAlergia === 1 ? 'ingrediente' : 'ingredientes'} de tus alergias
                </Text>
                <Text style={styles.alergiaSub}>{listaEnTexto(nombresAlergias)}</Text>
              </View>
            </View>
          )}

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
                    const peligro = alertasPorIngrediente[idx]?.length > 0;
                    return (
                      <View key={idx} style={[styles.ingredienteRow, idx > 0 && styles.ingredienteLinea]}>
                        <View style={styles.ingredienteNombreFila}>
                          <Text style={[styles.ingredienteNombre, peligro && styles.ingredientePeligro]} numberOfLines={2}>{p.nombre}</Text>
                          {peligro ? <Ionicons name="warning-outline" size={16} color={colors.danger} /> : null}
                        </View>
                        <Text style={[styles.ingredienteCantidad, peligro && styles.ingredientePeligro]}>{p.cantidad}</Text>
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

          {/* Entrada a la pantalla de Reseñas y comentarios */}
          <Presionable escalaAlPresionar={0.97} style={styles.entradaResenas} onPress={irAResenas}>
            <View style={styles.entradaIcono}>
              <Ionicons name="chatbubbles-outline" size={24} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.entradaTitulo}>Reseñas y comentarios</Text>
              <View style={styles.entradaSub}>
                {resenas.length > 0 ? <Estrellas valor={promedio} tamano={13} gap={1} /> : null}
                <Text style={styles.entradaTexto} numberOfLines={1}>
                  {resenas.length > 0 ? `${promedio.toFixed(1)} · ` : ''}
                  {resenas.length} {resenas.length === 1 ? 'reseña' : 'reseñas'} · {comentarios.length} {comentarios.length === 1 ? 'comentario' : 'comentarios'}
                </Text>
              </View>
            </View>
            <View style={styles.entradaFlecha}>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </View>
          </Presionable>
        </Aparecer>
      </ScrollView>

      {/* Franja fija bajo la hora / wifi / batería */}
      {pasoLaFoto ? <View pointerEvents="none" style={[styles.franjaEstado, { height: insets.top }]} /> : null}

      {/* Barra fija de abajo: Enviar a mi lista + Cocinar */}
      {mostrarBarra && (
        <View style={[styles.barra, { paddingBottom: insets.bottom + 12 }]}>
          {receta.detallesIngredientes.length > 0 && (
            <View style={styles.celdaBoton}>
            <Presionable escalaAlPresionar={0.96} style={styles.botonLista} onPress={enviarALaLista} disabled={enviandoLista}>
              {enviandoLista ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <MaterialCommunityIcons name="cart-plus" size={24} color={colors.accent} />
              )}
              <Text style={styles.botonListaTexto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Enviar a mi lista</Text>
            </Presionable>
            </View>
          )}
          {tienePasos && (
            <View style={styles.celdaBoton}>
            <Presionable escalaAlPresionar={0.97} style={styles.botonCocinar} onPress={cocinar}>
              <Text style={styles.botonCocinarTexto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{pasoGuardado !== null ? 'Continuar' : 'Cocinar'}</Text>
              <View style={styles.circuloPlay}>
                <Ionicons name="play" size={20} color={colors.primary} style={{ marginLeft: 3 }} />
              </View>
            </Presionable>
            </View>
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
        imagen={imagenUrl ?? (portadaParam || null)}
        puntuacionInicial={miPuntuacion}
        comentarioInicial={miComentarioResena}
        onResenaPublicada={refrescarResenas}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  franjaEstado: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.background, zIndex: 10 },
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
  entradaResenas: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: 30, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: spacing.lg, shadowColor: colors.text, shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  entradaIcono: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  entradaTitulo: { fontFamily: fonts.heading, fontSize: 17, color: colors.text },
  entradaSub: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  entradaTexto: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  entradaFlecha: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  subTitulo: { ...typography.h3, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm, fontSize: 15 },
  vacioTexto: { ...typography.bodySmall, color: colors.textMuted },
  listaIngredientes: { marginTop: spacing.sm },
  ingredienteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, gap: spacing.md },
  ingredienteLinea: { borderTopWidth: 1, borderTopColor: colors.border },
  ingredienteNombreFila: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  ingredienteNombre: { fontFamily: fonts.body, fontSize: 16, color: colors.text, flexShrink: 1 },
  ingredientePeligro: { color: colors.danger, fontFamily: fonts.bodyBold },
  alergiaCaja: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.md, padding: 14, borderRadius: 20,
    backgroundColor: '#FDE7E7', borderWidth: 1, borderColor: '#F2B3B5',
  },
  alergiaIcono: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  alergiaTitulo: { fontFamily: fonts.heading, fontSize: 15, lineHeight: 20, color: '#A32A2F' },
  alergiaSub: { fontFamily: fonts.body, fontSize: 13, color: '#A32A2F', marginTop: 2 },
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
  // Cada botón vive en una celda del mismo ancho (el Presionable no reparte el ancho por sí solo).
  celdaBoton: { flex: 1 },
  botonLista: {
    width: '100%', height: 62, borderRadius: 31, backgroundColor: colors.text, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: colors.text, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  botonListaTexto: { fontFamily: fonts.heading, fontSize: 15, flexShrink: 1, color: colors.white },
  botonCocinar: {
    width: '100%', height: 62, borderRadius: 31, backgroundColor: colors.primary, paddingLeft: 24, paddingRight: 8, gap: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  botonCocinarTexto: { fontFamily: fonts.heading, fontSize: 17, color: colors.white, flexShrink: 1 },
  circuloPlay: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});