package com.cookly.utilidades;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GeneradoresTest {

    @Test
    void pdfEsValidoYTieneElTitulo() throws Exception {
        byte[] pdf = GeneradorPdf.crear("Reporte de usuarios", "Cookly", List.of("Usuarios: 3"),
                List.of("Nombre", "Correo"), List.of(List.of("Mell", "mell@cookly.com")), new double[] { 1, 2 }, "pie");
        String texto = new String(pdf, StandardCharsets.ISO_8859_1);
        assertTrue(texto.startsWith("%PDF-1.4"));
        assertTrue(texto.trim().endsWith("%%EOF"));
        assertTrue(texto.contains("Reporte de usuarios"));
    }

    @Test
    void pdfConMuchasFilasUsaVariasPaginas() throws Exception {
        List<List<String>> filas = new java.util.ArrayList<>();
        for (int i = 0; i < 100; i++) filas.add(List.of("Fila " + i, "correo" + i + "@cookly.com"));
        byte[] pdf = GeneradorPdf.crear("Reporte", "", List.of(), List.of("A", "B"), filas, null, "pie");
        String texto = new String(pdf, StandardCharsets.ISO_8859_1);
        int paginas = texto.split("/Type /Page /Parent", -1).length - 1;
        assertTrue(paginas > 1);
    }

    @Test
    void pdfSinDatosSeGeneraIgual() throws Exception {
        byte[] pdf = GeneradorPdf.crear("Vacío", null, List.of(), List.of("A"), List.of(), null, "pie");
        assertTrue(new String(pdf, StandardCharsets.ISO_8859_1).startsWith("%PDF"));
    }

    @Test
    void excelEsUnZipValido() throws Exception {
        byte[] xlsx = GeneradorXlsx.crear(List.of(new GeneradorXlsx.Hoja("Resumen", List.of("Indicador", "Valor"),
                List.of(List.of("Usuarios", 3)), new double[] { 20, 10 })));
        // Un .xlsx es un ZIP: empieza con "PK".
        assertEquals('P', xlsx[0]);
        assertEquals('K', xlsx[1]);
    }
}
