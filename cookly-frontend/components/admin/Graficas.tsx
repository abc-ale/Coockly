// components/admin/Graficas.tsx
// Gráficas hechas solo con View y Text: no necesitan librerías nativas, así que funcionan
// sin recompilar la app. Toca una barra para ver su valor exacto.
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../../constants/theme';

export function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.tarjetaTitulo} accessibilityRole="header">
        {titulo}
      </Text>
      {children}
    </View>
  );
}

export function Cifra({ etiqueta, valor, nota, onPress }: {
  etiqueta: string;
  valor: string;
  nota?: string;
  onPress?: () => void;
}) {
  const contenido = (
    <>
      <Text style={estilos.cifraEtiqueta}>{etiqueta}</Text>
      <Text style={estilos.cifraValor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      {nota ? <Text style={estilos.cifraNota}>{nota}</Text> : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable style={estilos.cifra} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${etiqueta}: ${valor}`}>
        {contenido}
      </Pressable>
    );
  }
  return <View style={estilos.cifra}>{contenido}</View>;
}

export function Segmentos<T extends string | number>({ opciones, valor, onCambio }: {
  opciones: { valor: T; etiqueta: string }[];
  valor: T;
  onCambio: (v: T) => void;
}) {
  return (
    <View style={estilos.segmentos} accessibilityRole="tablist">
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={String(o.valor)}
            style={[estilos.segmento, activo && estilos.segmentoActivo]}
            onPress={() => onCambio(o.valor)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
          >
            <Text style={[estilos.segmentoTexto, activo && estilos.segmentoTextoActivo]}>{o.etiqueta}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type PuntoBarra = { etiqueta: string; valor: number };

export function GraficaBarras({ datos, color = colors.primaryDark, formato }: {
  datos: PuntoBarra[];
  color?: string;
  formato?: (n: number) => string;
}) {
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const ALTO = 120;

  if (datos.length === 0) return <Text style={estilos.vacio}>Todavía no hay datos.</Text>;

  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  const mostrar = formato ?? ((n: number) => String(n));
  const actual = seleccion !== null ? datos[seleccion] : null;
  const medio = datos[Math.floor((datos.length - 1) / 2)];

  return (
    <View>
      <Text style={estilos.lectura} accessibilityLiveRegion="polite">
        {actual ? `${actual.etiqueta}: ${mostrar(actual.valor)}` : 'Toca una barra para ver el valor'}
      </Text>
      <View style={[estilos.barras, { height: ALTO }]}>
        {datos.map((d, i) => {
          const alto = d.valor > 0 ? Math.max(3, (d.valor / maximo) * ALTO) : 0;
          return (
            <Pressable
              key={`${d.etiqueta}-${i}`}
              style={estilos.barraZona}
              onPress={() => setSeleccion(seleccion === i ? null : i)}
              accessibilityLabel={`${d.etiqueta}: ${mostrar(d.valor)}`}
            >
              <View
                style={{
                  height: alto,
                  backgroundColor: seleccion === i ? colors.text : color,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                  opacity: seleccion === null || seleccion === i ? 1 : 0.45,
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={estilos.base} />
      <View style={estilos.ejeX}>
        <Text style={estilos.ejeTexto}>{datos[0].etiqueta}</Text>
        <Text style={estilos.ejeTexto}>{datos.length > 2 ? medio.etiqueta : ''}</Text>
        <Text style={estilos.ejeTexto}>{datos[datos.length - 1].etiqueta}</Text>
      </View>
      <Text style={estilos.maximo}>Máximo: {mostrar(maximo)}</Text>
    </View>
  );
}

/**
 * Gráfica de líneas hecha solo con View: cada tramo es una barrita fina girada entre dos puntos.
 * Toca la gráfica para ver el valor exacto de un día.
 */
export function GraficaLineas({ datos, color = colors.primaryDark, formato }: {
  datos: PuntoBarra[];
  color?: string;
  formato?: (n: number) => string;
}) {
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [ancho, setAncho] = useState(0);
  const ALTO = 120;
  const MARGEN = 8;

  if (datos.length === 0) return <Text style={estilos.vacio}>Todavía no hay datos.</Text>;

  const n = datos.length;
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  const mostrar = formato ?? ((v: number) => String(v));
  const actual = seleccion !== null ? datos[seleccion] : null;
  const medio = datos[Math.floor((n - 1) / 2)];
  const util = ALTO - MARGEN * 2;
  const puntos = datos.map((d, i) => ({
    x: n === 1 ? ancho / 2 : MARGEN + (i * (ancho - MARGEN * 2)) / (n - 1),
    y: MARGEN + (1 - d.valor / maximo) * util,
  }));
  const verPuntos = n <= 31;

  return (
    <View>
      <Text style={estilos.lectura} accessibilityLiveRegion="polite">
        {actual ? `${actual.etiqueta}: ${mostrar(actual.valor)}` : 'Toca la gráfica para ver el valor'}
      </Text>
      <View style={{ height: ALTO }} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
        {ancho > 0 && seleccion !== null ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: puntos[seleccion].x, top: 0, width: 1, height: ALTO, backgroundColor: color, opacity: 0.35 }}
          />
        ) : null}
        {ancho > 0
          ? puntos.slice(1).map((p, i) => {
              const a = puntos[i];
              const dx = p.x - a.x;
              const dy = p.y - a.y;
              const largo = Math.sqrt(dx * dx + dy * dy);
              return (
                <View
                  key={`tramo-${i}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: (a.x + p.x) / 2 - largo / 2,
                    top: (a.y + p.y) / 2 - 1.5,
                    width: largo,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: color,
                    transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                  }}
                />
              );
            })
          : null}
        {ancho > 0
          ? puntos.map((p, i) => {
              const elegido = seleccion === i;
              if (!verPuntos && !elegido) return null;
              const t = elegido ? 11 : 7;
              return (
                <View
                  key={`punto-${i}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: p.x - t / 2,
                    top: p.y - t / 2,
                    width: t,
                    height: t,
                    borderRadius: t / 2,
                    backgroundColor: elegido ? colors.text : color,
                    borderWidth: 1.5,
                    borderColor: '#FFFFFF',
                  }}
                />
              );
            })
          : null}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
          {datos.map((d, i) => (
            <Pressable
              key={`zona-${d.etiqueta}-${i}`}
              style={{ flex: 1 }}
              onPress={() => setSeleccion(seleccion === i ? null : i)}
              accessibilityLabel={`${d.etiqueta}: ${mostrar(d.valor)}`}
            />
          ))}
        </View>
      </View>
      <View style={estilos.base} />
      <View style={estilos.ejeX}>
        <Text style={estilos.ejeTexto}>{datos[0].etiqueta}</Text>
        <Text style={estilos.ejeTexto}>{n > 2 ? medio.etiqueta : ''}</Text>
        <Text style={estilos.ejeTexto}>{datos[n - 1].etiqueta}</Text>
      </View>
      <Text style={estilos.maximo}>Máximo: {mostrar(maximo)}</Text>
    </View>
  );
}

export function GraficaRanking({ datos, color = colors.primaryDark, formato, vacio }: {
  datos: { nombre: string; valor: number }[];
  color?: string;
  formato?: (n: number) => string;
  vacio?: string;
}) {
  if (datos.length === 0) return <Text style={estilos.vacio}>{vacio ?? 'Todavía no hay datos.'}</Text>;
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  const mostrar = formato ?? ((n: number) => String(n));
  return (
    <View style={{ gap: spacing.sm }}>
      {datos.map((d, i) => (
        <View key={`${d.nombre}-${i}`}>
          <View style={estilos.rankingFila}>
            <Text style={estilos.rankingNombre} numberOfLines={1}>
              {d.nombre}
            </Text>
            <Text style={estilos.rankingValor}>{mostrar(d.valor)}</Text>
          </View>
          <View style={estilos.pista}>
            <View style={[estilos.relleno, { width: `${Math.max(2, (d.valor / maximo) * 100)}%`, backgroundColor: color }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function BarraApilada({ partes }: { partes: { nombre: string; valor: number; color: string }[] }) {
  const total = partes.reduce((a, p) => a + p.valor, 0);
  if (total === 0) return <Text style={estilos.vacio}>Todavía no hay datos.</Text>;
  return (
    <View>
      <View style={estilos.apilada}>
        {partes
          .filter((p) => p.valor > 0)
          .map((p) => (
            <View key={p.nombre} style={{ flex: p.valor, backgroundColor: p.color }} />
          ))}
      </View>
      <View style={estilos.leyenda}>
        {partes.map((p) => (
          <View key={p.nombre} style={estilos.leyendaItem}>
            <View style={[estilos.punto, { backgroundColor: p.color }]} />
            <Text style={estilos.leyendaTexto}>
              {p.nombre} · {p.valor} ({Math.round((p.valor / total) * 100)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, ...shadow.card },
  tarjetaTitulo: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  cifra: { flexGrow: 1, flexBasis: '46%', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  cifraEtiqueta: { ...typography.bodySmall, color: colors.textMuted },
  cifraValor: { fontSize: 30, fontWeight: '700', color: colors.text, marginTop: 2 },
  cifraNota: { ...typography.caption, color: colors.primaryDark, marginTop: 2 },
  segmentos: { flexDirection: 'row', backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: 3 },
  segmento: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  segmentoActivo: { backgroundColor: colors.surface, ...shadow.card },
  segmentoTexto: { ...typography.bodySmall, color: colors.textMuted, fontWeight: '600' },
  segmentoTextoActivo: { color: colors.primaryDark },
  vacio: { ...typography.body, color: colors.textMuted, paddingVertical: spacing.sm },
  lectura: { ...typography.bodySmall, color: colors.textMuted, marginBottom: spacing.sm, minHeight: 18 },
  barras: { flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  barraZona: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  base: { height: 1, backgroundColor: colors.border },
  ejeX: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  ejeTexto: { ...typography.caption, color: colors.textMuted },
  maximo: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  rankingFila: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  rankingNombre: { ...typography.bodySmall, color: colors.text, flex: 1 },
  rankingValor: { ...typography.bodySmall, color: colors.text, fontWeight: '700' },
  pista: { height: 8, backgroundColor: colors.primaryLight, borderRadius: radius.pill, marginTop: 4, overflow: 'hidden' },
  relleno: { height: 8, borderRadius: radius.pill },
  apilada: { flexDirection: 'row', height: 18, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.border },
  leyenda: { marginTop: spacing.sm, gap: 4 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  leyendaTexto: { ...typography.bodySmall, color: colors.text },
});