package com.cookly.excepciones;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.NestedExceptionUtils;
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
        log.error("Error no controlado: {}", e.getMessage(), e);

        // TEMPORAL PARA DIAGNOSTICO: muestra la causa real en el aviso rojo del panel.
        // Cuando todo funcione, borra estas 3 lineas y deja el mensaje generico de abajo.
        Throwable causa = NestedExceptionUtils.getMostSpecificCause(e);
        String detalle = causa.getClass().getSimpleName() + ": " + String.valueOf(causa.getMessage());
        if (detalle.length() > 300) detalle = detalle.substring(0, 300);

        return ResponseEntity.status(500).body(Map.of("mensaje", "Ocurrió un error al procesar la solicitud. [" + detalle + "]"));
        // return ResponseEntity.status(500).body(Map.of("mensaje", "Ocurrió un error al procesar la solicitud."));
    }
}