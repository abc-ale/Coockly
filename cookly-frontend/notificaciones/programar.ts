// Programa las notificaciones locales de Cookly (8:00, 12:00 y 19:00) rotando los mensajes.
// Es el ÚNICO lugar que programa los avisos diarios (lib/recordatorios.ts solo maneja el de "receta a medias").
// Se llama al abrir la app y cada vez que vuelve a primer plano: cancela lo anterior y reprograma
// los próximos días. Como el teléfono no puede revisar el uso en el momento de disparar, la lógica
// es: cada vez que el usuario abre la app se reinicia todo; si NO la vuelve a abrir, las
// notificaciones de tarde y noche de los días siguientes ya estaban programadas como "te extraño".
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { MENSAJES, Franja, Tipo } from './mensajes';

// ---- Ajustes (cámbialos aquí) ----
// Un mensaje al día en cada franja: 8:00 a. m., 12:00 p. m. y 7:00 p. m.
const HORARIOS: Record<Franja, { hora: number; minuto: number }> = {
  manana: { hora: 8, minuto: 0 },
  tarde: { hora: 12, minuto: 0 },
  noche: { hora: 19, minuto: 0 },
};
const DIAS_ADELANTE = 7;        // si no abre la app en 7 días, deja de avisarle
const DIA_DESDE_QUE_EXTRANA = 1; // 1 = mañana en la tarde/noche ya usa mensajes "te extraño" si no entró; 2 = espera un día más
const CANAL = 'recordatorios';
const TITULO = 'Cookly';

const POR_GRUPO = new Map<string, typeof MENSAJES>();
for (const m of MENSAJES) {
  const clave = `${m.franja}-${m.tipo}`;
  const lista = POR_GRUPO.get(clave) ?? [];
  lista.push(m);
  POR_GRUPO.set(clave, lista);
}

function diaDelAnio(f: Date): number {
  const inicio = new Date(f.getFullYear(), 0, 0);
  return Math.floor((f.getTime() - inicio.getTime()) / 86400000);
}

/** Elige el mensaje del día para una franja: rota por el día del año, sin repetir en meses. */
export function elegirMensaje(franja: Franja, tipo: Tipo, fecha: Date): string {
  const lista = POR_GRUPO.get(`${franja}-${tipo}`) ?? POR_GRUPO.get(`${franja}-normal`)!;
  return lista[diaDelAnio(fecha) % lista.length].texto;
}

export async function programarNotificaciones(): Promise<void> {
  const permiso = await Notifications.getPermissionsAsync();
  let concedido = permiso.granted;
  if (!concedido && permiso.canAskAgain) {
    concedido = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!concedido) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Recordatorios de cocina',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  const ahora = new Date();
  for (let dia = 0; dia <= DIAS_ADELANTE; dia++) {
    for (const franja of ['manana', 'tarde', 'noche'] as Franja[]) {
      const { hora, minuto } = HORARIOS[franja];
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + dia, hora, minuto, 0);
      if (fecha.getTime() <= ahora.getTime() + 60000) continue; // ya pasó (o es en menos de 1 min)

      const extrana = franja !== 'manana' && dia >= DIA_DESDE_QUE_EXTRANA;
      const texto = elegirMensaje(franja, extrana ? 'vuelve' : 'normal', fecha);

      await Notifications.scheduleNotificationAsync({
        content: { title: TITULO, body: texto },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fecha, channelId: CANAL },
      });
    }
  }
}

/* Uso (en App.tsx o en tu componente raíz):

  import { AppState } from 'react-native';
  import { programarNotificaciones } from './src/notificaciones/programar';

  useEffect(() => {
    programarNotificaciones();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') programarNotificaciones();
    });
    return () => sub.remove();
  }, []);
*/