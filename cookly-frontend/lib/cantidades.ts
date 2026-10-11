// lib/cantidades.ts
// Recalcula las cantidades de una receta según el número de personas y la medida elegida
// (original, tazas o cucharadas).

/** Para cuántas personas están escritas las cantidades de las recetas (la base de datos aún no guarda este dato). */
export const PORCIONES_BASE = 4;
export const MIN_PERSONAS = 1;
export const MAX_PERSONAS = 500;

/** 'peso' = gramos y pasa solo a kilos cuando son muchos; 'medidas' = tazas y cucharas. */
export type Modo = 'original' | 'gramos' | 'kilos' | 'tazas' | 'cucharadas' | 'peso' | 'medidas';

type Canonica = 'taza' | 'cucharada' | 'cucharadita' | 'ml' | 'l' | 'g' | 'kg' | 'oz' | 'lb' | 'otra';

const ML_POR: Record<string, number> = { taza: 240, cucharada: 15, cucharadita: 5, ml: 1, l: 1000 };
const G_POR: Record<string, number> = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 };

// Gramos que pesa 1 taza (240 ml) de cada ingrediente común. Son valores aproximados.
const GRAMOS_POR_TAZA: [RegExp, number][] = [
  [/arroz/i, 200],
  [/az[uú]car/i, 200],
  [/harina/i, 125],
  [/avena/i, 90],
  [/quinua|quinoa/i, 170],
  [/lenteja/i, 190],
  [/frijol|poroto|garbanzo/i, 190],
  [/sal\b/i, 290],
  [/mantequilla/i, 225],
  [/aceite/i, 220],
  [/leche|agua|caldo|jugo/i, 240],
];

export function limitar(n: number): number {
  if (!Number.isFinite(n)) return PORCIONES_BASE;
  return Math.min(MAX_PERSONAS, Math.max(MIN_PERSONAS, Math.round(n)));
}

function normalizar(unidad: string): Canonica {
  const u = (unidad ?? '').toLowerCase().trim().replace(/\./g, '');
  if (/^tazas?$/.test(u)) return 'taza';
  if (/^(cdas?|cucharadas?|tbsp)$/.test(u)) return 'cucharada';
  if (/^(cdtas?|cucharaditas?|tsp)$/.test(u)) return 'cucharadita';
  if (/^(ml|mililitros?)$/.test(u)) return 'ml';
  if (/^(l|lt|lts|litros?)$/.test(u)) return 'l';
  if (/^(g|gr|grs|gramos?)$/.test(u)) return 'g';
  if (/^(kg|kgs|kilos?|kilogramos?)$/.test(u)) return 'kg';
  if (/^(oz|onzas?)$/.test(u)) return 'oz';
  if (/^(lb|lbs|libras?)$/.test(u)) return 'lb';
  return 'otra';
}

const NOMBRE: Record<Canonica, string> = {
  taza: 'taza',
  cucharada: 'cucharada',
  cucharadita: 'cucharadita',
  ml: 'ml',
  l: 'L',
  g: 'g',
  kg: 'kg',
  oz: 'oz',
  lb: 'lb',
  otra: '',
};

export type Escalado = { valor: number; unidad: string; aproximado: boolean };

