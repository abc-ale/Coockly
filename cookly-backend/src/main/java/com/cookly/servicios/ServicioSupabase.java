package com.cookly.servicios;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
public class ServicioSupabase {
    @Value("${supabase.url}") private String supabaseUrl;
    @Value("${supabase.anon-key}") private String anonKey;

    private final HttpClient cliente = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    public record DatosUsuarioSupabase(String correo, String nombre) {}

    /** Verifica el access_token de Supabase y devuelve el correo asociado. */
    public String obtenerCorreoDesdeToken(String accessToken) {
        return obtenerDatos(accessToken).correo();
    }

    /** Igual que arriba, pero también trae el nombre (para crear cuenta en login social). */
    public DatosUsuarioSupabase obtenerCorreoYNombre(String accessToken) {
        return obtenerDatos(accessToken);
    }

    private DatosUsuarioSupabase obtenerDatos(String accessToken) {
        try {
            HttpRequest peticion = HttpRequest.newBuilder()
                    .uri(URI.create(supabaseUrl + "/auth/v1/user"))
                    .header("apikey", anonKey)
                    .header("Authorization", "Bearer " + accessToken)
                    .GET()
                    .build();

            HttpResponse<String> respuesta = cliente.send(peticion, HttpResponse.BodyHandlers.ofString());
            if (respuesta.statusCode() != 200) {
                throw new IllegalArgumentException("Sesión de Supabase inválida o expirada");
            }

            var nodo = mapper.readTree(respuesta.body());
            String correo = nodo.get("email").asText();
            String nombre = null;
            var metadata = nodo.get("user_metadata");
            if (metadata != null) {
                if (metadata.has("full_name")) nombre = metadata.get("full_name").asText();
                else if (metadata.has("nombre_completo")) nombre = metadata.get("nombre_completo").asText();
                else if (metadata.has("name")) nombre = metadata.get("name").asText();
            }
            return new DatosUsuarioSupabase(correo, nombre);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("No se pudo validar la sesión de Supabase");
        }
    }
}
