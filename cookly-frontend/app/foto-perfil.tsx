// app/foto-perfil.tsx
// Personalizar foto de perfil según el mockup: elige un animalito (6) y su color de fondo (5).
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { Aparecer, Presionable, Rebote } from '../components/Animaciones';
import { mostrarAviso } from '../components/Aviso';
import AvatarPerfil from '../components/AvatarPerfil';
import { ANIMALES, AVATAR_INICIAL, FONDOS, buscarAnimal, cargarAvatar, guardarAvatar, type Avatar } from '../lib/avatar';
import { exito, seleccion } from '../lib/vibracion';

const MARGEN = 20;
const HUECO = 12;

export default function FotoPerfilScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { usuario } = useAuth();

  const [avatar, setAvatar] = useState<Avatar>(AVATAR_INICIAL);
  const [fondoPropio, setFondoPropio] = useState(false); // true si la persona ya escogió un color a mano
  const [guardando, setGuardando] = useState(false);

  // Descarga los 6 personajes de una vez para que aparezcan al instante.
  useEffect(() => {
    ANIMALES.forEach((a) => Image.prefetch(a.uri).catch(() => {}));
  }, []);

  // Si ya tenía una foto, la mostramos seleccionada.
  useEffect(() => {
    cargarAvatar(usuario?.correo).then((guardado) => {
      if (guardado) {
        setAvatar(guardado);
        setFondoPropio(true);
      }
    });
  }, [usuario?.correo]);

  const ancho = (width - MARGEN * 2 - HUECO * 2) / 3;

  const elegirAnimal = (id: Avatar['animal']) => {
    seleccion();
    const animal = buscarAnimal(id);
    setAvatar((a) => ({ animal: id, fondo: fondoPropio || !animal ? a.fondo : animal.fondoBase }));
  };

  const elegirFondo = (color: string) => {
    seleccion();
    setFondoPropio(true);
    setAvatar((a) => ({ ...a, fondo: color }));
  };

  const guardar = async () => {
    if (guardando) return;
    setGuardando(true);
    try {
      if (usuario?.correo) await guardarAvatar(usuario.correo, avatar);
      exito();
      mostrarAviso('Foto actualizada', 'exito');
      router.back();
    } catch {
      mostrarAviso('No se pudo guardar tu foto', 'info');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={st.pantalla}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Cabecera */}
        <View style={[st.cabecera, { paddingTop: insets.top + 14 }]}>
          <View style={st.decoAmarilla} />
          <View style={st.decoVerde} />
          <View style={st.cabeceraFila}>
            <Presionable onPress={() => router.back()} style={st.volver} accessibilityLabel="Volver">
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Presionable>
            <Text style={st.titulo}>Foto de perfil</Text>
            <View style={{ width: 44 }} />
          </View>

          <Rebote>
            <View style={st.previa}>
              <AvatarPerfil avatar={avatar} tam={128} borde={6} style={{ shadowColor: avatar.fondo, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8 }} />
              <View style={st.lapiz}>
                <Ionicons name="pencil" size={16} color={colors.text} />
              </View>
            </View>
          </Rebote>
          <Text style={st.previaTexto}>Así se verá tu foto</Text>
        </View>

        {/* Animalitos */}
        <View style={st.cuerpo}>
          <Aparecer delay={80}>
            <Text style={st.seccion}>Elige tu skin</Text>
            <Text style={st.seccionSub}>Tu talento culinario sigue cargando…</Text>
          </Aparecer>

          <View style={st.grilla}>
            {ANIMALES.map((animal, i) => {
              const activo = avatar.animal === animal.id;
              return (
                <Aparecer key={animal.id} delay={120 + i * 50}>
                  <Pressable
                    onPress={() => elegirAnimal(animal.id)}
                    accessibilityRole="button"
                    accessibilityLabel={animal.nombre}
                    accessibilityState={{ selected: activo }}
                    style={[st.tarjeta, { width: ancho }, activo && st.tarjetaActiva]}
                  >
                    <AvatarPerfil avatar={{ animal: animal.id, fondo: activo ? avatar.fondo : animal.fondoBase }} tam={Math.min(ancho - 22, 84)} />
                    {activo && (
                      <View style={st.palomita}>
                        <Ionicons name="checkmark" size={14} color={colors.white} />
                      </View>
                    )}
                  </Pressable>
                </Aparecer>
              );
            })}
          </View>

          {/* Colores de fondo */}
          <Aparecer delay={440}>
            <View style={st.fondos}>
              <Text style={st.fondosTitulo}>Color{'\n'}de fondo</Text>
              <View style={st.fondosFila}>
                {FONDOS.map((f) => {
                  const activo = avatar.fondo === f.color;
                  return (
                    <Pressable
                      key={f.color}
                      onPress={() => elegirFondo(f.color)}
                      accessibilityRole="button"
                      accessibilityLabel={`Fondo ${f.nombre}`}
                      accessibilityState={{ selected: activo }}
                      style={[st.anillo, activo && st.anilloActivo]}
                    >
                      <View style={[st.muestra, { backgroundColor: f.color }, !activo && st.muestraBorde]}>
                        {activo && <Ionicons name="checkmark" size={16} color={f.color === colors.accent || f.color === colors.magic || f.color === colors.primaryLight ? colors.text : colors.white} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Aparecer>
        </View>
      </ScrollView>

      {/* Botón fijo */}
      <View style={[st.pie, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Presionable escalaAlPresionar={0.97} onPress={guardar} disabled={guardando} style={st.boton} accessibilityLabel="Guardar foto">
          {guardando ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={st.botonTexto}>Guardar foto</Text>
              <Ionicons name="checkmark" size={20} color={colors.white} />
            </>
          )}
        </Presionable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  cabecera: {
    alignItems: 'center', backgroundColor: colors.primaryLight, borderBottomLeftRadius: 44, borderBottomRightRadius: 44,
    paddingBottom: 20, overflow: 'hidden',
  },
  decoAmarilla: { position: 'absolute', top: 90, right: -40, width: 110, height: 110, borderRadius: 55, backgroundColor: colors.accent },
  decoVerde: { position: 'absolute', top: 160, left: -34, width: 84, height: 84, borderRadius: 42, backgroundColor: colors.magic },
  cabeceraFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: MARGEN, marginBottom: 16 },
  volver: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.text, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  titulo: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  previa: { width: 128, height: 128 },
  lapiz: {
    position: 'absolute', right: -6, bottom: -4, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white,
  },
  previaTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.textMuted, marginTop: 14 },

  cuerpo: { paddingHorizontal: MARGEN, paddingTop: 22 },
  seccion: { fontFamily: fonts.display, fontSize: 23, lineHeight: 30, color: colors.text },
  seccionSub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 2 },

  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: HUECO, marginTop: 16 },
  tarjeta: {
    height: 116, borderRadius: 26, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'transparent',
    shadowColor: colors.text, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },
  tarjetaActiva: { borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.25, elevation: 5 },
  palomita: {
    position: 'absolute', top: -7, right: -7, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.background,
  },

  fondos: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, height: 62,
    paddingLeft: 18, paddingRight: 12, borderRadius: 31, backgroundColor: colors.white,
    shadowColor: colors.text, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },
  fondosTitulo: { fontFamily: fonts.heading, fontSize: 14, lineHeight: 17, color: colors.text },
  fondosFila: { flexDirection: 'row', gap: 4 },
  anillo: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: 'transparent' },
  anilloActivo: { borderColor: colors.primary },
  muestra: { width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  muestraBorde: { borderWidth: 1, borderColor: 'rgba(43,18,32,0.12)' },

  pie: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: MARGEN, paddingTop: 12, backgroundColor: 'rgba(255,248,246,0.94)' },
  boton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 58, borderRadius: 29, backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  botonTexto: { fontFamily: fonts.heading, fontSize: 17, color: colors.white },
});