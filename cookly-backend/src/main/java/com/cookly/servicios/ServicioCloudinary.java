package com.cookly.servicios;

import com.cookly.dto.RespuestaFirmaCloudinary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

/** Genera firmas cortas en backend; el secreto nunca llega a la aplicación Android. */
@Service
public class ServicioCloudinary {
    @Value("${cloudinary.nombre}") private String cloudName;
    @Value("${cloudinary.clave-api}") private String apiKey;
    @Value("${cloudinary.secreto}") private String apiSecret;

    public RespuestaFirmaCloudinary firmarSubida(String carpeta) {
        long timestamp = Instant.now().getEpochSecond();
        String carpetaSegura = (carpeta == null || carpeta.isBlank()) ? "cookly/recetas" : carpeta;
        String parametros = "folder=" + carpetaSegura + "&timestamp=" + timestamp;
        return new RespuestaFirmaCloudinary(cloudName, apiKey, firmar(parametros), timestamp, carpetaSegura);
    }

    private String firmar(String valor) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(apiSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA1"));
            StringBuilder hex = new StringBuilder();
            for (byte b : mac.doFinal(valor.getBytes(StandardCharsets.UTF_8))) {
                hex.append(String.format("%02x", b & 0xff));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo firmar la subida", e);
        }
    }
}