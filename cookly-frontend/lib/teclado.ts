// lib/teclado.ts
// Sube una barra de escribir (comentarios, reseñas) para que el teclado NO la tape, sea cual sea el modo de Android.
// Mide dónde quedó la barra cuando sale el teclado: si el teclado la cubre, le da el margen justo; si Android ya
// acomodó la pantalla, no hace nada (así nunca queda doble espacio).
import { useEffect, useRef, useState } from 'react';
import { Keyboard, View } from 'react-native';

export function useBarraSobreTeclado() {
  const ref = useRef<View>(null);
  const [margen, setMargen] = useState(0);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const temporizadores: ReturnType<typeof setTimeout>[] = [];
    const medir = (topeTeclado: number) => {
      ref.current?.measureInWindow((_x, y, _w, h) => {
        const solape = y + h - topeTeclado;
        if (Math.abs(solape) > 2) setMargen((previo) => Math.max(0, previo + solape));
      });
    };
    const mostrar = Keyboard.addListener('keyboardDidShow', (e) => {
      setAbierto(true);
      const tope = e.endCoordinates.screenY;
      // Una medida cuando termina de acomodarse y otra de respaldo, por si el teclado tarda.
      temporizadores.push(setTimeout(() => medir(tope), 120));
      temporizadores.push(setTimeout(() => medir(tope), 450));
    });
    const ocultar = Keyboard.addListener('keyboardDidHide', () => {
      setAbierto(false);
      setMargen(0);
    });
    return () => {
      mostrar.remove();
      ocultar.remove();
      temporizadores.forEach(clearTimeout);
    };
  }, []);

  return { ref, margen, abierto };
}