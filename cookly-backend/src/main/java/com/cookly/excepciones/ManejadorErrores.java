package com.cookly.excepciones;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Map;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class ManejadorErrores {

    private static final Logger log = LoggerFactory.getLogger(ManejadorErrores.class);

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<Map<String, String>> invalido(Exception e) {
        String mensaje = e instanceof IllegalArgumentException ? e.getMessage() : "Datos inválidos";
        return ResponseEntity.badRequest().body(Map.of("mensaje", mensaje));
    }

    // Errores del cliente en la forma de la petición: 400 y no 500.
    @ExceptionHandler({HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Map<String, String>> peticionMalFormada(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("mensaje", "Solicitud inválida"));
    }

    // Un recurso que no existe (receta, lista, etc.) responde 404 y no 500.
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> noEncontrado(NoSuchElementException e) {
        String mensaje = e.getMessage() == null ? "No encontrado" : e.getMessage();
        return ResponseEntity.status(404).body(Map.of("mensaje", mensaje));
    }

    // Una ruta que no existe responde 404 y no 500.
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, String>> rutaNoEncontrada(NoResourceFoundException e) {
        return ResponseEntity.status(404).body(Map.of("mensaje", "No encontrado"));
    }

    // Método HTTP no permitido en esa ruta: 405.
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, String>> metodoNoPermitido(HttpRequestMethodNotSupportedException e) {
        return ResponseEntity.status(405).body(Map.of("mensaje", "Método no permitido"));
    }

    // Tipo de contenido no soportado: 415.
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, String>> tipoNoSoportado(HttpMediaTypeNotSupportedException e) {
        return ResponseEntity.status(415).body(Map.of("mensaje", "Tipo de contenido no soportado"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> general(Exception e) {
        // El detalle real queda solo en el log del servidor; al cliente no se le muestra.
        log.error("Error no controlado: {}", e.getMessage(), e);
        return ResponseEntity.status(500).body(Map.of("mensaje", "Ocurrió un error al procesar la solicitud."));
    }
}