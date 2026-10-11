// app/(tabs)/profile.tsx
// Perfil según el mockup: cabecera rosada con avatar, estadísticas, Menú express, historial y cuenta.
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { mostrarAlerta } from '../../components/Dialogo';
import { Aparecer, Rebote, Presionable } from '../../components/Animaciones';
import AvatarPerfil from '../../components/AvatarPerfil';
import { cargarAvatar, type Avatar } from '../../lib/avatar';

const SOMBRA = {
  shadowColor: colors.text, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3,
} as const;

export default function ProfileScreen() {
  const { usuario, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';

  const [favoritas, setFavoritas] = useState<number | null>(null);
  const [listas, setListas] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<Avatar | null>(null);

  // Estadísticas: se actualizan cada vez que se abre la pestaña.
  useFocusEffect(
    useCallback(() => {
      cargarAvatar(usuario?.correo).then(setAvatar);
      if (esAdmin) return;
      api.get('/recetas/favoritos').then((r) => setFavoritas(Array.isArray(r.data) ? r.data.length : 0)).catch(() => {});
      api.get('/listas-compra').then((r) => setListas(Array.isArray(r.data) ? r.data.length : 0)).catch(() => {});
    }, [esAdmin, usuario?.correo])
  );

  function confirmarCerrarSesion() {
    mostrarAlerta('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  }

  const abrirEditar = () => router.push('/cambiar-nombre');
  const abrirFoto = () => router.push('/foto-perfil');

  const nombre = usuario?.nombre ?? 'Usuario';
  const inicial = nombre.trim().charAt(0).toUpperCase() || 'C';

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      {/* Cabecera: sube hasta arriba del todo, por detrás de la barra de estado */}
      <View style={[st.cabecera, { marginTop: -(insets.top + spacing.sm), paddingTop: insets.top + 20 }]}>
        <View style={st.decoAmarilla} />
        <View style={st.decoVerde} />
        <Text style={st.titulo}>Mi perfil</Text>

        <Rebote>
          <View style={st.avatarCaja}>
            <Pressable onPress={abrirFoto} accessibilityLabel="Cambiar foto de perfil">
              <AvatarPerfil avatar={avatar} inicial={inicial} tam={112} radio={38} borde={4} style={st.avatar} />
            </Pressable>
            <Pressable onPress={abrirFoto} style={st.lapiz} accessibilityLabel="Cambiar foto de perfil" hitSlop={6}>
              <Ionicons name="pencil" size={16} color={colors.text} />
            </Pressable>
          </View>
        </Rebote>

        <Aparecer delay={120}>
          <Text style={st.nombre}>{nombre}</Text>
        </Aparecer>
        <Aparecer delay={180}>
          <Text style={st.correo}>{usuario?.correo}</Text>
        </Aparecer>
      </View>

      <View style={st.cuerpo}>
        {!esAdmin && (
          <Aparecer delay={220}>
            <View style={st.statsFila}>
              <View style={[st.stat, { backgroundColor: colors.accent }]}>
                <Text style={st.statNumero}>{favoritas ?? '–'}</Text>
                <Text style={st.statTexto}>Recetas favoritas</Text>
              </View>
              <View style={[st.stat, { backgroundColor: colors.magic }]}>
                <Text style={st.statNumero}>{listas ?? '–'}</Text>
                <Text style={st.statTexto}>Listas activas</Text>
              </View>
            </View>
          </Aparecer>
        )}

        <Aparecer delay={280}>
          <Presionable escalaAlPresionar={0.97} style={st.express} onPress={() => router.push('/menu-express')}>
            <View style={st.expressIcono}>
              <Ionicons name="flash" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.expressTitulo}>Menú express</Text>
              <Text style={st.expressSub}>Ideas listas en 15 minutos</Text>
            </View>
            <View style={st.nuevo}>
              <Text style={st.nuevoTexto}>Nuevo</Text>
            </View>
          </Presionable>
        </Aparecer>

        <Aparecer delay={310}>
          <Presionable escalaAlPresionar={0.97} style={st.fila} onPress={() => router.push('/ruleta')}>
            <View style={[st.filaIcono, { backgroundColor: colors.accent }]}>
              <Ionicons name="dice-outline" size={22} color={colors.text} />
            </View>
            <Text style={st.filaTexto}>Ruleta del antojo</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Presionable>
        </Aparecer>

        <Aparecer delay={340}>
          <Presionable escalaAlPresionar={0.97} style={st.fila} onPress={() => router.push('/historial')}>
            <View style={[st.filaIcono, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="time-outline" size={22} color={colors.primary} />
            </View>
            <Text style={st.filaTexto}>Historial de recetas</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Presionable>
        </Aparecer>

        <Aparecer delay={400}>
          <Presionable escalaAlPresionar={0.97} style={st.fila} onPress={abrirEditar}>
            <View style={[st.filaIcono, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="pencil" size={20} color={colors.primary} />
            </View>
            <Text style={st.filaTexto}>Cambiar nombre</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Presionable>
        </Aparecer>

        <Aparecer delay={430}>
          <Presionable escalaAlPresionar={0.97} style={st.fila} onPress={() => router.push('/cambiar-contrasena')}>
            <View style={[st.filaIcono, { backgroundColor: colors.magic }]}>
              <Ionicons name="lock-closed" size={20} color={colors.text} />
            </View>
            <Text style={st.filaTexto}>Cambiar contraseña</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Presionable>
        </Aparecer>

        <Aparecer delay={460}>
          <Presionable escalaAlPresionar={0.97} style={st.salir} onPress={confirmarCerrarSesion}>
            <Ionicons name="log-out-outline" size={22} color={colors.primary} />
            <Text style={st.salirTexto}>Cerrar sesión</Text>
          </Presionable>
        </Aparecer>
      </View>

    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  cabecera: {
    alignItems: 'center', backgroundColor: colors.primaryLight, borderBottomLeftRadius: 44, borderBottomRightRadius: 44,
    paddingBottom: 22, overflow: 'hidden',
  },
  decoAmarilla: { position: 'absolute', top: 60, right: -34, width: 84, height: 84, borderRadius: 42, backgroundColor: colors.accent },
  decoVerde: { position: 'absolute', top: 90, left: 28, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.magic },
  titulo: { fontFamily: fonts.heading, fontSize: 18, color: colors.text, marginBottom: 18 },
  avatarCaja: { width: 112, height: 112, marginBottom: 12 },
  avatar: {
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  avatarLetra: { fontFamily: fonts.display, fontSize: 54, lineHeight: 64, color: colors.white },
  lapiz: {
    position: 'absolute', right: -6, bottom: -6, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white,
  },
  nombre: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.text },
  correo: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  cuerpo: { paddingHorizontal: 20, paddingTop: 18, gap: 12 },
  statsFila: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, borderRadius: 26, paddingVertical: 16, paddingHorizontal: 18, justifyContent: 'center' },
  statNumero: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.text },
  statTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.text, marginTop: 2 },
  express: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.accent, borderRadius: 28,
    paddingVertical: 14, paddingHorizontal: 16,
    shadowColor: colors.accent, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5,
  },
  expressIcono: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  expressTitulo: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  expressSub: { fontFamily: fonts.body, fontSize: 13, color: colors.text, opacity: 0.8, marginTop: 1 },
  nuevo: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  nuevoTexto: { fontFamily: fonts.heading, fontSize: 12, color: colors.white },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: 14, height: 68, backgroundColor: colors.white, borderRadius: 26,
    paddingHorizontal: 14, ...SOMBRA,
  },
  filaIcono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  filaTexto: { flex: 1, fontFamily: fonts.heading, fontSize: 17, color: colors.text },
  salir: {
    height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 30,
    borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.background, marginTop: 4,
  },
  salirTexto: { fontFamily: fonts.heading, fontSize: 17, color: colors.primary },
});