package com.cookly.servicios;

import android.content.Context;
import java.io.File;
import okhttp3.MediaType;
import okhttp3.RequestBody;

/**
 * Flujo de subida firmado: pide firma al backend y sube directo a Cloudinary.
 * Ejecutar la llamada en un executor/coroutine y no en el hilo principal.
 */
public final class CargaImagenCloudinary {
    private CargaImagenCloudinary() { }

    public static void firmarYSubir(Context contexto, File imagen, Resultado resultado) {
        ClienteApi.crear(contexto).firmaCloudinary().enqueue(new retrofit2.Callback<com.cookly.modelos.RespuestaFirmaCloudinary>() {
            @Override public void onResponse(retrofit2.Call<com.cookly.modelos.RespuestaFirmaCloudinary> llamada,
                                             retrofit2.Response<com.cookly.modelos.RespuestaFirmaCloudinary> respuesta) {
                if (!respuesta.isSuccessful() || respuesta.body() == null) {
                    resultado.error("No se pudo obtener la firma de Cloudinary");
                    return;
                }
                com.cookly.modelos.RespuestaFirmaCloudinary firma = respuesta.body();
                String url = "https://api.cloudinary.com/v1_1/" + firma.cloudName + "/image/upload";
                ServicioApi api = ClienteApi.crear(contexto);
                api.subirCloudinary(url,
                                RequestBody.create(MediaType.parse("image/*"), imagen),
                                RequestBody.create(MediaType.parse("text/plain"), firma.apiKey),
                                RequestBody.create(MediaType.parse("text/plain"), String.valueOf(firma.timestamp)),
                                RequestBody.create(MediaType.parse("text/plain"), firma.carpeta),
                                RequestBody.create(MediaType.parse("text/plain"), firma.firma))
                        .enqueue(new retrofit2.Callback<com.cookly.modelos.RespuestaCargaCloudinary>() {
                            @Override public void onResponse(retrofit2.Call<com.cookly.modelos.RespuestaCargaCloudinary> c,
                                                             retrofit2.Response<com.cookly.modelos.RespuestaCargaCloudinary> r) {
                                if (r.isSuccessful() && r.body() != null) resultado.completo(r.body().secure_url, r.body().public_id);
                                else resultado.error("Cloudinary rechazó la imagen");
                            }
                            @Override public void onFailure(retrofit2.Call<com.cookly.modelos.RespuestaCargaCloudinary> c, Throwable t) {
                                resultado.error("No se pudo subir la imagen");
                            }
                        });
            }
            @Override public void onFailure(retrofit2.Call<com.cookly.modelos.RespuestaFirmaCloudinary> llamada, Throwable t) {
                resultado.error("No se pudo conectar con el backend");
            }
        });
    }

    public interface Resultado { void completo(String url, String publicId); void error(String mensaje); }
}