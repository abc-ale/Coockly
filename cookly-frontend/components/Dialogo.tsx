// components/Dialogo.tsx
// Diálogo con el estilo de Cookly. Al montarse, reemplaza a Alert.alert en TODA la app,
// así que los Alert.alert que ya tienes se ven bonitos sin tocar esos archivos.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../constants/theme';
import { limpiarMensaje } from '../lib/errores';

type BotonAlerta = {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: (valor?: string) => void;
};

type Pedido = { titulo: string; mensaje?: string; botones: BotonAlerta[] };

type Manejador = (titulo: string, mensaje?: string, botones?: BotonAlerta[]) => void;

// Guardamos el Alert.alert ORIGINAL en una global para que, con Fast Refresh, nunca se guarde el ya reemplazado.
const g = globalThis as any;
g.__alertaOriginal = g.__alertaOriginal ?? Alert.alert;
const alertaOriginal: typeof Alert.alert = g.__alertaOriginal;

let manejador: Manejador | null = null;

/** Úsala en vez de Alert.alert: muestra el diálogo de Cookly (o el nativo si el provider aún no montó). */
export function mostrarAlerta(titulo: string, mensaje?: string, botones?: BotonAlerta[]) {
  // Nunca se le muestra al usuario un texto técnico (excepciones de Java, errores de red...).
  mensaje = limpiarMensaje(mensaje);
  console.log('[Dialogo] mostrarAlerta ->', titulo, manejador ? '(diálogo Cookly)' : '(nativo)');
  if (manejador) manejador(titulo, mensaje, botones);
  else alertaOriginal.call(Alert, titulo, mensaje, botones as any);
}

// Reemplazo global inmediato: cualquier Alert.alert de la app pasa por aquí apenas se importa este archivo.
(Alert as any).alert = mostrarAlerta;

/** Elige icono y color según el contenido del aviso. */
function estiloDe(p: Pedido) {
  const texto = `${p.titulo} ${p.mensaje ?? ''}`;
  if (/error|no se pudo|fall[oó]/i.test(p.titulo)) {
    return { icono: 'close-circle' as const, color: colors.danger, fondo: '#FDE8E8' };
  }
  if (p.botones.some((b) => b.style === 'destructive')) {
    if (/sesi[oó]n/i.test(texto)) {
      return { icono: 'log-out-outline' as const, color: colors.primaryDark, fondo: colors.primaryLight };
    }
    return { icono: 'warning' as const, color: '#C98A00', fondo: '#FFF4D6' };
  }
  if (/falta|faltan|vac[ií]a|inv[aá]lido|muy corta|permiso/i.test(p.titulo)) {
    return { icono: 'alert-circle' as const, color: '#C98A00', fondo: '#FFF4D6' };
  }
  return { icono: 'information-circle' as const, color: colors.primaryDark, fondo: colors.primaryLight };
}

export function DialogoProvider({ children }: { children: React.ReactNode }) {
  const [actual, setActual] = useState<Pedido | null>(null);
  const cola = useRef<Pedido[]>([]);
  const abierto = useRef(false);
  const escala = useRef(new Animated.Value(0.9)).current;
  const opacidad = useRef(new Animated.Value(0)).current;

  const abrir = useCallback(
    (p: Pedido) => {
      abierto.current = true;
      escala.setValue(0.9);
      opacidad.setValue(0);
      setActual(p);
      Animated.parallel([
        Animated.spring(escala, { toValue: 1, useNativeDriver: true, friction: 8, tension: 120 }),
        Animated.timing(opacidad, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]).start();
    },
    [escala, opacidad]
  );

  const mostrar = useCallback(
    (titulo: string, mensaje?: string, botones?: BotonAlerta[]) => {
      const pedido: Pedido = {
        titulo,
        mensaje,
        botones: botones && botones.length ? botones : [{ text: 'Aceptar' }],
      };
      if (abierto.current) {
        cola.current.push(pedido); // ya hay uno abierto: queda en espera
      } else {
        abrir(pedido);
      }
    },
    [abrir]
  );

  // Conecta este provider con mostrarAlerta mientras esté montado.
  useEffect(() => {
    manejador = mostrar;
    return () => {
      if (manejador === mostrar) manejador = null;
    };
  }, [mostrar]);

  const cerrar = useCallback(
    (boton?: BotonAlerta) => {
      Animated.timing(opacidad, { toValue: 0, duration: 110, useNativeDriver: true }).start(() => {
        abierto.current = false;
        setActual(null);
        boton?.onPress?.();
        const siguiente = cola.current.shift();
        if (siguiente) setTimeout(() => abrir(siguiente), 60);
      });
    },
    [opacidad, abrir]
  );

  // Botón "atrás" de Android: equivale a Cancelar (o a cerrar si no hay cancelar).
  useEffect(() => {
    if (!actual) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      cerrar(actual.botones.find((b) => b.style === 'cancel'));
      return true;
    });
    return () => sub.remove();
  }, [actual, cerrar]);

  const estilo = actual ? estiloDe(actual) : null;
  const botones = actual?.botones ?? [];
  const enFila = botones.length === 2;
  const cuantosNormales = botones.filter((b) => b.style !== 'cancel' && b.style !== 'destructive').length;

  return (
    <>
      {children}
      <Modal visible={!!actual} transparent animationType="none" statusBarTranslucent onRequestClose={() => cerrar()}>
        <Animated.View style={[styles.fondo, { opacity: opacidad }]}>
          <Animated.View style={[styles.tarjeta, { transform: [{ scale: escala }] }]}>
            {estilo && (
              <View style={[styles.iconoCirculo, { backgroundColor: estilo.fondo }]}>
                <Ionicons name={estilo.icono} size={32} color={estilo.color} />
              </View>
            )}

            <Text style={styles.titulo}>{actual?.titulo}</Text>
            {!!actual?.mensaje && <Text style={styles.mensaje}>{actual.mensaje}</Text>}

            <View style={[styles.botones, enFila && styles.botonesFila]}>
              {botones.map((b, i) => {
                const esCancelar = b.style === 'cancel';
                const esPeligro = b.style === 'destructive';
                // Con varias opciones normales (ej. menú de admin) se usan botones suaves para no saturar.
                const esSuave = esCancelar || (!esPeligro && cuantosNormales > 1);
                return (
                  <Pressable
                    key={`${b.text}-${i}`}
                    onPress={() => cerrar(b)}
                    style={({ pressed }) => [
                      styles.boton,
                      enFila && { flex: 1 },
                      esSuave
                        ? { backgroundColor: colors.primaryLight }
                        : { backgroundColor: esPeligro ? colors.danger : colors.primary },
                      pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Text style={[styles.botonTexto, { color: esSuave ? colors.primaryDark : colors.white }]}>
                      {b.text ?? 'Aceptar'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(46, 32, 36, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 26,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + 4,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  iconoCirculo: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  titulo: { ...typography.h2, color: colors.text, textAlign: 'center' },
  mensaje: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  botones: { width: '100%', marginTop: spacing.lg, gap: spacing.sm },
  botonesFila: { flexDirection: 'row' },
  boton: {
    minHeight: 48,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonTexto: { fontSize: 15, fontWeight: '700' },
});