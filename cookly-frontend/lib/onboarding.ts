// lib/onboarding.ts
// Recuerda en el celular si esta cuenta ya aceptó los términos y eligió sus alergias (se muestra una sola vez).
import AsyncStorage from '@react-native-async-storage/async-storage';

const clave = (correo: string) => `cookly_onboarding_v1_${correo.trim().toLowerCase()}`;

export async function onboardingCompletado(correo: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(clave(correo))) === '1';
  } catch {
    return true; // si no se puede leer, no bloqueamos a la persona
  }
}

export async function marcarOnboarding(correo: string): Promise<void> {
  try {
    await AsyncStorage.setItem(clave(correo), '1');
  } catch {
    /* sin guardar, a lo mucho se vuelve a mostrar */
  }
}