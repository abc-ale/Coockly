package com.cookly.servicios; import com.cookly.modelos.*; import java.util.*; import okhttp3.RequestBody; import retrofit2.Call; import retrofit2.http.*;
 public interface ServicioApi {
     @POST("autenticacion/login") Call<RespuestaAcceso> acceder(@Body SolicitudAcceso solicitud);
     @POST("autenticacion/registro") Call<RespuestaAcceso> registrar(@Body SolicitudRegistro solicitud);
     @POST("autenticacion/solicitar-recuperacion") Call<Map<String,String>> solicitarRecuperacion(@Body SolicitudRecuperacion solicitud);
     @POST("autenticacion/cambiar-contrasena") Call<Map<String,String>> cambiarContrasena(@Body SolicitudCambioContrasena solicitud);
     @POST("recetas/menu-express") Call<Map<String,List<RecomendacionReceta>>> menuExpress(@Body SolicitudMenuExpress solicitud);
     @GET("recetas/{id}") Call<RecetaDetalle> detalleReceta(@Path("id") long id);
     @GET("recetas/favoritos") Call<List<RecetaDetalle>> favoritos();
     @POST("recetas/{id}/favorito") Call<Void> marcarFavorito(@Path("id") long id);
     @DELETE("recetas/{id}/favorito") Call<Void> quitarFavorito(@Path("id") long id);
     @GET("imagenes/firma") Call<RespuestaFirmaCloudinary> firmaCloudinary();
      @Multipart @POST Call<RespuestaCargaCloudinary> subirCloudinary(@Url String url,
              @Part("file") RequestBody archivo, @Part("api_key") RequestBody apiKey,
              @Part("timestamp") RequestBody timestamp, @Part("folder") RequestBody carpeta,
              @Part("signature") RequestBody firma);
 }
