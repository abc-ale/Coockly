// lib/errores.ts
// Convierte mensajes técnicos (excepciones de Java, errores de red de axios...) en frases claras en español.

const GENERICO = 'Algo salió mal de nuestro lado. Inténtalo de nuevo en un momento.';

const PARECE_TECNICO =
  /exception|java\.|org\.springframework|com\.cookly|stack ?trace|no session|\bproxy\b|hibernate|jdbc|\bsql\b|null ?pointer|request failed with status code|axios/i;

export function limpiarMensaje(mensaje?: string): string | undefined {
  if (!mensaje) return mensaje;

  if (/network error/i.test(mensaje)) {
    return 'No pudimos conectar con el servidor. Revisa tu internet e inténtalo de nuevo.';
  }
  if (/timeout|econnaborted/i.test(mensaje)) {
    return 'El servidor está tardando en responder. Inténtalo de nuevo en unos segundos.';
  }
  if (/status code 40[13]/i.test(mensaje)) {
    return 'Tu sesión venció. Entra de nuevo.';
  }
  // El servidor a veces manda "Ocurrió un error al procesar la solicitud. [detalle técnico]".
  if (/ocurri[oó] un error al procesar la solicitud/i.test(mensaje) || PARECE_TECNICO.test(mensaje)) {
    return GENERICO;
  }
  return mensaje;
}