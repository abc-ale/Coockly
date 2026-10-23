// components/NotificacionesVacio.tsx
// Estado vacío de Notificaciones, según el mockup: pollito (imágenes en Cloudinary), frase graciosa
// y las dos cosas de las que avisaremos. Al tocar el pollito da un saltito.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../constants/theme';

// Pollito en Cloudinary, pedido a 600 px de ancho y en el mejor formato para ahorrar datos.
const POLLITO = 'https://res.cloudinary.com/pjbmwoxn/image/upload/f_auto,q_auto,w_600/v1791698097/pollito.png';

const TAM = 190;

export default function NotificacionesVacio() {
  const [fallo, setFallo] = useState(false);

  // Respira suave: sube y baja unos pixeles, y da un saltito al tocarlo.
  const flota = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(flota, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flota, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    bucle.start();
    return () => bucle.stop();
  }, [flota]);

  const saltito = () => {
    pop.setValue(0.9);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
  };

  const subir = flota.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <View style={st.contenedor}>
      <Pressable onPress={saltito} style={st.zona} accessibilityRole="button" accessibilityLabel="Pollito llorando">
        <View style={st.circulo} />
        <Animated.View style={{ transform: [{ translateY: subir }, { scale: pop }] }}>
          {fallo ? (
            <View style={st.respaldo}>
              <Ionicons name="notifications-off-outline" size={64} color={colors.primary} />
            </View>
          ) : (
            <Image source={{ uri: POLLITO }} style={st.imagen} resizeMode="contain" onError={() => setFallo(true)} />
          )}
        </Animated.View>
      </Pressable>

      <Text style={st.titulo}>Más vacío que mi refri a fin de mes</Text>
      <Text style={st.sub}>Tranqui, que lo bueno se está cocinando. Apenas salga del horno, te avisamos.</Text>

      <Text style={st.aviso}>Eso sí, te avisaremos de</Text>
      <Fila
        fondo={colors.accent}
        icono="restaurant-outline"
        titulo="Recetas nuevas"
        texto="Apenas salga una receta nueva, serás la primera en saber."
      />
      <Fila
        fondo="#FFC2CF"
        icono="heart-outline"
        titulo="Reacciones"
        texto="Cuando alguien le dé like o comente tus publicaciones."
      />
      <Fila
        fondo="#BEE3A5"
        icono="flag-outline"
        titulo="Tus reportes"
        texto="Cuando revisemos lo que nos contaste."
      />
    </View>
  );
}

function Fila({ fondo, icono, titulo, texto }: { fondo: string; icono: keyof typeof Ionicons.glyphMap; titulo: string; texto: string }) {
  return (
    <View style={st.fila}>
      <View style={[st.filaIcono, { backgroundColor: fondo }]}>
        <Ionicons name={icono} size={22} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.filaTitulo}>{titulo}</Text>
        <Text style={st.filaTexto}>{texto}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  contenedor: { alignItems: 'center', paddingTop: spacing.sm },
  zona: { width: TAM + 20, height: TAM + 10, alignItems: 'center', justifyContent: 'center' },
  circulo: { position: 'absolute', width: TAM - 20, height: TAM - 20, borderRadius: (TAM - 20) / 2, backgroundColor: '#FFEEF0' },
  imagen: { width: TAM, height: TAM },
  respaldo: { width: TAM, height: TAM, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: fonts.display, fontSize: 25, lineHeight: 31, color: colors.text, textAlign: 'center', marginTop: 18, paddingHorizontal: 20 },
  sub: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 },
  aviso: { alignSelf: 'flex-start', fontFamily: fonts.heading, fontSize: 14, color: '#7A6370', marginTop: 24, marginBottom: 10 },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: 14, alignSelf: 'stretch', backgroundColor: colors.white,
    borderRadius: 24, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10,
    shadowColor: colors.text, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  filaIcono: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  filaTexto: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: 1 },
});