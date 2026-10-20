// Avisos de la comunidad (me gusta, comentarios y respuestas) que llegan con la app cerrada.
// - Guarda en Supabase el token de notificaciones de este teléfono cuando el usuario inicia sesión.
// - Al tocar un aviso, abre la publicación.
// Requiere que en Supabase ya hayas ejecutado notificaciones_sociales.sql.
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase'; // <- si tu cliente de Supabase está en otro archivo, cambia esta ruta

const CANAL_SOCIAL = 'social';

/** Pantalla que se abre al tocar un aviso. Ajusta la ruta a tu pantalla de comentarios/publicación. */
function rutaDelAviso(data: any): string | null {
  if (!data?.postId) return null;
  return `/comments/${data.postId}`;
}

function abrirAviso(data: any) {
  const ruta = rutaDelAviso(data);
  if (ruta) router.push(ruta as any);
}

let tokenActual: string | null = null;

async function guardarToken(): Promise<void> {
  try {
    const permiso = await Notifications.getPermissionsAsync();
    let concedido = permiso.granted;
    if (!concedido && permiso.canAskAgain) {
      concedido = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!concedido) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL_SOCIAL, {
        name: 'Actividad de la comunidad',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    tokenActual = token;
    const { error } = await supabase.rpc('registrar_push_token', { p_token: token, p_plataforma: Platform.OS });
    if (error) console.log('PUSH: Supabase no guardó el token:', error.message);
    else console.log('PUSH: teléfono registrado', token);
  } catch (e: any) {
    // En Expo Go (Android) o sin proyecto EAS no se puede obtener el token: la app sigue normal.
    console.log('PUSH: no se pudo registrar el teléfono:', e?.message ?? e);
  }
}

/** Llámalo justo antes de cerrar sesión, para que este teléfono deje de recibir avisos de esa cuenta. */
export async function quitarPushToken(): Promise<void> {
  try {
    if (tokenActual) await supabase.rpc('quitar_push_token', { p_token: tokenActual });
  } catch {}
}

/** Se llama una sola vez al iniciar la app (en app/_layout.tsx). Devuelve la función para detenerlo. */
export function iniciarPushSocial(): () => void {
  supabase.auth.getSession().then(({ data }: any) => {
    if (data.session) guardarToken();
  });
  const { data: suscripcion } = supabase.auth.onAuthStateChange((evento: string, sesion: unknown) => {
    if (sesion && evento === 'SIGNED_IN') guardarToken();
  });

  // Toque sobre un aviso con la app abierta o en segundo plano
  const toque = Notifications.addNotificationResponseReceivedListener((r) => {
    abrirAviso(r.notification.request.content.data);
  });
  // Toque sobre un aviso con la app cerrada
  Notifications.getLastNotificationResponseAsync().then((r) => {
    if (r) abrirAviso(r.notification.request.content.data);
  });

  return () => {
    suscripcion.subscription.unsubscribe();
    toque.remove();
  };
}