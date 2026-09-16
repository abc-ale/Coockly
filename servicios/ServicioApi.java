package com.cookly.servicios;
import com.cookly.modelos.*;
import java.util.*;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.http.*;

public interface ServicioApi {
    // ----- Autenticación (ya existían) -----
    @POST("autenticacion/login") Call<RespuestaAcceso> acceder(@Body SolicitudAcceso solicitud);
    @POST("autenticacion/registro") Call<RespuestaAcceso> registrar(@Body SolicitudRegistro solicitud);
    @POST("autenticacion/solicitar-recuperacion") Call<Map<String,String>> solicitarRecuperacion(@Body SolicitudRecuperacion solicitud);
    @POST("autenticacion/cambiar-contrasena") Call<Map<String,String>> cambiarContrasena(@Body SolicitudCambioContrasena solicitud);

    // ----- Perfil (nuevo) -----
    @PUT("perfil/contrasena") Call<Map<String,String>> cambiarMiContrasena(@Body SolicitudCambioContrasenaPropia solicitud);
    @GET("perfil/restricciones") Call<List<UsuarioRestriccion>> misRestricciones();
    @PUT("perfil/restricciones") Call<Void> actualizarMisRestricciones(@Body SolicitudIds solicitud);
    @GET("perfil/alergias") Call<List<UsuarioAlergia>> misAlergias();
    @PUT("perfil/alergias") Call<Void> actualizarMisAlergias(@Body SolicitudIds solicitud);

    // ----- Administración (nuevo, requiere rol ADMINISTRADOR) -----
    @PUT("administracion/usuarios/{id}/rol") Call<Map<String,String>> cambiarRolUsuario(@Path("id") long id, @Body SolicitudCambioRol solicitud);
    @PUT("administracion/usuarios/{id}/activo") Call<Map<String,String>> cambiarActivoUsuario(@Path("id") long id, @Query("valor") boolean valor);

    // ----- Recetas (ya existían) -----
    @POST("recetas/menu-express") Call<Map<String,List<RecomendacionReceta>>> menuExpress(@Body SolicitudMenuExpress solicitud);
    @GET("recetas/{id}") Call<RecetaDetalle> detalleReceta(@Path("id") long id);
    @GET("recetas/buscar") Call<RespuestaPaginaRecetas> buscarRecetas(@Query("texto") String texto, @Query("pagina") int pagina, @Query("tamano") int tamano);
    @GET("recetas/favoritos") Call<List<RecetaDetalle>> favoritos();
    @POST("recetas/{id}/favorito") Call<Void> marcarFavorito(@Path("id") long id);
    @DELETE("recetas/{id}/favorito") Call<Void> quitarFavorito(@Path("id") long id);

    // ----- Comentarios (nuevo) -----
    @GET("recetas/{recetaId}/comentarios") Call<List<Comentario>> listarComentarios(@Path("recetaId") long recetaId);
    @POST("recetas/{recetaId}/comentarios") Call<Comentario> crearComentario(@Path("recetaId") long recetaId, @Body SolicitudComentario solicitud);
    @DELETE("recetas/{recetaId}/comentarios/{comentarioId}") Call<Void> eliminarComentario(@Path("recetaId") long recetaId, @Path("comentarioId") long comentarioId);

    // ----- Reseñas (nuevo) -----
    @GET("recetas/{recetaId}/resenas") Call<RespuestaResenas> listarResenas(@Path("recetaId") long recetaId);
    @PUT("recetas/{recetaId}/resenas") Call<Resena> guardarResena(@Path("recetaId") long recetaId, @Body SolicitudResena solicitud);

    // ----- Reportes y moderación (nuevo) -----
    @POST("reportes") Call<Reporte> crearReporte(@Body SolicitudReporte solicitud);
    @GET("moderacion/reportes/pendientes") Call<List<Reporte>> reportesPendientes();
    @PUT("moderacion/reportes/{id}") Call<Reporte> resolverReporte(@Path("id") long id, @Body SolicitudRevisionReporte solicitud, @Query("eliminarReceta") boolean eliminarReceta);
    @DELETE("moderacion/comentarios/{id}") Call<Void> eliminarComentarioModeracion(@Path("id") long id);

    // ----- Imágenes (nuevo: guardar/listar/eliminar registro; la firma y subida ya existían) -----
    @GET("imagenes/firma") Call<RespuestaFirmaCloudinary> firmaCloudinary();
    @Multipart @POST Call<RespuestaCargaCloudinary> subirCloudinary(@Url String url,
                                                                    @Part("file") RequestBody archivo, @Part("api_key") RequestBody apiKey,
                                                                    @Part("timestamp") RequestBody timestamp, @Part("folder") RequestBody carpeta,
                                                                    @Part("signature") RequestBody firma);
    @POST("imagenes") Call<Imagen> guardarImagen(@Body SolicitudImagen solicitud);
    @GET("imagenes/receta/{recetaId}") Call<List<Imagen>> listarImagenes(@Path("recetaId") long recetaId);
    @DELETE("imagenes/{id}") Call<Void> eliminarImagen(@Path("id") long id);

    // ----- Menú semanal (nuevo) -----
    @POST("menus") Call<MenuSemanal> obtenerOCrearMenu(@Body SolicitudMenuSemanal solicitud);
    @POST("menus/{menuId}/elementos") Call<ElementoMenuSemanal> agregarRecetaAlMenu(@Path("menuId") long menuId, @Body SolicitudElementoMenu solicitud);
    @DELETE("menus/elementos/{elementoId}") Call<Void> quitarRecetaDelMenu(@Path("elementoId") long elementoId);

    // ----- Lista de compra (nuevo) -----
    @GET("listas-compra") Call<List<ListaCompra>> misListasCompra();
    @POST("listas-compra") Call<ListaCompra> crearListaCompra(@Body SolicitudListaCompra solicitud);
    @POST("listas-compra/generar-desde-menu/{menuId}") Call<ListaCompra> generarListaDesdeMenu(@Path("menuId") long menuId, @Query("nombre") String nombre);
    @POST("listas-compra/{listaId}/elementos") Call<ElementoListaCompra> agregarItemLista(@Path("listaId") long listaId, @Body SolicitudElementoListaCompra solicitud);
    @PUT("listas-compra/elementos/{itemId}/comprado") Call<Void> marcarItemComprado(@Path("itemId") long itemId, @Query("valor") boolean valor);
    @DELETE("listas-compra/{listaId}") Call<Void> eliminarListaCompra(@Path("listaId") long listaId);

    // ----- Historial (nuevo) -----
    @GET("historial") Call<List<HistorialReceta>> historial();
    @POST("historial/{recetaId}") Call<Void> registrarVista(@Path("recetaId") long recetaId);

    // ----- Catálogos (nuevo: etiquetas, restricciones, alergias) -----
    @GET("catalogos") Call<RespuestaCatalogos> catalogos();
}
