// lib/recordatorios.ts
// Aviso local de "receta a medias": si el usuario deja una receta a medias en Cocina guiada, la app
// le avisa 45 minutos después, aunque esté cerrada.
// Los avisos diarios (8:00, 12:00 y 19:00) NO se programan aquí sino en notificaciones/programar.ts:
// antes había dos programadores que se cancelaban entre sí y por eso los horarios salían desordenados.
// Si el módulo nativo (expo-notifications) aún no está en tu APK, todo esto simplemente no hace nada.
import { Platform } from 'react-native';
import { leerProgreso } from './progresoCocina';

let N: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  N = require('expo-notifications');
} catch {
  N = null;
}

const CANAL = 'cookly';
const ID_RECETA = 'receta-a-medias';

let preparado = false;

/** Configura cómo se muestran los avisos y crea el canal de Android (una sola vez). */
async function preparar() {
  if (!N || preparado) return;
  preparado = true;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CANAL, {
        name: 'Recordatorios de Cookly',
        importance: N.AndroidImportance?.DEFAULT ?? 3,
        lightColor: '#FF4D80',
      });
    }
  } catch {}
}

/** Pide permiso para avisar (Android 13+ y iPhone). Devuelve true si el usuario aceptó. */
export async function pedirPermiso(): Promise<boolean> {
  if (!N) return false;
  try {
    await preparar();
    const actual = await N.getPermissionsAsync();
    if (actual.granted) return true;
    if (actual.canAskAgain === false) return false;
    const nuevo = await N.requestPermissionsAsync();
    return !!nuevo.granted;
  } catch {
    return false;
  }
}

function enFecha(date: Date) {
  return { type: N.SchedulableTriggerInputTypes?.DATE ?? 'date', date, channelId: CANAL };
}

/**
 * Programa (o quita) SOLO el aviso de "receta a medias". No toca los avisos diarios de
 * notificaciones/programar.ts. Llamar al abrir la app y al salir de ella.
 */
export async function reprogramarRecordatorios() {
  if (!N) return;
  try {
    if (!(await pedirPermiso())) return;
    try { await N.cancelScheduledNotificationAsync(ID_RECETA); } catch {}

    const progreso = await leerProgreso();
    if (!progreso) return;
    await N.scheduleNotificationAsync({
      identifier: ID_RECETA,
      content: {
        title: 'Tu receta quedó a medias',
        body: `${progreso.nombre} · paso ${progreso.paso + 1} de ${progreso.total}. ¡Ya casi lo tienes!`,
        data: { tipo: 'receta', recetaId: progreso.recetaId },
        color: '#FF4D80',
      },
      trigger: enFecha(new Date(Date.now() + 45 * 60_000)),
    });
  } catch {}
}

/** Apaga todos los avisos (por ejemplo, al cerrar sesión). */
export async function cancelarRecordatorios() {
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {}
}

/**
 * Escucha cuando el usuario toca un aviso. Devuelve una función para dejar de escuchar.
 * `alTocar` recibe los datos del aviso ({ tipo, recetaId? }).
 */
export function escucharToques(alTocar: (data: any) => void): () => void {
  if (!N) return () => {};
  try {
    const sub = N.addNotificationResponseReceivedListener((respuesta: any) => {
      alTocar(respuesta?.notification?.request?.content?.data ?? {});
    });
    return () => sub?.remove?.();
  } catch {
    return () => {};
  }
}