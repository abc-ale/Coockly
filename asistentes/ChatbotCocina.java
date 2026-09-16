package com.cookly.asistentes;

import android.os.Handler;
import android.os.Looper;

/**
 * Chatbot local de respaldo. Sustituye responderPorApi por la llamada a tu backend/LLM.
 * No incluye secretos ni claves dentro de la APK.
 */
public class ChatbotCocina implements InterfazProveedorAsistente {
    private final Handler principal = new Handler(Looper.getMainLooper());

    @Override public void responder(String mensaje, Resultado resultado) {
        String limpio = mensaje == null ? "" : mensaje.toLowerCase().trim();
        String respuesta;
        if (limpio.contains("sustit") || limpio.contains("reemplaz")) {
            respuesta = "Puedes decirme el ingrediente que te falta y te propongo sustitutos.";
        } else if (limpio.contains("tiempo") || limpio.contains("coc")) {
            respuesta = "Abre una receta y pulsa “Cocinar guiado” para activar un temporizador por paso.";
        } else if (limpio.contains("hola")) {
            respuesta = "¡Hola! Puedo ayudarte con ingredientes, sustituciones y tiempos de cocción.";
        } else {
            respuesta = "Puedo ayudarte con una receta, cantidades, sustituciones o tiempos. ¿Qué estás cocinando?";
        }
        principal.postDelayed(() -> resultado.completar(respuesta), 180);
    }
}