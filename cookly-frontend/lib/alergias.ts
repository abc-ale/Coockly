// lib/alergias.ts
// Alergias de la persona: se guardan en el servidor (cuenta) y una copia en el celular para verlas al instante.
// Como los ingredientes no traen "contiene X" en la base de datos, la alerta se calcula por el nombre del ingrediente.
import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { api } from './api';
import { useAuth } from '../context/AuthContext';

export type AlergiaItem = { id: number; nombre: string };

const claveCache = (correo: string) => `cookly_alergias_v1_${correo.trim().toLowerCase()}`;

const sinTildes = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Catálogo completo de alergias disponibles. */
export async function cargarCatalogoAlergias(): Promise<AlergiaItem[]> {
  const { data } = await api.get('/catalogos');
  return (data?.alergias ?? []) as AlergiaItem[];
}

async function leerCache(correo: string): Promise<AlergiaItem[] | null> {
  try {
    const txt = await AsyncStorage.getItem(claveCache(correo));
    return txt ? (JSON.parse(txt) as AlergiaItem[]) : null;
  } catch {
    return null;
  }
}

async function escribirCache(correo: string, lista: AlergiaItem[]) {
  try {
    await AsyncStorage.setItem(claveCache(correo), JSON.stringify(lista));
  } catch {
    /* sin copia en el celular, igual queda en el servidor */
  }
}

/** Mis alergias desde el servidor. Si no hay conexión, devuelve la última copia del celular. */
export async function cargarMisAlergias(correo: string): Promise<AlergiaItem[]> {
  try {
    const { data } = await api.get('/perfil/alergias');
    const lista: AlergiaItem[] = (Array.isArray(data) ? data : [])
      .map((x: any) => x?.alergia)
      .filter((a: any) => a && typeof a.id === 'number')
      .map((a: any) => ({ id: a.id, nombre: String(a.nombre) }));
    await escribirCache(correo, lista);
    return lista;
  } catch {
    return (await leerCache(correo)) ?? [];
  }
}

/** Guarda mis alergias en el servidor (reemplaza la lista anterior) y en el celular. Lanza error si no hay conexión. */
export async function guardarMisAlergias(correo: string, lista: AlergiaItem[]): Promise<void> {
  await api.put('/perfil/alergias', { ids: lista.map((a) => a.id) });
  await escribirCache(correo, lista);
}

/** Mis alergias para usar en una pantalla: salen al instante del celular y se actualizan desde el servidor. */
export function useMisAlergias(): AlergiaItem[] {
  const { usuario } = useAuth();
  const correo = usuario?.correo;
  const [lista, setLista] = useState<AlergiaItem[]>([]);
  useFocusEffect(
    useCallback(() => {
      if (!correo) return;
      let activo = true;
      leerCache(correo).then((c) => activo && c && setLista(c));
      cargarMisAlergias(correo).then((l) => activo && setLista(l));
      return () => {
        activo = false;
      };
    }, [correo])
  );
  return lista;
}

// Palabras que delatan cada alergia en el nombre de un ingrediente (sin tildes, en singular).
const PALABRAS: Record<string, string[]> = {
  gluten: ['trigo', 'harina', 'pan', 'fideo', 'tallarin', 'pasta', 'espagueti', 'macarron', 'cebada', 'centeno', 'avena', 'galleta', 'semola', 'cerveza', 'seitan', 'panko', 'semola', 'masa'],
  lacteos: ['leche', 'queso', 'mantequilla', 'crema', 'yogur', 'yogurt', 'nata', 'requeson', 'manjar', 'helado', 'mozzarella', 'parmesano', 'ricota'],
  huevo: ['huevo', 'clara', 'yema', 'mayonesa', 'merengue'],
  mani: ['mani', 'cacahuate', 'cacahuete'],
  'frutos secos': ['nuez', 'almendra', 'avellana', 'pistacho', 'castana', 'anacardo', 'maranon', 'pecana', 'macadamia'],
  mariscos: ['marisco', 'camaron', 'langostino', 'cangrejo', 'langosta', 'pulpo', 'calamar', 'choro', 'mejillon', 'concha', 'almeja', 'ostra', 'ostion', 'molusco'],
  pescado: ['pescado', 'atun', 'salmon', 'lenguado', 'corvina', 'bonito', 'merluza', 'trucha', 'anchoa', 'bacalao', 'jurel', 'caballa', 'pejerrey', 'tilapia', 'sardina'],
  soya: ['soya', 'soja', 'sillao', 'tofu', 'edamame', 'miso'],
  sesamo: ['sesamo', 'ajonjoli', 'tahini'],
};

// Si el ingrediente dice esto, NO cuenta como lácteo / fruto seco (leche de coco, nuez moscada, mantequilla de maní...).
const EXCEPCIONES: Record<string, string[]> = {
  lacteos: ['coco', 'almendra', 'vegetal', 'soya', 'mani', 'cacao'],
  'frutos secos': ['moscada'],
};

function coincide(texto: string, palabra: string): boolean {
  return new RegExp(`(^|[^a-z])${palabra}(s|es)?([^a-z]|$)`).test(texto);
}

/** ¿Este ingrediente contiene alguna de mis alergias? Devuelve las alergias que coinciden. */
export function alergiasDeIngrediente(nombreIngrediente: string, mias: AlergiaItem[]): AlergiaItem[] {
  if (!mias.length) return [];
  const texto = sinTildes(nombreIngrediente);
  return mias.filter((a) => {
    const clave = sinTildes(a.nombre).trim();
    const base = clave.replace(/s$/, '');
    const palabras = PALABRAS[clave] ?? PALABRAS[base] ?? [base];
    const excepciones = EXCEPCIONES[clave] ?? EXCEPCIONES[base] ?? [];
    if (excepciones.some((e) => coincide(texto, e))) return false;
    return palabras.some((p) => coincide(texto, p));
  });
}

/** "Soya y maní" / "Gluten, lácteos y huevo": para mostrar en el aviso. */
export function listaEnTexto(nombres: string[]): string {
  const n = nombres.map((x, i) => (i === 0 ? x : x.charAt(0).toLowerCase() + x.slice(1)));
  if (n.length <= 1) return n[0] ?? '';
  return `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`;
}