// app/receta/[id].tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, Pressable, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, radius, spacing, typography, shadow } from '../../constants/theme';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Stars from '../../components/Stars';
import Button from '../../components/Button';
import EtiquetasReceta from '../../components/EtiquetasReceta';


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
  const { id } = useLocalSearchParams<{ id: string }>();
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
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [enviandoResena, setEnviandoResena] = useState(false);

  const cargarTodo = useCallback(async () => {
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
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo cargar la receta.');
    } finally {
      setCargando(false);
    }
  }, [id, usuario]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  async function alternarFavorito() {
    try {
      if (esFavorito) {
        await api.delete(`/recetas/${id}/favorito`);
      } else {
        await api.post(`/recetas/${id}/favorito`);
      }
      setEsFavorito(!esFavorito);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo actualizar el favorito.');
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
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo publicar el comentario.');
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
      Alert.alert('¡Gracias!', 'Tu reseña se guardó.');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.mensaje || 'No se pudo guardar tu reseña.');
    } finally {
      setEnviandoResena(false);
    }
  }

  if (cargando || !receta) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={styles.imagenContainer}>
          {imagenUrl ? (
            <Image source={{ uri: imagenUrl }} style={styles.imagen} />
          ) : (
            <View style={[styles.imagen, styles.imagenPlaceholder]}>
              <Ionicons name="restaurant-outline" size={48} color={colors.primary} />
            </View>
          )}

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

        <View style={styles.contenido}>
          <Text style={styles.titulo}>{receta.nombre}</Text>
          
          {/* Componente de Etiquetas agregado aquí debajo del título */}
          <EtiquetasReceta recetaId={Number(id)} />

          <View style={styles.metaRow}>
            <Stars value={promedio} size={16} />
            <Text style={styles.metaTexto}>{promedio.toFixed(1)} ({resenas.length})</Text>
            {receta.minutosPreparacion ? (
              <>
                <Ionicons name="time-outline" size={15} color={colors.textMuted} style={{ marginLeft: spacing.md }} />
                <Text style={styles.metaTexto}>{receta.minutosPreparacion} min</Text>
              </>
            ) : null}
          </View>

          {receta.descripcion ? <Text style={styles.descripcion}>{receta.descripcion}</Text> : null}

          <Text style={styles.seccionTitulo}>Ingredientes</Text>
          {receta.detallesIngredientes.length === 0 ? (
            <Text style={styles.vacioTexto}>Sin ingredientes registrados.</Text>
          ) : (
            receta.detallesIngredientes.map((item, idx) => (
              <View key={idx} style={styles.ingredienteRow}>
                <View style={styles.puntoIngrediente} />
                <Text style={styles.ingredienteTexto}>
                  {item.cantidad} {item.unidad} de {item.ingrediente.nombre}
                </Text>
              </View>
            ))
          )}

          <Text style={styles.seccionTitulo}>Preparación</Text>
          {receta.pasos.length === 0 ? (
            <Text style={styles.vacioTexto}>Sin pasos registrados.</Text>
          ) : (
            receta.pasos
              .sort((a, b) => a.orden - b.orden)
              .map((paso) => (
                <View key={paso.id} style={styles.pasoRow}>
                  <View style={styles.pasoNumero}>
                    <Text style={styles.pasoNumeroTexto}>{paso.orden}</Text>
                  </View>
                  <Text style={styles.pasoTexto}>{paso.instruccion}</Text>
                </View>
              ))
          )}

          <Text style={styles.seccionTitulo}>Tu reseña</Text>
          <View style={styles.tarjeta}>
            <Stars value={miPuntuacion} size={26} onChange={setMiPuntuacion} />
            <TextInput
              placeholder="Cuéntanos qué te pareció (opcional)"
              placeholderTextColor={colors.textMuted}
              value={miComentarioResena}
              onChangeText={setMiComentarioResena}
              style={styles.inputResena}
              multiline
            />
            <Button label="Guardar reseña" onPress={enviarResena} loading={enviandoResena} />
          </View>

          {resenas.filter((r) => r.usuario.correo !== usuario?.correo).length > 0 && (
            <>
              <Text style={styles.subTitulo}>Otras reseñas</Text>
              {resenas
                .filter((r) => r.usuario.correo !== usuario?.correo)
                .map((r) => (
                  <View key={r.id} style={styles.tarjeta}>
                    <View style={styles.filaAutor}>
                      <Text style={styles.autorNombre}>{r.usuario.nombre}</Text>
                      <Stars value={r.puntuacion} size={14} />
                    </View>
                    {r.comentario ? <Text style={styles.comentarioTexto}>{r.comentario}</Text> : null}
                  </View>
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  imagenContainer: { width: '100%', height: 240 },
  imagen: { width: '100%', height: '100%' },
  imagenPlaceholder: { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  botonAtras: {
    position: 'absolute', top: spacing.lg, left: spacing.md,
    width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  botonFavorito: {
    position: 'absolute', top: spacing.lg, right: spacing.md,
    width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  contenido: { padding: spacing.md },
  titulo: { ...typography.h1, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 4 },
  metaTexto: { ...typography.bodySmall, color: colors.textMuted },
  descripcion: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  seccionTitulo: { ...typography.h3, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  subTitulo: { ...typography.h3, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm, fontSize: 15 },
  vacioTexto: { ...typography.bodySmall, color: colors.textMuted },
  ingredienteRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  puntoIngrediente: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: spacing.sm },
  ingredienteTexto: { ...typography.body, color: colors.text },
  pasoRow: { flexDirection: 'row', marginTop: spacing.md },
  pasoNumero: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primaryLight,
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