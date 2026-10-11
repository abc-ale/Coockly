// lib/recordatorios.ts
// Avisos que le llegan al usuario al celular aunque la app esté cerrada (estilo "¡Te extrañamos!").
// Son RECORDATORIOS LOCALES: los programa la propia app, no hace falta servidor.
//  - Todos los días a las 6 pm: "¿Qué cenamos hoy?" (mensajes que van rotando).
//  - A los 3 días sin entrar: "¡Te extrañamos en la cocina!". A los 7: "Vuelve a ser chef".
//  - Si dejó una receta a medias en Cocina guiada: "Tu receta quedó a medias".
// Se reprograman cada vez que la app se abre o pasa a segundo plano, así los avisos de "te extrañamos"
// solo llegan si de verdad no volvió a entrar.
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
const HORA_CENA = 18; // 6 pm

const MENSAJES_CENA: [string, string][] = [
  ['¿Qué cenamos hoy?', 'Tenemos ideas rápidas de menos de 30 minutos.'],
  ['Hora de cocinar', 'Elige una receta y cena rico hoy.'],
  ['Tu cocina te espera', 'Hoy es buen día para probar algo nuevo.'],
  ['¿Ya pensaste qué comer?', 'Tu receta del día está lista para ti.'],
  ['Vuelve a ser chef', 'Una receta, un delantal y cero excusas.'],
];

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

async function programar(titulo: string, cuerpo: string, date: Date, data: Record<string, unknown> = {}) {
  try {
    await N.scheduleNotificationAsync({
      content: { title: titulo, body: cuerpo, data, color: '#FF4D80' },
      trigger: enFecha(date),
    });
  } catch {}
}

/** Borra los avisos programados y los vuelve a programar desde cero. Llamar al abrir la app y al salir de ella. */
export async function reprogramarRecordatorios() {
  if (!N) return;
  try {
    if (!(await pedirPermiso())) return;
    await N.cancelAllScheduledNotificationsAsync();

    const ahora = new Date();

    // 1) "¿Qué cenamos hoy?": los próximos 7 días a las 6 pm, cada día con un mensaje distinto.
    for (let i = 0; i < 7; i++) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + i, HORA_CENA, 0, 0);
      if (d.getTime() <= ahora.getTime() + 60_000) continue;
      const [t, c] = MENSAJES_CENA[(d.getDate() + i) % MENSAJES_CENA.length];
      await programar(t, c, d, { tipo: 'cena' });
    }

    // 2) "Te extrañamos": solo llegan si pasan 3 / 7 días sin volver a abrir la app.
    const en = (dias: number) => new Date(ahora.getTime() + dias * 86_400_000);
    await programar('¡Te extrañamos en la cocina!', 'Tu sartén se siente solita. Vuelve a ser chef: tu receta del día te espera.', en(3), { tipo: 'extrano' });
    await programar('Vuelve a ser chef', 'Hace una semana que no cocinas. ¡Hoy es un gran día para retomar!', en(7), { tipo: 'extrano' });

    // 3) Receta a medias en Cocina guiada: aviso 45 minutos después de dejarla.
    const progreso = await leerProgreso();
    if (progreso) {
      await programar(
        'Tu receta quedó a medias',
        `${progreso.nombre} · paso ${progreso.paso + 1} de ${progreso.total}. ¡Ya casi lo tienes!`,
        new Date(ahora.getTime() + 45 * 60_000),
        { tipo: 'receta', recetaId: progreso.recetaId }
      );
    }
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