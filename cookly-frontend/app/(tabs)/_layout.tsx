import { useEffect } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

// Pantallas que solo ve cada tipo de cuenta. "profile" la ven las dos.
const RUTAS_USUARIO = ['home', 'search', 'comunity', 'favorites', 'list'];
const RUTAS_ADMIN = ['admin-panel', 'admin-usuarios', 'admin-reportes'];

export default function TabsLayout() {
  const { usuario, token, cargando } = useAuth();
  const router = useRouter();
  const segmentos = useSegments();
  const esAdmin = usuario?.rol === 'ADMINISTRADOR';
  const rutaActual = String(segmentos[segmentos.length - 1] ?? '');

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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      {/* ---- Cuenta de usuario ---- */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          ...ocultarSi(esAdmin),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          ...ocultarSi(esAdmin),
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
        }}
      />
      {/* El archivo se llama comunity.tsx: el nombre aquí debe ser idéntico (antes decía "community" y la pestaña salía sin ícono) */}
      <Tabs.Screen
        name="comunity"
        options={{
          title: 'Comunidad',
          ...ocultarSi(esAdmin),
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoritos',
          ...ocultarSi(esAdmin),
          tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: 'Lista',
          ...ocultarSi(esAdmin),
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
        }}
      />

      {/* ---- Cuenta de administrador ---- */}
      <Tabs.Screen
        name="admin-panel"
        options={{
          title: 'Panel',
          ...ocultarSi(!esAdmin),
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin-usuarios"
        options={{
          title: 'Usuarios',
          ...ocultarSi(!esAdmin),
          tabBarIcon: ({ color, size }) => <Ionicons name="people-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin-reportes"
        options={{
          title: 'Reportes',
          ...ocultarSi(!esAdmin),
          tabBarIcon: ({ color, size }) => <Ionicons name="flag-outline" size={size} color={color} />,
        }}
      />

      {/* ---- Las dos ---- */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}