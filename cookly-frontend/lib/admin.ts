// lib/admin.ts
// Llamadas al panel administrativo del backend. Solo funcionan con una sesión de ADMINISTRADOR.
import { api } from './api';

export type Resumen = {
  usuariosTotal: number;
  usuariosActivos: number;
  usuariosInactivos: number;
  administradores: number;
  usuariosNuevos7d: number;
  usuariosNuevos30d: number;
  recetasTotal: number;
  recetasNuevas30d: number;
  comentariosTotal: number;
  favoritosTotal: number;
  resenasTotal: number;
  puntuacionPromedio: number;
  imagenesTotal: number;
  reportesPendientes: number;
  enLineaAhora: number;
  activosHoy: number;
  activos7d: number;
  sesionesTotal: number;
  minutosUsoTotal: number;
  minutosUso7d: number;
  minutosPorSesion: number;
  baseDatosBytes: number;
  zonaHoraria: string;
};

export type PuntoDia = { dia: string; valor: number };
export type PuntoUso = { dia: string; minutos: number; activos: number };
export type PuntoHora = { hora: number; valor: number };
export type PuntoNombre = { nombre: string; valor: number };

export type Graficas = {
  dias: number;
  usuariosPorDia: PuntoDia[];
  recetasPorDia: PuntoDia[];
  usoPorDia: PuntoUso[];
  horasPico: PuntoHora[];
  topRecetasVistas: PuntoNombre[];
  topRecetasFavoritas: PuntoNombre[];
  topUsuariosTiempo: PuntoNombre[];
  reportesPorEstado: PuntoNombre[];
};

export type UsuarioAdmin = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  creadoEn?: string;
  sesiones: number;
  segundosUso: number;
  ultimoAcceso?: string;
  recetas: number;
  favoritos: number;
};

export type ReporteAdmin = {
  id: number;
  motivo: string;
  estado: string;
  creadoEn?: string;
  recetaId: number;
  recetaNombre: string;
  reportante: string;
  reportanteCorreo: string;
};

export async function obtenerResumen(): Promise<Resumen> {
  return (await api.get<Resumen>('/administracion/resumen')).data;
}

export async function obtenerGraficas(dias: number): Promise<Graficas> {
  return (await api.get<Graficas>('/administracion/graficas', { params: { dias } })).data;
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  return (await api.get<UsuarioAdmin[]>('/administracion/usuarios')).data;
}

export async function cambiarRol(id: number, rol: 'USUARIO' | 'ADMINISTRADOR'): Promise<void> {
  await api.put(`/administracion/usuarios/${id}/rol`, { rol });
}

export async function cambiarActivo(id: number, valor: boolean): Promise<void> {
  await api.put(`/administracion/usuarios/${id}/activo`, null, { params: { valor } });
}

export async function listarReportes(): Promise<ReporteAdmin[]> {
  return (await api.get<ReporteAdmin[]>('/administracion/moderacion/reportes')).data;
}

export async function resolverReporte(
  id: number,
  estado: 'REVISADO' | 'DESCARTADO',
  eliminarReceta: boolean,
): Promise<void> {
  await api.put(`/administracion/moderacion/reportes/${id}`, { estado }, { params: { eliminarReceta } });
}

/** Pide un enlace de un solo uso (vence en 2 minutos) para descargar el reporte en el navegador del celular. */
export async function crearEnlaceDescarga(tipo: 'xlsx' | 'pdf'): Promise<string> {
  const { data } = await api.post<{ url: string }>('/administracion/exportar/enlace', null, { params: { tipo } });
  return data.url;
}

/** Dirección del panel web (respaldo y recuperación de datos). */
export function urlPanelWeb(baseApi: string): string {
  return baseApi.replace(/\/api\/v1\/?$/, '') + '/admin/index.html';
}

/** Mensaje legible para mostrar al administrador cuando falla algo. */
export function mensajeDeError(e: unknown): string {
  const err = e as { response?: { status?: number; data?: { mensaje?: string } }; message?: string };
  const mensaje = err?.response?.data?.mensaje;
  if (mensaje) return mensaje;
  if (err?.response?.status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
  if (err?.response?.status === 403) return 'Esta cuenta no tiene permiso de administrador.';
  if (!err?.response) return 'No se pudo conectar con el servidor. Revisa tu internet e inténtalo otra vez.';
  return 'No se pudo completar la acción.';
}

export function formatoNumero(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 0 -> "0 min", 75 -> "1 h 15 min". */
export function formatoMinutos(minutos: number): string {
  const m = Math.round(minutos || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h} h ${r < 10 ? '0' : ''}${r} min`;
}

export function formatoBytes(b: number): string {
  if (b < 1024 * 1024) return `${formatoNumero(b / 1024)} KB`;
  return `${(Math.round((b / (1024 * 1024)) * 10) / 10).toString()} MB`;
}

/** "2026-09-14" -> "14/09". */
export function etiquetaDia(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}