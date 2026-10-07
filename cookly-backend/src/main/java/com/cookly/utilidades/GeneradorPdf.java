package com.cookly.utilidades;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.zip.Deflater;
import java.util.zip.DeflaterOutputStream;

/**
 * Genera un PDF con una tabla (A4 horizontal) sin librerías externas.
 * Usa las fuentes estándar Helvetica y Helvetica-Bold (incluidas en todos los lectores de PDF)
 * con codificación WinAnsi, que cubre tildes y la ñ.
 */
public final class GeneradorPdf {

    private static final double ANCHO = 841.89;
    private static final double ALTO = 595.28;
    private static final double MARGEN = 36;
    private static final double ALTO_FILA = 16;
    private static final double ALTO_ENCABEZADO = 20;
    private static final double TAM_TEXTO = 8;

    /** Anchos de Helvetica (milésimas de em) para los caracteres 32 a 126. */
    private static final int[] ANCHOS = {
            278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
            556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
            1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
            667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
            333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
            556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584 };

    private GeneradorPdf() { }

    public static byte[] crear(String titulo, String subtitulo, List<String> resumen,
                               List<String> encabezados, List<List<String>> filas,
                               double[] proporciones, String pie) throws IOException {
        double anchoUtil = ANCHO - 2 * MARGEN;
        double[] columnas = anchosColumnas(proporciones, encabezados.size(), anchoUtil);

        List<StringBuilder> paginas = new ArrayList<>();
        StringBuilder pagina = nuevaPagina(paginas);
        double y = ALTO - MARGEN;

        // Portada de la tabla: título, subtítulo y resumen (solo en la primera página)
        y -= 16;
        texto(pagina, true, 16, MARGEN, y, titulo, 0.76, 0.36, 0.44);
        y -= 16;
        if (subtitulo != null && !subtitulo.isBlank()) {
            texto(pagina, false, 9, MARGEN, y, subtitulo, 0.55, 0.45, 0.47);
            y -= 14;
        }
        for (String linea : resumen) {
            texto(pagina, false, 9, MARGEN, y, linea, 0.18, 0.13, 0.14);
            y -= 12;
        }
        y -= 10;

        y = encabezado(pagina, encabezados, columnas, y);

        if (filas.isEmpty()) {
            texto(pagina, false, 9, MARGEN + 4, y - 14, "No hay datos para mostrar.", 0.55, 0.45, 0.47);
        }

        int numeroFila = 0;
        for (List<String> fila : filas) {
            if (y - ALTO_FILA < MARGEN + 14) {
                pagina = nuevaPagina(paginas);
                y = encabezado(pagina, encabezados, columnas, ALTO - MARGEN);
            }
            if (numeroFila % 2 == 1) {
                relleno(pagina, MARGEN, y - ALTO_FILA, anchoUtil, ALTO_FILA, 1.0, 0.953, 0.965);
            }
            double x = MARGEN;
            for (int c = 0; c < columnas.length; c++) {
                String celda = c < fila.size() && fila.get(c) != null ? fila.get(c) : "";
                texto(pagina, false, TAM_TEXTO, x + 4, y - 11,
                        ajustar(celda, columnas[c] - 8, false), 0.18, 0.13, 0.14);
                x += columnas[c];
            }
            y -= ALTO_FILA;
            numeroFila++;
        }

        int total = paginas.size();
        for (int i = 0; i < total; i++) {
            texto(paginas.get(i), false, 7, MARGEN, 22, pie, 0.55, 0.45, 0.47);
            String num = "Página " + (i + 1) + " de " + total;
            texto(paginas.get(i), false, 7, ANCHO - MARGEN - anchoTexto(num, 7, false), 22, num, 0.55, 0.45, 0.47);
        }
        return ensamblar(paginas, titulo);
    }

    // ------------------------------------------------------------------ dibujo

    private static StringBuilder nuevaPagina(List<StringBuilder> paginas) {
        StringBuilder sb = new StringBuilder(8192);
        paginas.add(sb);
        return sb;
    }

    private static double encabezado(StringBuilder p, List<String> titulos, double[] columnas, double y) {
        double ancho = 0;
        for (double c : columnas) {
            ancho += c;
        }
        relleno(p, MARGEN, y - ALTO_ENCABEZADO, ancho, ALTO_ENCABEZADO, 0.76, 0.36, 0.44);
        double x = MARGEN;
        for (int c = 0; c < columnas.length; c++) {
            texto(p, true, TAM_TEXTO, x + 4, y - 13, ajustar(titulos.get(c), columnas[c] - 8, true), 1, 1, 1);
            x += columnas[c];
        }
        return y - ALTO_ENCABEZADO;
    }

    private static void relleno(StringBuilder p, double x, double y, double w, double h, double r, double g, double b) {
        p.append(num(r)).append(' ').append(num(g)).append(' ').append(num(b)).append(" rg\n")
         .append(num(x)).append(' ').append(num(y)).append(' ').append(num(w)).append(' ').append(num(h)).append(" re f\n");
    }

    private static void texto(StringBuilder p, boolean negrita, double tam, double x, double y, String t,
                              double r, double g, double b) {
        p.append(num(r)).append(' ').append(num(g)).append(' ').append(num(b)).append(" rg\n")
         .append("BT /").append(negrita ? "F2" : "F1").append(' ').append(num(tam)).append(" Tf ")
         .append(num(x)).append(' ').append(num(y)).append(" Td (").append(escapar(t)).append(") Tj ET\n");
    }

    // ------------------------------------------------------------------ texto

