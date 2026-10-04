package com.cookly.excepciones;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class ManejadorErrores {

    private static final Logger log = LoggerFactory.getLogger(ManejadorErrores.class);

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<Map<String, String>> invalido(Exception e) {
        String mensaje = e instanceof IllegalArgumentException ? e.getMessage() : "Datos inválidos";
        return ResponseEntity.badRequest().body(Map.of("mensaje", mensaje));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> general(Exception e) {
        // El detalle real queda en los Logs de Render.
        log.error("Error no controlado: {}", e.getMessage(), e);
        return ResponseEntity.status(500).body(Map.of("mensaje", "Ocurrió un error al procesar la solicitud."));
    }
}