// app/receta/[id].tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Aparecer, Presionable, Pulso } from '../../components/Animaciones';
import Degradado from '../../components/Degradado';
import ImagenReceta from '../../components/ImagenReceta';
import CargandoReceta from '../../components/CargandoReceta';
import { mostrarAviso } from '../../components/Aviso';
import { toque } from '../../lib/vibracion';
import { leerProgreso } from '../../lib/progresoCocina';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, fonts, radius, spacing, typography, shadow } from '../../constants/theme';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Stars from '../../components/Stars';
import Button from '../../components/Button';
import EtiquetasReceta from '../../components/EtiquetasReceta';
import CocinaGuiada from '../../components/CocinaGuiada';
import Porciones from '../../components/Porciones';
import { FormularioResena, ResumenResenas, TarjetaResena } from '../../components/Resenas';
import { Modo, PORCIONES_BASE, textoIngrediente } from '../../lib/cantidades';


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

export default function RecetaDetalleScreen() {
  // nombre, portada y minutos llegan desde la tarjeta que se tocó: así la pantalla ya muestra algo mientras carga el resto.
  const { id, continuar, nombre: nombreParam, portada: portadaParam, minutos: minutosParam } =
    useLocalSearchParams<{ id: string; continuar?: string; nombre?: string; portada?: string; minutos?: string }>();
  const { usuario } = useAuth();

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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={styles.imagenContainer}>
          <ImagenReceta uri={imagenUrl ?? (portadaParam || null)} ancho={900} tamanoIcono={48} style={styles.imagen} />

          <Pressable style={styles.botonAtras} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <Pressable style={styles.botonFavorito} onPress={alternarFavorito}>
            <Ionicons
              name={esFavorito ? 'heart' : 'heart-outline'}
              size={20}
              color={esFavorito ? colors.primary : colors.textMuted}
            />
          </Pressable>
        </View>

        <Aparecer distancia={18} style={styles.contenido}>
          <Text style={styles.titulo}>{receta.nombre}</Text>
          
          {/* Componente de Etiquetas agregado aquí debajo del título */}
          <EtiquetasReceta recetaId={Number(id)} />

          <View style={styles.metaRow}>
            <View style={styles.pastilla}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text style={styles.pastillaTexto}>{promedio.toFixed(1)} ({resenas.length})</Text>
            </View>
            {receta.minutosPreparacion ? (
              <View style={styles.pastilla}>
                <Ionicons name="time-outline" size={14} color={colors.primary} />
                <Text style={styles.pastillaTexto}>{receta.minutosPreparacion} min</Text>
              </View>
            ) : null}
            {receta.pasos.length > 0 ? (
              <View style={styles.pastilla}>
                <Ionicons name="list-outline" size={14} color={colors.primary} />
                <Text style={styles.pastillaTexto}>{receta.pasos.length} pasos</Text>
              </View>
            ) : null}
          </View>

          {receta.descripcion ? <Text style={styles.descripcion}>{receta.descripcion}</Text> : null}

          {receta.pasos.length > 0 && (
            <Pulso intensidad={1.02}>
            <Presionable
              escalaAlPresionar={0.97}
              style={styles.cocinaGuiadaSombra}
              onPress={() => {
                setRetomar(pasoGuardado !== null);
                setCocinando(true);
              }}
            >
              <Degradado colores={[colors.primary, '#FF7A9E']} style={styles.botonCocinaGuiada}>
                <Ionicons name="timer-outline" size={26} color={colors.white} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cocinaGuiadaTitulo}>
                    {pasoGuardado !== null ? 'Continuar cocinando' : 'Empezar a cocinar'}
                  </Text>
                  <Text style={styles.cocinaGuiadaSub}>
                    {pasoGuardado !== null
                      ? `Paso ${pasoGuardado + 1} de ${receta.pasos.length}`
                      : `${receta.pasos.length} pasos${receta.minutosPreparacion ? ` · ${receta.minutosPreparacion} min` : ''} · con cronómetro`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.white} />
              </Degradado>
            </Presionable>
            </Pulso>
          )}

          <Text style={styles.seccionTitulo}>Ingredientes</Text>
          {receta.detallesIngredientes.length > 0 && (
            <Porciones personas={personas} modo={modo} onPersonas={setPersonas} onModo={setModo} />
          )}
          {receta.detallesIngredientes.length === 0 ? (
            <Text style={styles.vacioTexto}>Sin ingredientes registrados.</Text>
          ) : (
            <View style={styles.panelIngredientes}>
            {receta.detallesIngredientes.map((item, idx) => (
              <Aparecer key={idx} delay={Math.min(idx, 10) * 60} distancia={12}>
                <View style={styles.ingredienteRow}>
                  <View style={styles.puntoIngrediente} />
                  <Text style={styles.ingredienteTexto}>
                    {textoIngrediente(item.cantidad, item.unidad, item.ingrediente.nombre, personas, modo)}
                  </Text>
                </View>
              </Aparecer>
            ))}
            </View>
          )}

          <Text style={styles.seccionTitulo}>Preparación</Text>
          {receta.pasos.length === 0 ? (
            <Text style={styles.vacioTexto}>Sin pasos registrados.</Text>
          ) : (
            [...receta.pasos]
              .sort((a, b) => a.orden - b.orden)
              .map((paso) => (
                <View key={paso.id} style={styles.pasoTarjeta}>
                  <View style={styles.pasoNumero}>
                    <Text style={styles.pasoNumeroTexto}>{paso.orden}</Text>
                  </View>
                  <Text style={styles.pasoTexto}>{paso.instruccion}</Text>
                </View>
              ))
          )}

          <Text style={styles.seccionTitulo}>Reseñas</Text>
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

          <Text style={styles.seccionTitulo}>Comentarios ({comentarios.length})</Text>

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
        </Aparecer>
      </ScrollView>

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
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  imagenContainer: { width: '100%', height: 300, padding: 12, backgroundColor: colors.primaryLight, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  imagen: { width: '100%', height: '100%', borderRadius: 30 },
  imagenPlaceholder: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  botonAtras: {
    position: 'absolute', top: spacing.lg + 12, left: spacing.md + 12,
    width: 42, height: 42, borderRadius: radius.pill, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  botonFavorito: {
    position: 'absolute', top: spacing.lg + 12, right: spacing.md + 12,
    width: 42, height: 42, borderRadius: radius.pill, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  contenido: { padding: spacing.md },
  titulo: { ...typography.h1, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: spacing.sm, gap: 8 },
  pastilla: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  pastillaTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  panelIngredientes: { backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: spacing.md, gap: 4 },
  pasoTarjeta: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginTop: spacing.sm, ...shadow.card },
  metaTexto: { ...typography.bodySmall, color: colors.textMuted },
  descripcion: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  cocinaGuiadaSombra: { marginTop: spacing.md, borderRadius: radius.lg, ...shadow.card },
  botonCocinaGuiada: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.lg, paddingVertical: 16, paddingHorizontal: spacing.md,
  },
  cocinaGuiadaTitulo: { ...typography.button, color: colors.white, fontSize: 16 },
  cocinaGuiadaSub: { ...typography.bodySmall, color: colors.onPrimary },
  seccionTitulo: { ...typography.h2, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  subTitulo: { ...typography.h3, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm, fontSize: 15 },
  vacioTexto: { ...typography.bodySmall, color: colors.textMuted },
  ingredienteRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  puntoIngrediente: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: spacing.sm },
  ingredienteTexto: { ...typography.body, color: colors.text },
  pasoRow: { flexDirection: 'row', marginTop: spacing.md },
  pasoNumero: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  pasoNumeroTexto: { ...typography.bodySmall, color: colors.primary, fontWeight: 'bold' },
  pasoTexto: { ...typography.body, color: colors.text, flex: 1 },
  tarjeta: {
    backgroundColor: colors.surface, 
    borderRadius: radius.md, 
    padding: spacing.md,
    marginTop: spacing.md, 
    ...shadow.card,
  },
  filaAutor: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  autorNombre: { ...typography.body, fontWeight: 'bold', color: colors.text },
  comentarioTexto: { ...typography.body, color: colors.text },
  filaInputComentario: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.sm },
  inputComentario: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, height: 44, color: colors.text,
  },
  botonEnviar: {
    backgroundColor: colors.primary, width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  inputResena: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, height: 80, color: colors.text,
    textAlignVertical: 'top', marginVertical: spacing.sm,
  },
});