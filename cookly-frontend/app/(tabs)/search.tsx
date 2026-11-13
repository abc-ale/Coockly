// app/(tabs)/search.tsx
// Buscar: recetas reales del servidor, con búsqueda por nombre y filtro por categoría.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TarjetaReceta } from '../../components/RecipeCard';
import BotonChat from '../../components/BotonChat';
import TarjetaBusqueda from '../../components/TarjetaBusqueda';
import FiltroEtiquetas from '../../components/FiltroEtiquetas';
import { EsqueletoTarjetas } from '../../components/Esqueleto';
import EstadoVacio from '../../components/EstadoVacio';
import { Aparecer } from '../../components/Animaciones';
import { colors, fonts, radius, spacing, typography } from '../../constants/theme';
import { api } from '../../lib/api';
import { useConPromedios } from '../../lib/promedios';

export default function SearchScreen() {
  const [busqueda, setBusqueda] = useState('');
  const [textoActivo, setTextoActivo] = useState(''); // el texto ya "calmado" (espera 350 ms al escribir)
  const [etiqueta, setEtiqueta] = useState<number | null>(null);
  const [recetasBase, setRecetas] = useState<TarjetaReceta[]>([]);
  const recetas = useConPromedios(recetasBase);
  const [cargando, setCargando] = useState(true);
  const peticion = useRef(0); // para ignorar respuestas viejas si el usuario sigue escribiendo

  // Espera un momento después de dejar de escribir antes de buscar.
  useEffect(() => {
    const t = setTimeout(() => setTextoActivo(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(async (texto: string, etiquetaId: number | null) => {
    const numero = ++peticion.current;
    setCargando(true);
    try {
      const { data } =
        etiquetaId !== null
          ? await api.get(`/recetas/por-etiqueta/${etiquetaId}`, { params: { pagina: 0, tamano: 30 } })
          : await api.get('/recetas/buscar', { params: { texto, pagina: 0, tamano: 30 } });
      if (numero !== peticion.current) return;
      let lista: TarjetaReceta[] = data.content ?? [];
      // Con categoría y texto a la vez, el texto filtra dentro de la categoría.
      if (etiquetaId !== null && texto) {
        const q = texto.toLowerCase();
        lista = lista.filter((r) => r.nombre.toLowerCase().includes(q));
      }
      setRecetas(lista);
    } catch (error: any) {
      if (numero !== peticion.current) return;
      Alert.alert('No se pudo buscar', error?.response?.data?.mensaje || 'No pudimos cargar las recetas. Inténtalo de nuevo.');
    } finally {
      if (numero === peticion.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(textoActivo, etiqueta);
  }, [textoActivo, etiqueta, cargar]);

  const hayFiltro = textoActivo !== '' || etiqueta !== null;

  return (
    <View style={styles.screen}>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Buscar</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.primary} />
        <TextInput
          placeholder="Buscar recetas por nombre..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={busqueda}
          onChangeText={setBusqueda}
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        {busqueda.length > 0 && (
          <Pressable onPress={() => setBusqueda('')} hitSlop={10} style={styles.limpiar}>
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
        )}
      </View>

      <FiltroEtiquetas seleccionada={etiqueta} onCambiar={setEtiqueta} />

      <ScrollView
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {cargando && recetas.length === 0 ? (
          <View style={{ marginHorizontal: -spacing.md }}>
            <EsqueletoTarjetas cantidad={4} />
          </View>
        ) : recetas.length === 0 ? (
          <EstadoVacio
            icono="search-outline"
            titulo={hayFiltro ? 'No encontramos recetas' : 'Aún no hay recetas'}
            texto={
              textoActivo
                ? `No hay resultados para "${textoActivo}". Prueba con otra palabra.`
                : hayFiltro
                ? 'No hay recetas en esta categoría todavía.'
                : 'Pronto habrá recetas nuevas por aquí.'
            }
            etiquetaBoton={hayFiltro ? 'Limpiar búsqueda' : undefined}
            onBoton={
              hayFiltro
                ? () => {
                    setBusqueda('');
                    setEtiqueta(null);
                  }
                : undefined
            }
          />
        ) : (
          <>
            <Aparecer>
              <Text style={styles.contador}>
                <Text style={styles.contadorNumero}>{recetas.length} {recetas.length === 1 ? 'receta' : 'recetas'}</Text>
                {recetas.length === 1 ? ' encontrada' : ' encontradas'}
              </Text>
            </Aparecer>
            <View style={[styles.grid, cargando && { opacity: 0.5 }]}>
              {recetas.map((receta, i) => (
                <TarjetaBusqueda
                  key={receta.id}
                  indice={i}
                  nombre={receta.nombre}
                  portada={receta.portada}
                  minutos={receta.minutosPreparacion}
                  promedio={receta.promedio}
                  onPress={() => router.push(`/receta/${receta.id}`)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <BotonChat />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.md },
  encabezado: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  titulo: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.text },
  subtitulo: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    marginBottom: spacing.xs,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text, paddingVertical: 0 },
  lista: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 110 },
  contador: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginBottom: spacing.md, marginTop: spacing.xs },
  contadorNumero: { fontFamily: fonts.bodyBold, color: colors.text },
  limpiar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});