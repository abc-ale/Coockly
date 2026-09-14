package com.cookly.vistasmodelos;

import android.app.Application;
import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import com.cookly.modelos.RecomendacionReceta;
import com.cookly.repositorios.RepositorioRecetas;
import java.util.List;

/** Conserva el estado de Menú Express ante cambios de configuración. */
public class VistaModeloMenuExpress extends AndroidViewModel {
    private final RepositorioRecetas repositorio;
    private final MutableLiveData<String> error = new MutableLiveData<>();
    private final MutableLiveData<List<RecomendacionReceta>> recomendaciones = new MutableLiveData<>();
    public VistaModeloMenuExpress(@NonNull Application aplicacion) { super(aplicacion); repositorio = new RepositorioRecetas(aplicacion); }
    public void buscar(List<String> ingredientes) { repositorio.buscarMenuExpress(ingredientes, error).observeForever(recomendaciones::postValue); }
    public LiveData<List<RecomendacionReceta>> obtenerRecomendaciones() { return recomendaciones; }
    public LiveData<String> obtenerError() { return error; }
}
