package com.cookly.servicios;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

@Service
public class ServicioCorreo {

    @Value("${brevo.api-key:}")
    private String apiKey;

    @Value("${brevo.remitente:}")
    private String remitente;

    @Value("${brevo.nombre-remitente:Cookly}")
    private String nombreRemitente;

    private final HttpClient cliente =
            HttpClient.newHttpClient();

    private final ObjectMapper mapper =
            new ObjectMapper();

    public void enviar(
            String destino,
            String asunto,
            String html
    ) throws Exception {

        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "BREVO_API_KEY no está configurada en Render."
            );
        }

        if (remitente == null || remitente.isBlank()) {
            throw new IllegalStateException(
                    "BREVO_SENDER_EMAIL no está configurada en Render."
            );
        }

        String cuerpo = mapper.writeValueAsString(
                Map.of(
                        "sender",
                        Map.of(
                                "name", nombreRemitente,
                                "email", remitente
                        ),
                        "to",
                        List.of(
                                Map.of("email", destino)
                        ),
                        "subject",
                        asunto,
                        "htmlContent",
                        html
                )
        );

        HttpRequest peticion = HttpRequest.newBuilder()
                .uri(
                        URI.create(
                                "https://api.brevo.com/v3/smtp/email"
                        )
                )
                .header("api-key", apiKey)
                .header(
                        "Content-Type",
                        "application/json"
                )
                .POST(
                        HttpRequest.BodyPublishers.ofString(cuerpo)
                )
                .build();

        HttpResponse<String> respuesta =
                cliente.send(
                        peticion,
                        HttpResponse.BodyHandlers.ofString()
                );

        if (respuesta.statusCode() >= 300) {
            throw new IllegalStateException(
                    "Brevo respondió "
                            + respuesta.statusCode()
                            + ": "
                            + respuesta.body()
            );
        }

        System.out.println(
                "Brevo aceptó el envío. Código HTTP: "
                        + respuesta.statusCode()
        );
    }
}