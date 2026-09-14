package com.cookly.repositorios;

import android.content.Context;
import androidx.lifecycle.MutableLiveData;
import com.cookly.modelos.RecomendacionReceta;
import com.cookly.modelos.SolicitudMenuExpress;
import com.cookly.servicios.ClienteApi;
import java.util.List;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/** Único punto de acceso de la vista a la API de recetas. */
public class RepositorioRecetas {
    private final Context contexto;
    public RepositorioRecetas(Context contexto) { this.contexto = contexto.getApplicationContext(); }
    public MutableLiveData<List<RecomendacionReceta>> buscarMenuExpress(List<String> ingredientes, MutableLiveData<String> error) {
        MutableLiveData<List<RecomendacionReceta>> datos = new MutableLiveData<>();
        ClienteApi.crear(contexto).menuExpress(new SolicitudMenuExpress(ingredientes)).enqueue(new Callback<Map<String, List<RecomendacionReceta>>>() {
            @Override public void onResponse(Call<Map<String, List<RecomendacionReceta>>> llamada, Response<Map<String, List<RecomendacionReceta>>> respuesta) {
                if (respuesta.isSuccessful() && respuesta.body() != null) datos.postValue(respuesta.body().get("recetas"));
                else error.postValue("No fue posible obtener las recomendaciones.");
            }
            @Override public void onFailure(Call<Map<String, List<RecomendacionReceta>>> llamada, Throwable causa) { error.postValue("Verifica tu conexión e inténtalo nuevamente."); }
        });
        return datos;
    }
}
