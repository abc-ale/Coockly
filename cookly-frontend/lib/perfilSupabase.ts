// lib/perfilSupabase.ts
// Actualiza el perfil público (el que ve la Comunidad). Devuelve true solo si de verdad se guardó:
// si las reglas de Supabase lo bloquean, la actualización no da error pero tampoco cambia ninguna fila.
import { supabase } from './supabase';

export async function actualizarPerfilSupabase(campos: { nombre_completo?: string; avatar?: string }): Promise<boolean> {
  try {
    const { data: sesion } = await supabase.auth.getSession();
    const id = sesion.session?.user.id;
    if (!id) return false;
    const { data, error } = await supabase.from('profiles').update(campos).eq('id', id).select('id');
    if (error) {
      console.warn('No se pudo actualizar el perfil:', error.message);
      return false;
    }
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}