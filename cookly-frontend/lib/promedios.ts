// lib/promedios.ts
// La lista de recetas del servidor no siempre trae el promedio de estrellas:
// se pide aparte (una vez por receta, con memoria) y se mezcla en la lista.
import { useEffect, useMemo, useState } from 'react';
import { api } from './api';

const MEMORIA = new Map<number, number>();
const PIDIENDO = new Set<number>();

export function useConPromedios<T extends { id: number; promedio?: number }>(lista: T[]): T[] {
  const [, refrescar] = useState(0);

  useEffect(() => {
    const faltan = lista.filter((r) => (r.promedio === undefined || r.promedio === null) && !MEMORIA.has(r.id) && !PIDIENDO.has(r.id));
    if (faltan.length === 0) return;
    let vivo = true;
    faltan.forEach((r) => {
      PIDIENDO.add(r.id);
      api
        .get(`/recetas/${r.id}/resenas`)
        .then((res) => {
          MEMORIA.set(r.id, Number(res.data?.promedio ?? 0));
          if (vivo) refrescar((n) => n + 1);
        })
        .catch(() => {})
        .finally(() => PIDIENDO.delete(r.id));
    });
    return () => {
      vivo = false;
    };
  }, [lista]);

  return useMemo(
    () => lista.map((r) => ({ ...r, promedio: r.promedio ?? MEMORIA.get(r.id) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lista, MEMORIA.size]
  );
}