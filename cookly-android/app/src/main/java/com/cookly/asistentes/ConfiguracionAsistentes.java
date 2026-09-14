package com.cookly.asistentes;

/** Configuración sin secretos para conectar el chatbot real desde el backend. */
public final class ConfiguracionAsistentes {
    private ConfiguracionAsistentes() { }
    public static final String ENDPOINT_CHATBOT = "chatbot/responder";
    public static final String NOTA_IMPLEMENTACION =
            "Implementa el endpoint en Spring Boot y llama a ChatbotCocina desde ActividadAsistente.";
}