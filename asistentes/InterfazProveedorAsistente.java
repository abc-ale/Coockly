package com.cookly.asistentes;

/** Punto de extensión para conectar un proveedor de IA manualmente sin acoplar la UI. */
public interface InterfazProveedorAsistente {
    void responder(String mensaje, Resultado resultado);
    interface Resultado { void completar(String respuesta); void error(String mensaje); }
}