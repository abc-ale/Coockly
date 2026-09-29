import { Redirect } from 'expo-router';

// Pantalla a la que llega la app al tocar el enlace de verificación del correo
// (cookly://auth/callback). Supabase ya verificó el correo en su servidor,
// así que solo redirigimos al inicio.
export default function AuthCallback() {
  return <Redirect href="/" />;
}