/** Escala un ingrediente a `personas` y, si se pide, lo expresa en tazas o cucharadas. */
export function escalar(
  cantidad: number,
  unidad: string,
  nombreIngrediente: string,
  personas: number,
  modo: Modo,
): Escalado {
  if (modo === 'peso') {
    const e = escalar(cantidad, unidad, nombreIngrediente, personas, 'gramos');
    return e.unidad === 'g' && e.valor >= 1000 ? { ...e, valor: e.valor / 1000, unidad: 'kg' } : e;
  }
  if (modo === 'medidas') return escalar(cantidad, unidad, nombreIngrediente, personas, 'tazas');

  let valor = cantidad * (personas / PORCIONES_BASE);
  const canon = normalizar(unidad);
  let etiqueta = canon === 'otra' ? (unidad ?? '').trim() : NOMBRE[canon];
  let aproximado = false;

  if (modo === 'gramos' || modo === 'kilos') {
    let g: number | null = null;
    if (G_POR[canon] !== undefined) {
      g = valor * G_POR[canon];
    } else if (ML_POR[canon] !== undefined) {
      const densidad = GRAMOS_POR_TAZA.find(([re]) => re.test(nombreIngrediente));
      if (densidad) {
        g = ((valor * ML_POR[canon]) / 240) * densidad[1];
        aproximado = true;
      }
    }
    if (g !== null) {
      return modo === 'kilos'
        ? { valor: g / 1000, unidad: 'kg', aproximado }
        : { valor: g, unidad: 'g', aproximado };
    }
  } else if (modo !== 'original') {
    // Todo se pasa primero a mililitros (si se puede).
    let ml: number | null = null;
    if (ML_POR[canon] !== undefined) {
      ml = valor * ML_POR[canon];
    } else if (G_POR[canon] !== undefined) {
      const densidad = GRAMOS_POR_TAZA.find(([re]) => re.test(nombreIngrediente));
      if (densidad) {
        ml = ((valor * G_POR[canon]) / densidad[1]) * 240;
        aproximado = true;
      }
    }

    if (ml !== null) {
      if (modo === 'tazas' && ml / 240 >= 0.125) {
        valor = ml / 240;
        etiqueta = 'taza';
      } else if (ml / 15 >= 1) {
        valor = ml / 15;
        etiqueta = 'cucharada';
      } else {
        valor = ml / 5;
        etiqueta = 'cucharadita';
      }
      return { valor, unidad: etiqueta, aproximado };
    }
  }

  // Modo original: con muchas personas se pasa a kg o L, y con pocas a g o ml.
  if (canon === 'g' && valor >= 1000) return { valor: valor / 1000, unidad: 'kg', aproximado };
  if (canon === 'kg' && valor < 1) return { valor: valor * 1000, unidad: 'g', aproximado };
  if (canon === 'ml' && valor >= 1000) return { valor: valor / 1000, unidad: 'L', aproximado };
  if (canon === 'l' && valor < 1) return { valor: valor * 1000, unidad: 'ml', aproximado };

  return { valor, unidad: etiqueta, aproximado };
}

const FRACCIONES: [number, string][] = [
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [1 / 2, '½'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
];

/** 0.5 → "½", 1.25 → "1 ¼", 250 → "250", 1500 → "1.500". */
export function formatoCantidad(v: number): string {
  if (v >= 100) return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (v >= 10) return String(Math.round(v * 10) / 10).replace('.', ',');

  let entero = Math.floor(v);
  const dec = v - entero;
  if (dec < 0.04) return String(entero);
  if (dec > 0.96) return String(entero + 1);

  const cercana = FRACCIONES.find(([f]) => Math.abs(dec - f) < 0.04);
  if (cercana) return entero > 0 ? `${entero} ${cercana[1]}` : cercana[1];

  return String(Math.round(v * 100) / 100).replace('.', ',');
}

const SIN_PLURAL = new Set(['g', 'kg', 'ml', 'l', 'oz', 'lb', '']);

/** "taza" + 2 → "tazas"; "g" se queda igual; "unidad" + 3 → "unidades". */
export function unidadConPlural(unidad: string, valor: number): string {
  if (SIN_PLURAL.has(unidad.toLowerCase()) || valor <= 1) return unidad;
  if (/s$/i.test(unidad)) return unidad;
  return /[aeiou]$/i.test(unidad) ? `${unidad}s` : `${unidad}es`;
}

/** Texto final de un ingrediente: "≈ 2 tazas de arroz". */
export function textoIngrediente(
  cantidad: number,
  unidad: string,
  nombreIngrediente: string,
  personas: number,
  modo: Modo,
): string {
  const e = escalar(cantidad, unidad, nombreIngrediente, personas, modo);
  const cant = formatoCantidad(e.valor);
  const un = e.unidad ? ` ${unidadConPlural(e.unidad, e.valor)}` : '';
  return `${e.aproximado ? '≈ ' : ''}${cant}${un} de ${nombreIngrediente}`;
}


/** Para listas con el nombre a un lado y la cantidad al otro: { nombre: "Arroz", cantidad: "2 tazas" }. */
export function partesIngrediente(
  cantidad: number,
  unidad: string,
  nombreIngrediente: string,
  personas: number,
  modo: Modo,
): { nombre: string; cantidad: string } {
  const e = escalar(cantidad, unidad, nombreIngrediente, personas, modo);
  const un = e.unidad ? ` ${unidadConPlural(e.unidad, e.valor)}` : '';
  const nombre = nombreIngrediente.trim();
  return {
    nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1),
    cantidad: `${e.aproximado ? '≈ ' : ''}${formatoCantidad(e.valor)}${un}`,
  };
}