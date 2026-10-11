import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { api, despertarServidor, registrarNoAutorizado } from '../lib/api';
import { supabase } from '../lib/supabase';

type Usuario = {
  nombre: string;
  correo: string;
  rol: string;
};

type AuthContextType = {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  login: (correo: string, contrasena: string) => Promise<void>;
  registrar: (nombre: string, correo: string, contrasena: string) => Promise<void>;
  loginConGoogle: () => Promise<void>;
  loginConFacebook: () => Promise<void>;
  logout: () => Promise<void>;
  actualizarNombre: (nombre: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [tokenGuardado, usuarioGuardado] = await AsyncStorage.multiGet(['cookly_token', 'cookly_user']);
        if (tokenGuardado[1] && usuarioGuardado[1]) {
          setToken(tokenGuardado[1]);
          setUsuario(JSON.parse(usuarioGuardado[1]));
        }
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  // Si el servidor responde 401 (sesión vencida), cerramos la sesión de verdad y volvemos al login.
  useEffect(() => {
    registrarNoAutorizado(() => {
      setToken(null);
      setUsuario(null);
      router.replace('/login');
    });
    return () => registrarNoAutorizado(null);
  }, []);

  // Monitoreo de uso: mientras la app está abierta y hay sesión, avisa al servidor cada 30 s.
  useEffect(() => {
    if (!token) return;

    const enviarLatido = () => {
      api.post('/uso/latido', { plataforma: Platform.OS }).catch(() => {});
    };

    let temporizador: ReturnType<typeof setInterval> | null = null;
    const iniciar = () => {
      if (temporizador) return;
      enviarLatido();
      temporizador = setInterval(enviarLatido, 30000);
    };
    const detener = () => {
      if (temporizador) {
        clearInterval(temporizador);
        temporizador = null;
      }
    };

    if (AppState.currentState === 'active') iniciar();
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') iniciar();
      else detener();
    });

    return () => {
      detener();
      suscripcion.remove();
    };
  }, [token]);

  const guardarSesion = useCallback(async (nuevoToken: string, nuevoUsuario: Usuario) => {
    // Los dos guardados en paralelo (antes eran secuenciales).
    await Promise.all([
      AsyncStorage.setItem('cookly_token', nuevoToken),
      AsyncStorage.setItem('cookly_user', JSON.stringify(nuevoUsuario)),
    ]);
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
  }, []);

  async function sincronizarSupabase(correo: string, contrasena: string, nombre: string, esRegistro: boolean) {
    // URL a la que vuelve la app al tocar el enlace del correo de verificación
    const emailRedirectTo = Linking.createURL('auth/callback');

    try {
      if (esRegistro) {
        const { error } = await supabase.auth.signUp({
          email: correo,
          password: contrasena,
          options: {
            data: { nombre_completo: nombre },
            emailRedirectTo,
          },
        });
        if (error && error.message.includes('already registered')) {
          await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });

        if (error) {
          const msg = error.message.toLowerCase();

          // Cuenta creada en Supabase pero sin confirmar: NO volver a llamar signUp,
          // porque cada signUp reenvía otro correo de verificación.
          if (msg.includes('email not confirmed')) {
            console.log('AVISO: correo de Supabase pendiente de confirmar.');
            return;
          }

          // La cuenta ya existe en nuestro backend (login exitoso), pero no en Supabase.
          if (msg.includes('invalid login credentials')) {
            await supabase.auth.signUp({
              email: correo,
              password: contrasena,
              options: {
                data: { nombre_completo: nombre },
                emailRedirectTo,
              },
            });
          }
        }
      }
    } catch (error) {
      console.log('AVISO: no se pudo sincronizar con Supabase (comunidad podría no funcionar):', error);
    }
  }

  const login = useCallback(
    async (correo: string, contrasena: string) => {
      const { data } = await api.post('/autenticacion/login', { correo, contrasena }, { reintentar: true });
      await guardarSesion(data.token, { nombre: data.nombre, rol: data.rol, correo });
      // Ya NO se espera a Supabase: el usuario entra a la app de inmediato y la
      // sincronización con la comunidad ocurre en segundo plano.
      void sincronizarSupabase(correo, contrasena, data.nombre, false);
    },
    [guardarSesion]
  );

  const registrar = useCallback(
    async (nombre: string, correo: string, contrasena: string) => {
      const { data } = await api.post('/autenticacion/registro', { nombre, correo, contrasena });
      await guardarSesion(data.token, { nombre: data.nombre, rol: data.rol, correo });
      void sincronizarSupabase(correo, contrasena, nombre, true);
    },
    [guardarSesion]
  );

  /**
   * Login social (Google/Facebook): abre el navegador con el flujo OAuth de Supabase, recupera
   * el access_token de la URL de retorno y lo manda al backend para crear o recuperar el usuario.
   */
  const loginSocial = useCallback(
    async (proveedor: 'google' | 'facebook', scopes?: string) => {
      const redirectTo = Linking.createURL('auth/callback'); // usa el scheme "cookly" de app.json

      // Mientras la persona elige su cuenta en el navegador, el servidor se va despertando.
      despertarServidor();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: proveedor,
        options: { redirectTo, skipBrowserRedirect: true, ...(scopes ? { scopes } : {}) },
      });
      if (error || !data?.url) throw error ?? new Error(`No se pudo iniciar el flujo de ${proveedor}`);

      const resultado = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (resultado.type !== 'success' || !resultado.url) {
        throw new Error(`Inicio de sesión con ${proveedor} cancelado`);
      }

      // Supabase devuelve los tokens en el fragmento (#) de la URL de retorno
      const parametros = new URLSearchParams(resultado.url.split('#')[1]);
      const accessToken = parametros.get('access_token');
      const refreshToken = parametros.get('refresh_token');
      if (!accessToken || !refreshToken) throw new Error(`No se recibió la sesión de ${proveedor}`);

      // setSession y la llamada al backend en paralelo (antes eran una tras otra).
      const [, { data: respuesta }] = await Promise.all([
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }),
        api.post(
          '/autenticacion/acceso-social',
          {},
          { headers: { Authorization: `Bearer ${accessToken}` }, reintentar: true, timeout: 30000 }
        ),
      ]);

      await guardarSesion(respuesta.token, { nombre: respuesta.nombre, rol: respuesta.rol, correo: respuesta.correo });
    },
    [guardarSesion]
  );

  const loginConGoogle = useCallback(() => loginSocial('google'), [loginSocial]);
  const loginConFacebook = useCallback(() => loginSocial('facebook', 'email,public_profile'), [loginSocial]);

  const logout = useCallback(async () => {
    setToken(null);
    setUsuario(null);
    await Promise.all([AsyncStorage.multiRemove(['cookly_token', 'cookly_user']), supabase.auth.signOut()]);
  }, []);

  // Cambia el nombre en el servidor, en la comunidad (Supabase) y en el celular.
  const actualizarNombre = useCallback(
    async (nombre: string) => {
      const { data } = await api.put('/perfil/nombre', { nombre });
      const nuevo = (data?.nombre ?? nombre) as string;
      setUsuario((prev) => {
        if (!prev) return prev;
        const actualizado = { ...prev, nombre: nuevo };
        AsyncStorage.setItem('cookly_user', JSON.stringify(actualizado)).catch(() => {});
        return actualizado;
      });
      // La comunidad muestra el nombre del perfil de Supabase; si falla no pasa nada grave.
      try {
        const { data: sesion } = await supabase.auth.getSession();
        const id = sesion.session?.user.id;
        if (id) await supabase.from('profiles').update({ nombre_completo: nuevo }).eq('id', id);
      } catch {
        /* sin comunidad, el nombre igual quedó guardado en la app */
      }
    },
    []
  );

  const valor = useMemo(
    () => ({ usuario, token, cargando, login, registrar, loginConGoogle, loginConFacebook, logout, actualizarNombre }),
    [usuario, token, cargando, login, registrar, loginConGoogle, loginConFacebook, logout, actualizarNombre]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return contexto;
}