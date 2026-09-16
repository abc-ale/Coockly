package com.cookly.servicios;

import com.cookly.dto.RespuestaFirmaCloudinary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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

    /** Borra la imagen físicamente de Cloudinary llamando a su Admin API firmada. */
    public boolean destruir(String identificadorPublico) {
        try {
            long timestamp = Instant.now().getEpochSecond();
            String parametros = "public_id=" + identificadorPublico + "&timestamp=" + timestamp;
            String firma = firmar(parametros);
            String cuerpo = "public_id=" + identificadorPublico + "&timestamp=" + timestamp
                    + "&api_key=" + apiKey + "&signature=" + firma;
            HttpRequest peticion = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.cloudinary.com/v1_1/" + cloudName + "/image/destroy"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(cuerpo))
                    .build();
            HttpResponse<String> respuesta = HttpClient.newHttpClient().send(peticion, HttpResponse.BodyHandlers.ofString());
            return respuesta.statusCode() == 200 && respuesta.body().contains("\"result\":\"ok\"");
        } catch (Exception e) {
            return false;
        }
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