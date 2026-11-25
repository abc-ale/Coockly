// lib/portada.ts
// Devuelve la URL de la foto principal de una receta.
// OJO: GET /recetas/{id} NO trae la foto; vive en /imagenes/receta/{id} (la primera es la portada).
import { api } from './api';

const cache = new Map<number, string>();

export async function obtenerPortada(id: number | string, nombre?: string): Promise<string | null> {
  const clave = Number(id);
  const guardada = cache.get(clave);
  if (guardada) return guardada;

  // 1) Lo normal: las imágenes de la receta (se reintenta una vez por si el servidor estaba despertando).
  for (let intento = 0; intento < 2; intento++) {
    try {
      const { data } = await api.get(`/imagenes/receta/${clave}`);
      const url: string | undefined = data?.[0]?.url;
      if (url) {
        cache.set(clave, url);
        return url;
      }
      break; // respondió bien pero no hay fotos: no tiene sentido reintentar
    } catch {
      /* se reintenta */
    }
  }

  // 2) Plan B: el buscador sí devuelve "portada" por receta.
  if (nombre) {
    try {
      const { data } = await api.get('/recetas/buscar', { params: { texto: nombre, pagina: 0, tamano: 20 } });
      const hallada = (data?.content ?? []).find((r: any) => r.id === clave && r.portada);
      if (hallada?.portada) {
        cache.set(clave, hallada.portada);
        return hallada.portada;
      }
    } catch {
      /* sin foto */
    }
  }
  return null;
}