    private static double[] anchosColumnas(double[] proporciones, int n, double total) {
        double[] r = new double[n];
        double suma = 0;
        for (int i = 0; i < n; i++) {
            r[i] = proporciones != null && i < proporciones.length && proporciones[i] > 0 ? proporciones[i] : 1;
            suma += r[i];
        }
        for (int i = 0; i < n; i++) {
            r[i] = r[i] / suma * total;
        }
        return r;
    }

    static double anchoTexto(String t, double tam, boolean negrita) {
        double u = 0;
        for (int i = 0; i < t.length(); i++) {
            char c = t.charAt(i);
            u += (c >= 32 && c <= 126) ? ANCHOS[c - 32] : 600;
        }
        return u / 1000.0 * tam * (negrita ? 1.07 : 1.0);
    }

    private static String ajustar(String t, double anchoMax, boolean negrita) {
        String limpio = normalizar(t);
        if (anchoTexto(limpio, TAM_TEXTO, negrita) <= anchoMax) {
            return limpio;
        }
        int fin = limpio.length();
        while (fin > 0 && anchoTexto(limpio.substring(0, fin) + "...", TAM_TEXTO, negrita) > anchoMax) {
            fin--;
        }
        return limpio.substring(0, fin) + "...";
    }

    /** Deja solo caracteres que WinAnsi puede mostrar; lo demás se cambia por un equivalente o "?". */
    private static String normalizar(String t) {
        if (t == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder(t.length());
        for (int i = 0; i < t.length(); i++) {
            char c = t.charAt(i);
            if (c >= 32 && c <= 126 || c >= 160 && c <= 255) {
                sb.append(c);
            } else if (c == '\u2013' || c == '\u2014') {
                sb.append('-');
            } else if (c == '\u2018' || c == '\u2019') {
                sb.append('\'');
            } else if (c == '\u201C' || c == '\u201D') {
                sb.append('"');
            } else if (c == '\u2026') {
                sb.append("...");
            } else if (Character.isHighSurrogate(c)) {
                sb.append('?');
                i++; // el par sustituto (emoji) cuenta como un solo carácter
            } else if (c < 32) {
                sb.append(' ');
            } else {
                sb.append('?');
            }
        }
        return sb.toString();
    }

    private static String escapar(String t) {
        String limpio = normalizar(t);
        StringBuilder sb = new StringBuilder(limpio.length() + 8);
        for (int i = 0; i < limpio.length(); i++) {
            char c = limpio.charAt(i);
            if (c == '(' || c == ')' || c == '\\') {
                sb.append('\\');
            }
            sb.append(c);
        }
        return sb.toString();
    }

    private static String num(double v) {
        return String.format(Locale.ROOT, "%.2f", v);
    }

    // ------------------------------------------------------------------ estructura del archivo

    private static byte[] ensamblar(List<StringBuilder> paginas, String titulo) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        List<Integer> posiciones = new ArrayList<>();
        int paginasN = paginas.size();

        escribir(out, "%PDF-1.4\n");
        out.write(new byte[] { '%', (byte) 0xE2, (byte) 0xE3, (byte) 0xCF, (byte) 0xD3, '\n' });

        objeto(out, posiciones, 1, "<< /Type /Catalog /Pages 2 0 R >>");
        StringBuilder kids = new StringBuilder();
        for (int i = 0; i < paginasN; i++) {
            kids.append(6 + 2 * i).append(" 0 R ");
        }
        objeto(out, posiciones, 2, "<< /Type /Pages /Count " + paginasN + " /Kids [ " + kids + "] >>");
        objeto(out, posiciones, 3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
        objeto(out, posiciones, 4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
        objeto(out, posiciones, 5, "<< /Title (" + escapar(titulo) + ") /Producer (Cookly) >>");

        for (int i = 0; i < paginasN; i++) {
            int idPagina = 6 + 2 * i;
            int idContenido = 7 + 2 * i;
            objeto(out, posiciones, idPagina,
                    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + num(ANCHO) + " " + num(ALTO) + "] "
                            + "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + idContenido + " 0 R >>");

            byte[] crudo = paginas.get(i).toString().getBytes(StandardCharsets.ISO_8859_1);
            ByteArrayOutputStream comprimido = new ByteArrayOutputStream();
            try (DeflaterOutputStream d = new DeflaterOutputStream(comprimido, new Deflater(Deflater.BEST_COMPRESSION))) {
                d.write(crudo);
            }
            byte[] datos = comprimido.toByteArray();
            posiciones.add(out.size());
            escribir(out, idContenido + " 0 obj\n<< /Length " + datos.length + " /Filter /FlateDecode >>\nstream\n");
            out.write(datos);
            escribir(out, "\nendstream\nendobj\n");
        }

        int inicioXref = out.size();
        int total = posiciones.size() + 1;
        escribir(out, "xref\n0 " + total + "\n0000000000 65535 f \n");
        for (int pos : posiciones) {
            escribir(out, String.format(Locale.ROOT, "%010d 00000 n \n", pos));
        }
        escribir(out, "trailer\n<< /Size " + total + " /Root 1 0 R /Info 5 0 R >>\nstartxref\n" + inicioXref + "\n%%EOF\n");
        return out.toByteArray();
    }

    private static void objeto(ByteArrayOutputStream out, List<Integer> posiciones, int id, String cuerpo) throws IOException {
        posiciones.add(out.size());
        escribir(out, id + " 0 obj\n" + cuerpo + "\nendobj\n");
    }

    private static void escribir(ByteArrayOutputStream out, String s) throws IOException {
        out.write(s.getBytes(StandardCharsets.ISO_8859_1));
    }
}