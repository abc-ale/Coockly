// lib/perfilSupabase.ts
// Actualiza el perfil público (el que ve la Comunidad). Devuelve true solo si de verdad se guardó:
// si las reglas de Supabase lo bloquean, la actualización no da error pero tampoco cambia ninguna fila.
import { supabase } from './supabase';

export async function actualizarPerfilSupabase(campos: { nombre_completo?: string; avatar?: string }): Promise<boolean> {
  try {
    const { data: sesion } = await supabase.auth.getSession();
    const id = sesion.session?.user.id;
    if (!id) return false;

    // 1) Función segura de Supabase (funciona aunque las reglas de la tabla bloqueen el UPDATE directo).
    const { error: errorRpc } = await supabase.rpc('actualizar_mi_perfil', {
      p_nombre: campos.nombre_completo ?? null,
      p_avatar: campos.avatar ?? null,
    });
    if (!errorRpc) return true;

    // 2) Si la función aún no existe: UPDATE directo, comprobando que de verdad cambió una fila.
    const { data, error } = await supabase.from('profiles').update(campos).eq('user_id', id).select('user_id');
    if (error) {
      console.warn('No se pudo actualizar el perfil:', error.message);
      return false;
    }
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}