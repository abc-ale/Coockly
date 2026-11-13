package com.cookly.servicios;

import com.cookly.dto.RespuestaFirmaCloudinary;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/** Habla con Cloudinary desde el servidor; el secreto nunca llega a la app ni al navegador. */
@Service
public class ServicioCloudinary {
    public static final String CARPETA = "cookly/recetas";

    /** Resultado de subir una imagen: la dirección pública y el identificador para poder borrarla después. */
    public record ImagenSubida(String url, String identificadorPublico) { }

    @Value("${cloudinary.nombre}") private String cloudName;
    @Value("${cloudinary.clave-api}") private String apiKey;
    @Value("${cloudinary.secreto}") private String apiSecret;

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper json = new ObjectMapper();

    public RespuestaFirmaCloudinary firmarSubida(String carpeta) {
        long timestamp = Instant.now().getEpochSecond();
        String carpetaSegura = (carpeta == null || carpeta.isBlank()) ? CARPETA : carpeta;
        String parametros = "folder=" + carpetaSegura + "&timestamp=" + timestamp;
        return new RespuestaFirmaCloudinary(cloudName, apiKey, firmar(parametros), timestamp, carpetaSegura);
    }

    /** Sube una imagen a Cloudinary con subida firmada y devuelve su dirección segura (https). */
    public ImagenSubida subir(byte[] datos, String nombreArchivo, String tipo) {
        long timestamp = Instant.now().getEpochSecond();
        String firma = firmar("folder=" + CARPETA + "&timestamp=" + timestamp);
        String limite = "----cookly" + UUID.randomUUID().toString().replace("-", "");
        String extension = tipo != null && tipo.contains("png") ? ".png" : tipo != null && tipo.contains("webp") ? ".webp" : ".jpg";

        try {
            ByteArrayOutputStream cuerpo = new ByteArrayOutputStream();
            campo(cuerpo, limite, "api_key", apiKey);
            campo(cuerpo, limite, "timestamp", String.valueOf(timestamp));
            campo(cuerpo, limite, "signature", firma);
            campo(cuerpo, limite, "folder", CARPETA);
            cuerpo.write(("--" + limite + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"imagen" + extension
                    + "\"\r\nContent-Type: " + (tipo == null ? "application/octet-stream" : tipo) + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
            cuerpo.write(datos);
            cuerpo.write(("\r\n--" + limite + "--\r\n").getBytes(StandardCharsets.UTF_8));

            HttpRequest peticion = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload"))
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "multipart/form-data; boundary=" + limite)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(cuerpo.toByteArray()))
                    .build();
            HttpResponse<String> respuesta = http.send(peticion, HttpResponse.BodyHandlers.ofString());
            JsonNode raiz = json.readTree(respuesta.body());
            if (respuesta.statusCode() != 200) {
                String motivo = raiz.path("error").path("message").asText("error desconocido");
                throw new IllegalArgumentException("Cloudinary no aceptó la imagen: " + motivo);
            }
            return new ImagenSubida(raiz.path("secure_url").asText(), raiz.path("public_id").asText());
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("No se pudo subir la imagen a Cloudinary. Intenta de nuevo.");
        }
    }

    /** Borra la imagen físicamente de Cloudinary. Si falla devuelve false y no rompe lo que se esté haciendo. */
    public boolean destruir(String identificadorPublico) {
        try {
            long timestamp = Instant.now().getEpochSecond();
            String firma = firmar("public_id=" + identificadorPublico + "&timestamp=" + timestamp);
            String cuerpo = "public_id=" + URLEncoder.encode(identificadorPublico, StandardCharsets.UTF_8)
                    + "&timestamp=" + timestamp + "&api_key=" + apiKey + "&signature=" + firma;
            HttpRequest peticion = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.cloudinary.com/v1_1/" + cloudName + "/image/destroy"))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(cuerpo))
                    .build();
            HttpResponse<String> respuesta = http.send(peticion, HttpResponse.BodyHandlers.ofString());
            return respuesta.statusCode() == 200 && respuesta.body().contains("\"result\":\"ok\"");
        } catch (Exception e) {
            return false;
        }
    }

    private static void campo(ByteArrayOutputStream salida, String limite, String nombre, String valor) throws java.io.IOException {
        salida.write(("--" + limite + "\r\nContent-Disposition: form-data; name=\"" + nombre + "\"\r\n\r\n" + valor + "\r\n")
                .getBytes(StandardCharsets.UTF_8));
    }

    /** Cloudinary firma con SHA-1 de los parámetros (ordenados) seguidos del secreto; no es HMAC. */
    private String firmar(String valor) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-1");
            StringBuilder hex = new StringBuilder();
            for (byte b : sha.digest((valor + apiSecret).getBytes(StandardCharsets.UTF_8))) {
                hex.append(String.format("%02x", b & 0xff));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo firmar la subida", e);
        }
    }
}