// lib/avatar.ts
// Foto de perfil personalizada: un animalito + un color de fondo.
// Se guarda en el celular (por cuenta) y, si se puede, también en el perfil de Supabase (columna "avatar").
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../constants/theme';
import { supabase } from './supabase';

export type AnimalId = 'per1' | 'per2' | 'per3' | 'per4' | 'per5' | 'per6';

export type Animal = {
  id: AnimalId;
  nombre: string;
  uri: string; // imagen en Cloudinary
  fondoBase: string; // color con el que luce mejor por defecto
};

export type Avatar = { animal: AnimalId; fondo: string };

const BASE = 'https://res.cloudinary.com/pjbmwoxn/image/upload';
// Se pide más liviana (300 px, calidad automática) porque se muestra en círculos pequeños.
const url = (version: string, archivo: string) => `${BASE}/f_auto,q_auto,w_300/${version}/${archivo}`;

export const ANIMALES: Animal[] = [
  { id: 'per1', nombre: 'Personaje 1', uri: url('v1791704241', 'PER-1.png'), fondoBase: colors.primary },
  { id: 'per2', nombre: 'Personaje 2', uri: url('v1791704240', 'PER-2.png'), fondoBase: colors.accent },
  { id: 'per3', nombre: 'Personaje 3', uri: url('v1791704241', 'PER-3.png'), fondoBase: colors.magic },
  { id: 'per4', nombre: 'Personaje 4', uri: url('v1791704242', 'PER-4.png'), fondoBase: colors.primaryLight },
  { id: 'per5', nombre: 'Personaje 5', uri: url('v1791704244', 'PER-5.png'), fondoBase: colors.accent },
  { id: 'per6', nombre: 'Personaje 6', uri: url('v1791704284', 'PER-6.png'), fondoBase: colors.magic },
];

/** Colores de fondo que se pueden elegir. */
export const FONDOS: { color: string; nombre: string }[] = [
  { color: colors.primary, nombre: 'Rosa' },
  { color: colors.accent, nombre: 'Mantequilla' },
  { color: colors.magic, nombre: 'Pistacho' },
  { color: colors.primaryLight, nombre: 'Rosado claro' },
  { color: colors.text, nombre: 'Ciruela' },
];

export const AVATAR_INICIAL: Avatar = { animal: 'per1', fondo: colors.primary };

export function buscarAnimal(id?: string | null): Animal | undefined {
  return ANIMALES.find((a) => a.id === id);
}

const clave = (correo: string) => `cookly_avatar_v1_${correo.trim().toLowerCase()}`;

function valido(a: any): a is Avatar {
  return !!a && typeof a.fondo === 'string' && !!buscarAnimal(a.animal);
}

/** Lee la foto elegida en este celular. Devuelve null si nunca eligió una. */
export async function cargarAvatar(correo?: string | null): Promise<Avatar | null> {
  if (!correo) return null;
  try {
    const texto = await AsyncStorage.getItem(clave(correo));
    if (!texto) return null;
    const dato = JSON.parse(texto);
    return valido(dato) ? dato : null;
  } catch {
    return null;
  }
}

/** Guarda la foto en el celular y la sube al perfil (si Supabase lo permite). */
export async function guardarAvatar(correo: string, avatar: Avatar): Promise<void> {
  await AsyncStorage.setItem(clave(correo), JSON.stringify(avatar));
  // La comunidad podrá mostrarla desde el perfil; si la columna aún no existe, no pasa nada.
  try {
    const { data: sesion } = await supabase.auth.getSession();
    const id = sesion.session?.user.id;
    if (id) await supabase.from('profiles').update({ avatar: `${avatar.animal}:${avatar.fondo}` }).eq('id', id);
  } catch {
    /* sin comunidad, la foto igual queda guardada en el celular */
  }
}

/** Convierte "per1:#FF4D80" (como se guarda en Supabase) en un Avatar. */
export function avatarDesdeTexto(texto?: string | null): Avatar | null {
  if (!texto) return null;
  const [animal, fondo] = texto.split(':');
  const dato = { animal, fondo };
  return valido(dato) ? (dato as Avatar) : null;
}