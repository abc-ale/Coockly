// lib/barraNavegacion.ts
// Pinta la barra de botones de Android (atrás / inicio / recientes) del color de la barra de Cookly.
// Necesita el módulo `expo-navigation-bar` dentro del APK. Si todavía no lo tienes instalado, no hace nada y la app sigue igual.
import { Platform } from 'react-native';

let NavigationBar: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  NavigationBar = require('expo-navigation-bar');
} catch {
  NavigationBar = null;
}

export function pintarBarraNavegacion(color: string) {
  if (Platform.OS !== 'android' || !NavigationBar) return;
  try {
    NavigationBar.setBackgroundColorAsync?.(color);
    NavigationBar.setButtonStyleAsync?.('light'); // botones blancos sobre el rosa
  } catch {}
}