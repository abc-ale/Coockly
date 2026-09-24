import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  async function guardarSesion(nuevoToken: string, nuevoUsuario: Usuario) {
    await AsyncStorage.setItem('cookly_token', nuevoToken);
    await AsyncStorage.setItem('cookly_user', JSON.stringify(nuevoUsuario));
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
  }

  async function sincronizarSupabase(correo: string, contrasena: string, nombre: string, esRegistro: boolean) {
    try {
      if (esRegistro) {
        const { error } = await supabase.auth.signUp({
          email: correo,
          password: contrasena,
          options: { data: { nombre_completo: nombre } },
        });
        if (error && error.message.includes('already registered')) {
          await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
        if (error) {
          // La cuenta ya existe en nuestro backend (login exitoso), pero no en Supabase.
          // Como la contraseña ya fue validada por el backend, la creamos aquí para autorepararla.
          await supabase.auth.signUp({
            email: correo,
            password: contrasena,
            options: { data: { nombre_completo: nombre } },
          });
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

  async function logout() {
    await AsyncStorage.multiRemove(['cookly_token', 'cookly_user']);
    await supabase.auth.signOut();
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, token, cargando, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return contexto;
}