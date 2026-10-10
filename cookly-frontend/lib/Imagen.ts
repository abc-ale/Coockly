// lib/imagen.ts
// Pide a Cloudinary una versión más liviana de la foto (ancho máximo y calidad 80), así cargan más rápido.
// Si la dirección no es de Cloudinary, o ya trae transformaciones, se devuelve igual.
export function optimizarImagen(url?: string | null, ancho = 600): string | undefined {
  if (!url) return undefined;
  if (!url.includes('res.cloudinary.com') || !/\/upload\/v\d+\//.test(url)) return url;
  return url.replace('/upload/', `/upload/w_${ancho},q_80/`);
}