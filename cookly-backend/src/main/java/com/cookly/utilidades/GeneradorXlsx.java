package com.cookly.utilidades;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Genera archivos .xlsx sin librerías externas (un .xlsx es un ZIP de XML).
 * Soporta varias hojas, encabezado con color, anchos de columna, fila fija y filtro.
 * Los textos se guardan como texto (nunca como fórmula), así que no hay inyección de fórmulas.
 */
public final class GeneradorXlsx {

    /** Una hoja: nombre, encabezados, filas (String o Number) y ancho de cada columna en caracteres. */
    public record Hoja(String nombre, List<String> encabezados, List<List<Object>> filas, double[] anchos) { }

    private GeneradorXlsx() { }

    public static byte[] crear(List<Hoja> hojas) throws IOException {
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(salida, StandardCharsets.UTF_8)) {
            agregar(zip, "[Content_Types].xml", tiposContenido(hojas.size()));
            agregar(zip, "_rels/.rels",
                    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                    + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
                    + "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>"
                    + "</Relationships>");
            agregar(zip, "xl/workbook.xml", libro(hojas));
            agregar(zip, "xl/_rels/workbook.xml.rels", relacionesLibro(hojas.size()));
            agregar(zip, "xl/styles.xml", estilos());
            for (int i = 0; i < hojas.size(); i++) {
                agregar(zip, "xl/worksheets/sheet" + (i + 1) + ".xml", hoja(hojas.get(i)));
            }
        }
        return salida.toByteArray();
    }

    private static void agregar(ZipOutputStream zip, String ruta, String contenido) throws IOException {
        zip.putNextEntry(new ZipEntry(ruta));
        zip.write(contenido.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private static String tiposContenido(int n) {
        StringBuilder sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                + "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">"
                + "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>"
                + "<Default Extension=\"xml\" ContentType=\"application/xml\"/>"
                + "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>"
                + "<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>");
        for (int i = 1; i <= n; i++) {
            sb.append("<Override PartName=\"/xl/worksheets/sheet").append(i)
              .append(".xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>");
        }
        return sb.append("</Types>").toString();
    }

    private static String libro(List<Hoja> hojas) {
        StringBuilder sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                + "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" "
                + "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets>");
        for (int i = 0; i < hojas.size(); i++) {
            sb.append("<sheet name=\"").append(xml(nombreHoja(hojas.get(i).nombre())))
              .append("\" sheetId=\"").append(i + 1).append("\" r:id=\"rId").append(i + 1).append("\"/>");
        }
        return sb.append("</sheets></workbook>").toString();
    }

    private static String relacionesLibro(int n) {
        StringBuilder sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">");
        for (int i = 1; i <= n; i++) {
            sb.append("<Relationship Id=\"rId").append(i)
              .append("\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet")
              .append(i).append(".xml\"/>");
        }
        sb.append("<Relationship Id=\"rId").append(n + 1)
          .append("\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>");
        return sb.append("</Relationships>").toString();
    }

    /** Estilo 0 = normal, estilo 1 = encabezado (negrita, texto blanco, fondo rosa oscuro). */
    private static String estilos() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                + "<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">"
                + "<fonts count=\"2\">"
                + "<font><sz val=\"11\"/><name val=\"Calibri\"/></font>"
                + "<font><b/><sz val=\"11\"/><color rgb=\"FFFFFFFF\"/><name val=\"Calibri\"/></font>"
                + "</fonts>"
                + "<fills count=\"3\">"
                + "<fill><patternFill patternType=\"none\"/></fill>"
                + "<fill><patternFill patternType=\"gray125\"/></fill>"
                + "<fill><patternFill patternType=\"solid\"><fgColor rgb=\"FFD93A68\"/><bgColor indexed=\"64\"/></patternFill></fill>"
                + "</fills>"
                + "<borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders>"
                + "<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>"
                + "<cellXfs count=\"2\">"
                + "<xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/>"
                + "<xf numFmtId=\"0\" fontId=\"1\" fillId=\"2\" borderId=\"0\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\"/>"
                + "</cellXfs>"
                + "<cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles>"
                + "</styleSheet>";
    }

    private static String hoja(Hoja h) {
        int columnas = h.encabezados().size();
        int ultimaFila = h.filas().size() + 1;
        StringBuilder sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                + "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">");
        sb.append("<sheetViews><sheetView workbookViewId=\"0\">"
                + "<pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/>"
                + "</sheetView></sheetViews>");
        if (h.anchos() != null && h.anchos().length > 0) {
            sb.append("<cols>");
            for (int i = 0; i < h.anchos().length; i++) {
                sb.append("<col min=\"").append(i + 1).append("\" max=\"").append(i + 1)
                  .append("\" width=\"").append(h.anchos()[i]).append("\" customWidth=\"1\"/>");
            }
            sb.append("</cols>");
        }
        sb.append("<sheetData>");

        sb.append("<row r=\"1\">");
        for (int c = 0; c < columnas; c++) {
            celdaTexto(sb, c, 1, h.encabezados().get(c), 1);
        }
        sb.append("</row>");

        int fila = 2;
        for (List<Object> datos : h.filas()) {
            sb.append("<row r=\"").append(fila).append("\">");
            for (int c = 0; c < datos.size(); c++) {
                Object v = datos.get(c);
                if (v == null) {
                    continue;
                }
                if (v instanceof Number n) {
                    sb.append("<c r=\"").append(columna(c)).append(fila).append("\"><v>")
                      .append(n.toString()).append("</v></c>");
                } else {
                    celdaTexto(sb, c, fila, v.toString(), 0);
                }
            }
            sb.append("</row>");
            fila++;
        }
        sb.append("</sheetData>");
        if (columnas > 0 && ultimaFila > 1) {
            sb.append("<autoFilter ref=\"A1:").append(columna(columnas - 1)).append(ultimaFila).append("\"/>");
        }
        return sb.append("</worksheet>").toString();
    }

    private static void celdaTexto(StringBuilder sb, int col, int fila, String texto, int estilo) {
        sb.append("<c r=\"").append(columna(col)).append(fila).append("\" t=\"inlineStr\"");
        if (estilo != 0) {
            sb.append(" s=\"").append(estilo).append("\"");
        }
        sb.append("><is><t xml:space=\"preserve\">").append(xml(texto)).append("</t></is></c>");
    }

    /** 0 -> A, 25 -> Z, 26 -> AA. */
    static String columna(int indice) {
        StringBuilder sb = new StringBuilder();
        int n = indice;
        while (n >= 0) {
            sb.insert(0, (char) ('A' + n % 26));
            n = n / 26 - 1;
        }
        return sb.toString();
    }

    private static String nombreHoja(String nombre) {
        String limpio = nombre.replaceAll("[\\\\/?*\\[\\]:]", " ").trim();
        if (limpio.isEmpty()) {
            limpio = "Hoja";
        }
        return limpio.length() > 31 ? limpio.substring(0, 31) : limpio;
    }

    private static String xml(String s) {
        StringBuilder sb = new StringBuilder(s.length() + 8);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '&' -> sb.append("&amp;");
                case '<' -> sb.append("&lt;");
                case '>' -> sb.append("&gt;");
                case '"' -> sb.append("&quot;");
                default -> {
                    // Se descartan los caracteres de control que XML no permite.
                    if (c == '\t' || c == '\n' || c == '\r' || c >= 0x20) {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }
}