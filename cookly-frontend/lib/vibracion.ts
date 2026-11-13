// lib/vibracion.ts
// Vibraciones suaves (expo-haptics). Si el módulo nativo aún no está en tu APK, simplemente no hace nada.

let H: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  H = require('expo-haptics');
} catch {
  H = null;
}

/** Toque ligero: botones, favoritos. */
export function toque() {
  try {
    H?.impactAsync?.(H.ImpactFeedbackStyle?.Light);
  } catch {}
}

/** Cambio de selección: categorías, pasos. */
export function seleccion() {
  try {
    H?.selectionAsync?.();
  } catch {}
}

/** Algo salió bien: reseña guardada, cronómetro terminado. */
export function exito() {
  try {
    H?.notificationAsync?.(H.NotificationFeedbackType?.Success);
  } catch {}
}