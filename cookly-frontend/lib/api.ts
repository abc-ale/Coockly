import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Permite reintentar aunque sea POST (úsalo solo en llamadas seguras de repetir, como el login). */
    reintentar?: boolean;
    __intentos?: number;
  }
}

// Render (plan gratis) duerme el servidor tras ~15 min sin tráfico y tarda hasta ~60 s en despertar.
// Por eso: timeout corto + reintentos con espera, en vez de fallar a la primera.
const TIMEOUT_MS = 20000;
const REINTENTOS_MAX = 3;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// DIAG (temporal): primer interceptor de respuesta, ve lo que devuelve el adaptador de axios
api.interceptors.response.use(
  (r) => {
    console.log('DIAG ANTES:', r === undefined ? 'UNDEFINED' : r.status, r?.config?.url);
    return r;
  },
  (e) => {
    console.log('DIAG ANTES error:', e?.message);
    return Promise.reject(e);
  }
);

// ---- Despertar el servidor ----
let despertando: Promise<void> | null = null;

/** Hace un ping a /salud para sacar al servidor del "sueño". Se puede llamar muchas veces sin costo. */
export function despertarServidor(): Promise<void> {
  if (!despertando) {
    despertando = axios
      .get(`${API_BASE_URL}/salud`, { timeout: 70000 })
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        setTimeout(() => {
          despertando = null;
        }, 5 * 60 * 1000);
      });
  }
  return despertando;
}

// ---- Sesión vencida ----
let alNoAutorizado: (() => void) | null = null;
export function registrarNoAutorizado(fn: (() => void) | null) {
  alNoAutorizado = fn;
}

api.interceptors.request.use(async (config) => {
  if (!config.headers.Authorization) {
    const token = await AsyncStorage.getItem('cookly_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

api.interceptors.response.use(
  (response) => {
    // Administrador: el servidor entrega un token renovado en cada petición (la sesión vence por inactividad).
    const renovado = response.headers?.['x-token-nuevo'];
    if (renovado) AsyncStorage.setItem('cookly_token', String(renovado)).catch(() => {});
    return response;
  },
  async (error) => {
    const config = error.config;
    const estado: number | undefined = error.response?.status;

    // Sesión vencida (usuario: 30 días; administrador: 30 min sin actividad): limpiar y avisar a la app.
    if (estado === 401 && config?.headers?.Authorization && !config.url?.includes('/autenticacion/')) {
      await AsyncStorage.multiRemove(['cookly_token', 'cookly_user']);
      alNoAutorizado?.();
      return Promise.reject(error);
    }

    if (!config) return Promise.reject(error);

    const metodo = (config.method ?? 'get').toLowerCase();
    const esSegura = metodo === 'get' || metodo === 'head' || config.reintentar === true;
    const sinRespuesta = !error.response; // timeout o red caída
    const servidorDormido = estado === 502 || estado === 503; // la petición ni llegó a la app
    const puedeReintentar = servidorDormido || (esSegura && (sinRespuesta || estado === 504));

    config.__intentos = config.__intentos ?? 0;
    if (puedeReintentar && config.__intentos < REINTENTOS_MAX) {
      config.__intentos += 1;
      await esperar(1500 * config.__intentos);
      return api(config);
    }
    return Promise.reject(error);
  }
);

// DIAG (temporal): último interceptor de respuesta, ve lo que sale después de los tuyos
api.interceptors.response.use(
  (r) => {
    console.log('DIAG DESPUES:', r === undefined ? 'UNDEFINED' : r.status);
    return r;
  },
  (e) => {
    console.log('DIAG DESPUES error:', e?.message);
    return Promise.reject(e);
  }
);