// components/Resenas.tsx
// Reseñas con el estilo de tarjetas grandes y redondeadas de Cookly:
// resumen con promedio y barras, formulario con estrellas grandes y tarjetas de otras personas.
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../constants/theme';
import { seleccion } from '../lib/vibracion';
import { Aparecer } from './Animaciones';

export type ResenaItem = {
  id: number;
  puntuacion: number;
  comentario: string | null;
  creadoEn?: string;
  usuario: { nombre: string; correo: string };
};

const PALABRAS = ['', 'Muy mala', 'Regular', 'Buena', 'Muy rica', '¡Me encantó!'];

function fechaCorta(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 30) return `Hace ${dias} días`;
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function EstrellasFijas({ valor, tam = 14 }: { valor: number; tam?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={valor >= n ? 'star' : 'star-outline'} size={tam} color={valor >= n ? colors.warning : colors.border} />
      ))}
    </View>
  );
}

/* ---------- Resumen: promedio grande y barras por estrella ---------- */
export function ResumenResenas({ resenas, promedio }: { resenas: ResenaItem[]; promedio: number }) {
  const total = resenas.length;
  if (total === 0) return null;
  return (
    <View style={s.tarjeta}>
      <View style={s.resumenFila}>
        <View style={s.promedioCaja}>
          <Text style={s.promedioNumero}>{promedio.toFixed(1)}</Text>
          <EstrellasFijas valor={Math.round(promedio)} tam={13} />
          <Text style={s.promedioTotal}>{total} {total === 1 ? 'reseña' : 'reseñas'}</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          {[5, 4, 3, 2, 1].map((n) => {
            const cuantas = resenas.filter((r) => r.puntuacion === n).length;
            return (
              <View key={n} style={s.barraFila}>
                <Text style={s.barraNumero}>{n}</Text>
                <View style={s.barraFondo}>
                  <View style={[s.barraRelleno, { width: `${(cuantas / total) * 100}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ---------- Formulario: estrellas grandes con rebote y palabra ---------- */
function EstrellaGrande({ n, activa, alTocar }: { n: number; activa: boolean; alTocar: () => void }) {
  const escala = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (activa) {
      escala.setValue(0.7);
      Animated.spring(escala, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
    }
  }, [activa, escala]);
  return (
    <Pressable onPress={alTocar} hitSlop={6}>
      <Animated.View style={{ transform: [{ scale: escala }] }}>
        <Ionicons name={activa ? 'star' : 'star-outline'} size={40} color={activa ? colors.warning : colors.border} />
      </Animated.View>
    </Pressable>
  );
}

type FormProps = {
  puntuacion: number;
  comentario: string;
  onPuntuacion: (n: number) => void;
  onComentario: (t: string) => void;
  onEnviar: () => void;
  enviando: boolean;
  yaTieneResena: boolean;
};

export function FormularioResena({ puntuacion, comentario, onPuntuacion, onComentario, onEnviar, enviando, yaTieneResena }: FormProps) {
  return (
    <View style={s.tarjeta}>
      <Text style={s.tituloForm}>{yaTieneResena ? 'Tu reseña' : '¿Qué te pareció?'}</Text>
      <Text style={s.subForm}>Toca las estrellas para calificar</Text>

      <View style={s.estrellasFila}>
        {[1, 2, 3, 4, 5].map((n) => (
          <EstrellaGrande
            key={n}
            n={n}
            activa={puntuacion >= n}
            alTocar={() => {
              seleccion();
              onPuntuacion(n);
            }}
          />
        ))}
      </View>
      <Text style={s.palabra}>{PALABRAS[puntuacion] || ' '}</Text>

      <TextInput
        placeholder="Cuéntanos más (opcional)"
        placeholderTextColor={colors.textMuted}
        value={comentario}
        onChangeText={onComentario}
        style={s.input}
        multiline
      />

      <Pressable onPress={onEnviar} disabled={enviando} style={({ pressed }) => [s.boton, pressed && { opacity: 0.85 }]}>
        {enviando ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Ionicons name="paper-plane" size={16} color={colors.white} />
            <Text style={s.botonTexto}>{yaTieneResena ? 'Actualizar reseña' : 'Publicar reseña'}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

/* ---------- Reseña de otra persona ---------- */
export function TarjetaResena({ resena, indice = 0 }: { resena: ResenaItem; indice?: number }) {
  const inicial = (resena.usuario.nombre || '?').trim().charAt(0).toUpperCase();
  return (
    <Aparecer delay={Math.min(indice, 5) * 70} distancia={12}>
      <View style={s.tarjeta}>
        <View style={s.autorFila}>
          <View style={s.avatar}>
            <Text style={s.avatarTexto}>{inicial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.autor} numberOfLines={1}>{resena.usuario.nombre}</Text>
            <Text style={s.fecha}>{fechaCorta(resena.creadoEn)}</Text>
          </View>
          <View style={s.puntoCaja}>
            <Ionicons name="star" size={13} color={colors.warning} />
            <Text style={s.puntoTexto}>{resena.puntuacion}</Text>
          </View>
        </View>
        {resena.comentario ? <Text style={s.comentario}>{resena.comentario}</Text> : null}
      </View>
    </Aparecer>
  );
}

const s = StyleSheet.create({
  tarjeta: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  resumenFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  promedioCaja: { alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 18, gap: 4 },
  promedioNumero: { fontFamily: fonts.displayBold, fontSize: 34, lineHeight: 38, color: colors.primary },
  promedioTotal: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barraNumero: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textMuted, width: 10 },
  barraFondo: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.primaryLight, overflow: 'hidden' },
  barraRelleno: { height: 8, borderRadius: 4, backgroundColor: colors.primary },

  tituloForm: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, textAlign: 'center' },
  subForm: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  estrellasFila: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.md },
  palabra: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.primary, textAlign: 'center', marginTop: 6, minHeight: 22 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    marginTop: spacing.sm,
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    marginTop: spacing.md,
  },
  botonTexto: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },

  autorFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.primary },
  autor: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  fecha: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 1 },
  puntoCaja: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  puntoTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  comentario: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text, marginTop: spacing.sm },
});