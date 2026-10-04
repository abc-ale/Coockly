import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { api } from '../lib/api';
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

  // Monitoreo de uso: mientras la app está abierta y hay sesión, avisa al servidor cada 30 s.
  // El panel administrativo suma esos avisos para mostrar cuánto tiempo se usa Cookly.
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

  async function guardarSesion(nuevoToken: string, nuevoUsuario: Usuario) {
    await AsyncStorage.setItem('cookly_token', nuevoToken);
    await AsyncStorage.setItem('cookly_user', JSON.stringify(nuevoUsuario));
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
  }

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
          // Solo la autorreparamos si de verdad no existe en Supabase.
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

  async function login(correo: string, contrasena: string) {
    const { data } = await api.post('/autenticacion/login', { correo, contrasena });
    await guardarSesion(data.token, { nombre: data.nombre, rol: data.rol, correo });
    await sincronizarSupabase(correo, contrasena, data.nombre, false);
  }

  async function registrar(nombre: string, correo: string, contrasena: string) {
    const { data } = await api.post('/autenticacion/registro', { nombre, correo, contrasena });
    await guardarSesion(data.token, { nombre: data.nombre, rol: data.rol, correo });
    await sincronizarSupabase(correo, contrasena, nombre, true);
  }

  /**
   * Login con Google: abre el navegador con el flujo OAuth de Supabase, recupera
   * el access_token de la sesión de Supabase desde la URL de retorno, y lo manda
   * al backend (/autenticacion/acceso-social) para crear o recuperar el usuario.
   */
  async function loginConGoogle() {
    await loginSocial('google');
  }

  /** Login con Facebook: mismo flujo que Google, pidiendo el permiso de correo. */
  async function loginConFacebook() {
    await loginSocial('facebook', 'email,public_profile');
  }

  async function loginSocial(proveedor: 'google' | 'facebook', scopes?: string) {
    const redirectTo = Linking.createURL('auth/callback'); // usa el scheme "cookly" de app.json

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

    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

    const { data: respuesta } = await api.post(
      '/autenticacion/acceso-social',
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    await guardarSesion(respuesta.token, { nombre: respuesta.nombre, rol: respuesta.rol, correo: respuesta.correo });
  }

  async function logout() {
    await AsyncStorage.multiRemove(['cookly_token', 'cookly_user']);
    await supabase.auth.signOut();
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, token, cargando, login, registrar, loginConGoogle, loginConFacebook, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return contexto;
}