import { useEffect } from 'react';
import { AppState, Text, View } from 'react-native';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { pintarBarraNavegacion } from '../../lib/barraNavegacion';
import { escucharToques, reprogramarRecordatorios } from '../../lib/recordatorios';
import { onboardingCompletado } from '../../lib/onboarding';

// Pantallas que solo ve cada tipo de cuenta. "profile" la ven las dos.
const RUTAS_USUARIO = ['home', 'search', 'comunity', 'favorites', 'list'];
const RUTAS_ADMIN = ['admin-panel', 'admin-usuarios', 'admin-reportes'];

export default function TabsLayout() {
  const { usuario, token, cargando } = useAuth();
  const router = useRouter();
  const segmentos = useSegments();
  const insets = useSafeAreaInsets();
  // La barra de botones de Android toma el rosa de Cookly para que combine con la barra de pestañas.
  useEffect(() => {
    pintarBarraNavegacion(colors.primary);
  }, []);

  const esAdmin = usuario?.rol === 'ADMINISTRADOR';
  const rutaActual = String(segmentos[segmentos.length - 1] ?? '');

  // Avisos al celular (estilo "¡Te extrañamos!"): solo para cuentas de usuario.
  // Se reprograman al abrir la app y cada vez que sale a segundo plano.
  useEffect(() => {
    if (cargando || !token || esAdmin) return;
    reprogramarRecordatorios();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'background') reprogramarRecordatorios();
    });
    // Al tocar un aviso: si era de una receta a medias, se abre esa receta; si no, queda en Inicio.
    const dejarDeEscuchar = escucharToques((data) => {
      if (data?.tipo === 'receta' && data?.recetaId) {
        router.push({ pathname: '/receta/[id]', params: { id: String(data.recetaId) } });
      }
    });
    return () => {
      sub.remove();
      dejarDeEscuchar();
    };
  }, [cargando, token, esAdmin, router]);

  // Primera vez que esta cuenta inicia sesión: términos y alergias antes de entrar a la app.
  useEffect(() => {
    if (cargando || !token || esAdmin || !usuario?.correo) return;
    let activo = true;
    onboardingCompletado(usuario.correo).then((listo) => {
      if (activo && !listo) router.replace('/onboarding');
    });
    return () => {
      activo = false;
    };
  }, [cargando, token, esAdmin, usuario?.correo, router]);

  // Si alguien llega a una pantalla que no le corresponde (por ejemplo, al iniciar sesión), lo lleva a la suya.
  useEffect(() => {
    if (cargando || !token) return;
    if (esAdmin && RUTAS_USUARIO.includes(rutaActual)) router.replace('/(tabs)/admin-panel');
    else if (!esAdmin && RUTAS_ADMIN.includes(rutaActual)) router.replace('/(tabs)/home');
  }, [cargando, token, esAdmin, rutaActual, router]);

  // href: null oculta la pestaña de la barra pero conserva la ruta.
  const ocultarSi = (condicion: boolean) => (condicion ? { href: null } : {});

  return (
    <Tabs
      initialRouteName={esAdmin ? 'admin-panel' : 'home'}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true, // las pestañas que no se ven dejan de re-renderizar
        // Mismo margen de arriba en todas las pantallas (debajo de la hora / wifi / batería).
        // Home ya aplica este mismo margen por su cuenta, por eso allí va en 0.
        sceneStyle: { backgroundColor: colors.background, paddingTop: insets.top + spacing.sm },
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.62)',
        // Etiqueta en una sola línea (que no se corte "Comunidad") y en negrita la pestaña activa.
        tabBarLabel: ({ focused, color, children }) => (
          <Text
            numberOfLines={1}
            allowFontScaling={false}
            style={{ color, fontSize: 10, fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium }}
          >
            {children}
          </Text>
        ),
        tabBarItemStyle: { paddingHorizontal: 0 },
        // Barra rosa lisa, con las esquinas de arriba redondeadas (sin franja crema encima).
        tabBarBackground: () => (
          <View
            style={{
              flex: 1,
              backgroundColor: colors.primary,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
            }}
          />
        ),
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          // Deja sitio a los botones de Android (atrás / inicio / recientes)
          height: 56 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 5,
        },
      }}
    >
      {/* ---- Cuenta de usuario ---- */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          sceneStyle: { backgroundColor: colors.background, paddingTop: 0 },
          ...ocultarSi(esAdmin),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          ...ocultarSi(esAdmin),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "search" : "search-outline"} size={26} color={color} />,
        }}
      />
      {/* El archivo se llama comunity.tsx: el nombre aquí debe ser idéntico */}
      <Tabs.Screen
        name="comunity"
        options={{
          title: 'Comunidad',
          ...ocultarSi(esAdmin),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "people" : "people-outline"} size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoritos',
          ...ocultarSi(esAdmin),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "heart" : "heart-outline"} size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: 'Lista',
          ...ocultarSi(esAdmin),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "cart" : "cart-outline"} size={26} color={color} />,
        }}
      />

      {/* ---- Cuenta de administrador ---- */}
      <Tabs.Screen
        name="admin-panel"
        options={{
          title: 'Panel',
          ...ocultarSi(!esAdmin),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin-usuarios"
        options={{
          title: 'Usuarios',
          ...ocultarSi(!esAdmin),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "people-circle" : "people-circle-outline"} size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin-reportes"
        options={{
          title: 'Reportes',
          ...ocultarSi(!esAdmin),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "flag" : "flag-outline"} size={26} color={color} />,
        }}
      />

      {/* ---- Las dos ---- */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}