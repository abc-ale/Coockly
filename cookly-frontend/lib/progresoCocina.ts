// lib/progresoCocina.ts
// Guarda en el celular en qué paso de la Cocina guiada se quedó el usuario.
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLAVE = 'cookly_cocina_progreso';

export type ProgresoCocina = {
  recetaId: number;
  nombre: string;
  paso: number;   // índice del paso (0 = primero)
  total: number;
  actualizado: number;
};

export async function guardarProgreso(p: Omit<ProgresoCocina, 'actualizado'>) {
  try {
    await AsyncStorage.setItem(CLAVE, JSON.stringify({ ...p, actualizado: Date.now() }));
  } catch {}
}

export async function leerProgreso(): Promise<ProgresoCocina | null> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE);
    if (!crudo) return null;
    const p = JSON.parse(crudo) as ProgresoCocina;
    // Pasadas 12 horas se considera abandonado.
    if (Date.now() - p.actualizado > 12 * 60 * 60 * 1000) return null;
    return p;
  } catch {
    return null;
  }
}

export async function borrarProgreso() {
  try {
    await AsyncStorage.removeItem(CLAVE);
  } catch {}
}