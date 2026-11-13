// lib/ruleta.ts
// Ruleta del antojo: las 7 "vibras" y cómo se elige una receta para cada una.
// Todo se decide en la app con las recetas que ya devuelve el servidor (no hace falta tocar el backend).
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { api } from './api';

type NombreIcono = ComponentProps<typeof Ionicons>['name'];

export type RecetaRuleta = {
  id: number;
  nombre: string;
  descripcion?: string;
  minutosPreparacion?: number;
  portada?: string;
  detallesIngredientes?: { ingrediente?: { nombre?: string } }[];
};

export type Vibra = {
  id: string;
  nombre: string;
  icono: NombreIcono;
  /** Frase que se muestra cuando le toca una receta. */
  frase: string;
  /** Devuelve true si la receta va con esta vibra. */
  acepta: (r: RecetaRuleta, texto: string) => boolean;
};

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Todo el texto de la receta junto (nombre, descripción e ingredientes), para buscar palabras. */
export function textoDe(r: RecetaRuleta): string {
  const ingredientes = (r.detallesIngredientes ?? []).map((d) => d.ingrediente?.nombre ?? '').join(' ');
  return sinTildes(`${r.nombre} ${r.descripcion ?? ''} ${ingredientes}`);
}

const tiene = (texto: string, palabras: string[]) => palabras.some((p) => texto.includes(p));
const ingredientes = (r: RecetaRuleta) => r.detallesIngredientes?.length ?? 99;
const minutos = (r: RecetaRuleta) => r.minutosPreparacion ?? 999;

// El orden es el mismo que en la rueda (sector 0 arriba, siguiendo las agujas del reloj).
export const VIBRAS: Vibra[] = [
  {
    id: 'bateria', nombre: 'Bajo en batería', icono: 'battery-half-outline',
    frase: 'Poca energía, receta fácil. Así sí.',
    acepta: (r) => minutos(r) <= 20,
  },
  {
    id: 'sistema', nombre: 'Se cayó el sistema', icono: 'warning-outline',
    frase: 'Reiniciamos con algo simple. Respira.',
    acepta: (r) => ingredientes(r) <= 6 || minutos(r) <= 15,
  },
  {
    id: 'abuelita', nombre: 'Modo abuelita', icono: 'heart-outline',
    frase: 'Una receta de las que abrazan.',
    acepta: (_r, t) => tiene(t, ['caldo', 'sopa', 'guiso', 'estofado', 'sancochado', 'aguadito', 'chupe', 'lenteja', 'frejol', 'locro', 'arroz con pollo', 'seco']),
  },
  {
    id: 'caos', nombre: 'Caos total', icono: 'shuffle',
    frase: 'El destino decidió. Tú solo cocina.',
    acepta: () => true,
  },
  {
    id: 'ansiedad', nombre: 'Ansiedad x 1000', icono: 'pulse-outline',
    frase: 'Algo dulce para calmar los nervios.',
    acepta: (_r, t) => tiene(t, ['postre', 'torta', 'pastel', 'galleta', 'helado', 'dulce', 'chocolate', 'mazamorra', 'brownie', 'flan', 'alfajor', 'arroz con leche', 'keke', 'cake']),
  },
  {
    id: 'feroz', nombre: 'Antojo feroz', icono: 'flame-outline',
    frase: 'Hoy se come como se debe.',
    acepta: (_r, t) => tiene(t, ['carne', 'lomo', 'chicharron', 'hamburguesa', 'pizza', 'anticucho', 'parrilla', 'saltado', 'frito', 'milanesa', 'tallarin', 'cerdo', 'res ']),
  },
  {
    id: 'sobreviviendo', nombre: 'Sobreviviendo', icono: 'flag-outline',
    frase: 'Pocos ingredientes y cero dramas.',
    acepta: (r) => ingredientes(r) <= 5,
  },
];

export function buscarVibra(id?: string | null): Vibra | undefined {
  return VIBRAS.find((v) => v.id === id);
}

// ---- Recetas (se descargan una vez y se reutilizan) ----
let cache: RecetaRuleta[] | null = null;

export async function cargarRecetasRuleta(forzarArg?: boolean): Promise<RecetaRuleta[]> {
  const forzar = forzarArg ?? false;
  if (cache && !forzar) return cache;
  const { data } = await api.get('/recetas/buscar', { params: { texto: '', pagina: 0, tamano: 100 } });
  cache = (data?.content ?? []) as RecetaRuleta[];
  return cache;
}

/** Elige al azar una receta que vaya con la vibra. Si ninguna encaja, cualquiera. Evita repetir la anterior. */
export function elegirReceta(lista: RecetaRuleta[], vibra: Vibra, evitarId?: number): RecetaRuleta | null {
  if (lista.length === 0) return null;
  let candidatas = lista.filter((r) => vibra.acepta(r, textoDe(r)));
  if (candidatas.length === 0) candidatas = lista;
  const otras = candidatas.filter((r) => r.id !== evitarId);
  const base = otras.length > 0 ? otras : candidatas;
  return base[Math.floor(Math.random() * base.length)];
}