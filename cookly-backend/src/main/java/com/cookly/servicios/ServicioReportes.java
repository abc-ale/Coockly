package com.cookly.servicios;

import com.cookly.dto.UsuarioResumen;
import com.cookly.utilidades.GeneradorPdf;
import com.cookly.utilidades.GeneradorXlsx;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Reportes descargables del panel: lista de usuarios con su tiempo de uso, en Excel y en PDF. */
@Service
public class ServicioReportes {

    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final ServicioEstadisticas estadisticas;
    private final String zona;

    public ServicioReportes(ServicioEstadisticas estadisticas, @Value("${app.zona-horaria:America/Lima}") String zona) {
        this.estadisticas = estadisticas;
        this.zona = zona;
    }

    public byte[] usuariosXlsx() throws IOException {
        List<UsuarioResumen> usuarios = estadisticas.listarUsuarios();
        Map<String, Object> r = estadisticas.resumen();

        List<List<Object>> indicadores = new ArrayList<>();
        indicadores.add(List.of("Generado", ahora()));
        indicadores.add(List.of("Usuarios registrados", numero(r, "usuariosTotal")));
        indicadores.add(List.of("Usuarios activos", numero(r, "usuariosActivos")));
        indicadores.add(List.of("Usuarios inactivos", numero(r, "usuariosInactivos")));
        indicadores.add(List.of("Administradores", numero(r, "administradores")));
        indicadores.add(List.of("Usuarios nuevos (últimos 30 días)", numero(r, "usuariosNuevos30d")));
        indicadores.add(List.of("Recetas", numero(r, "recetasTotal")));
        indicadores.add(List.of("Sesiones de uso registradas", numero(r, "sesionesTotal")));
        indicadores.add(List.of("Tiempo total de uso (horas)", Math.round(numero(r, "minutosUsoTotal") / 60.0 * 10) / 10.0));
        indicadores.add(List.of("Tiempo promedio por sesión (minutos)", numero(r, "minutosPorSesion")));

        List<List<Object>> filas = new ArrayList<>();
        for (UsuarioResumen u : usuarios) {
            double minutos = Math.round(u.segundosUso() / 60.0 * 10) / 10.0;
            double promedio = u.sesiones() == 0 ? 0 : Math.round(u.segundosUso() / 60.0 / u.sesiones() * 10) / 10.0;
            List<Object> fila = new ArrayList<>();
            fila.add(u.nombre());
            fila.add(u.correo());
            fila.add(u.rol().equals("ADMINISTRADOR") ? "Administrador" : "Usuario");
            fila.add(u.activo() ? "Activo" : "Inactivo");
            fila.add(u.creadoEn());
            fila.add(u.ultimoAcceso() == null ? "Sin uso registrado" : u.ultimoAcceso());
            fila.add(u.sesiones());
            fila.add(minutos);
            fila.add(promedio);
            fila.add(u.recetas());
            fila.add(u.favoritos());
            filas.add(fila);
        }

        return GeneradorXlsx.crear(List.of(
                new GeneradorXlsx.Hoja("Resumen", List.of("Indicador", "Valor"), indicadores, new double[] { 38, 22 }),
                new GeneradorXlsx.Hoja("Usuarios",
                        List.of("Nombre", "Correo", "Rol", "Estado", "Registro", "Último acceso", "Sesiones",
                                "Tiempo total (min)", "Promedio por sesión (min)", "Recetas", "Favoritos"),
                        filas, new double[] { 26, 32, 14, 11, 18, 20, 10, 18, 24, 10, 11 })));
    }

    public byte[] usuariosPdf() throws IOException {
        List<UsuarioResumen> usuarios = estadisticas.listarUsuarios();
        Map<String, Object> r = estadisticas.resumen();

        List<String> resumen = List.of(
                "Usuarios registrados: " + (long) numero(r, "usuariosTotal")
                        + "   |   Activos: " + (long) numero(r, "usuariosActivos")
                        + "   |   Nuevos en 30 días: " + (long) numero(r, "usuariosNuevos30d"),
                "Tiempo total de uso: " + duracion((long) (numero(r, "minutosUsoTotal") * 60))
                        + "   |   Promedio por sesión: " + duracion((long) (numero(r, "minutosPorSesion") * 60)));

        List<List<String>> filas = new ArrayList<>();
        for (UsuarioResumen u : usuarios) {
            filas.add(List.of(
                    u.nombre(),
                    u.correo(),
                    u.rol().equals("ADMINISTRADOR") ? "Administrador" : "Usuario",
                    u.activo() ? "Activo" : "Inactivo",
                    u.creadoEn() == null ? "" : u.creadoEn().substring(0, Math.min(10, u.creadoEn().length())),
                    u.ultimoAcceso() == null ? "-" : u.ultimoAcceso(),
                    String.valueOf(u.sesiones()),
                    duracion(u.segundosUso()),
                    String.valueOf(u.recetas())));
        }

        return GeneradorPdf.crear(
                "Reporte de usuarios",
                "Cookly  -  generado el " + ahora() + " (hora " + zona + ")",
                resumen,
                List.of("Nombre", "Correo", "Rol", "Estado", "Registro", "Último acceso", "Sesiones", "Tiempo de uso", "Recetas"),
                filas,
                new double[] { 17, 24, 9, 8, 9, 13, 7, 10, 6 },
                "Cookly - Reporte de usuarios");
    }

    public String nombreArchivo(String base, String extension) {
        return base + "-" + ZonedDateTime.now(ZoneId.of(zona)).format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm")) + "." + extension;
    }

    private String ahora() {
        return ZonedDateTime.now(ZoneId.of(zona)).format(FORMATO_FECHA);
    }

    private static double numero(Map<String, Object> m, String clave) {
        Object v = m.get(clave);
        return v instanceof Number n ? n.doubleValue() : 0;
    }

    /** 0 -> "0 min", 300 -> "5 min", 7500 -> "2 h 05 min". */
    static String duracion(long segundos) {
        long minutos = Math.round(segundos / 60.0);
        if (minutos < 60) {
            return minutos + " min";
        }
        return (minutos / 60) + " h " + String.format("%02d", minutos % 60) + " min";
    }
}
