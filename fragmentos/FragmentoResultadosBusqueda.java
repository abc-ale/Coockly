package com.cookly.fragmentos;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.cookly.R;
import com.cookly.adaptadores.AdaptadorRecetasBusqueda;
import com.cookly.modelos.RecetaDetalle;
import com.cookly.modelos.RespuestaPaginaRecetas;
import com.cookly.servicios.ClienteApi;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Muestra los resultados de GET recetas/buscar. No conoce la barra de búsqueda:
 * la Activity que lo hospeda le llama buscar(texto) cada vez que el usuario escribe.
 */
public class FragmentoResultadosBusqueda extends Fragment {
    private RecyclerView lista;
    private ProgressBar progreso;
    private TextView vacio;
    private AdaptadorRecetasBusqueda adaptador;
    private AlAbrirReceta alAbrirReceta;
    private int paginaActual = 0;
    private boolean cargandoMas = false;
    private boolean esUltimaPagina = true;
    private String textoActual = "";

    public interface AlAbrirReceta { void abrir(RecetaDetalle receta); }
    public void setAlAbrirReceta(AlAbrirReceta listener) { this.alAbrirReceta = listener; }

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inflador, @Nullable ViewGroup contenedor, @Nullable Bundle estado) {
        return inflador.inflate(R.layout.fragmento_resultados_busqueda, contenedor, false);
    }

    @Override
    public void onViewCreated(@NonNull View vista, @Nullable Bundle estado) {
        super.onViewCreated(vista, estado);
        lista = vista.findViewById(R.id.listaResultadosBusqueda);
        progreso = vista.findViewById(R.id.progresoBusqueda);
        vacio = vista.findViewById(R.id.textoVacioBusqueda);

        adaptador = new AdaptadorRecetasBusqueda(receta -> {
            if (alAbrirReceta != null) alAbrirReceta.abrir(receta);
        });
        lista.setLayoutManager(new LinearLayoutManager(getContext()));
        lista.setAdapter(adaptador);

        // Scroll infinito: pide la siguiente página cuando el usuario llega casi al final.
        lista.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override public void onScrolled(@NonNull RecyclerView recyclerView, int dx, int dy) {
                if (dy <= 0 || cargandoMas || esUltimaPagina) return;
                LinearLayoutManager gestor = (LinearLayoutManager) recyclerView.getLayoutManager();
                if (gestor == null) return;
                int visibles = gestor.getChildCount();
                int totalItems = gestor.getItemCount();
                int primeraVisible = gestor.findFirstVisibleItemPosition();
                if ((visibles + primeraVisible) >= totalItems - 3) {
                    buscarPagina(textoActual, paginaActual + 1);
                }
            }
        });
    }

    /** Punto de entrada: llama esto desde la Activity cada vez que cambia el texto buscado. */
    public void buscar(String texto) {
        textoActual = texto;
        paginaActual = 0;
        esUltimaPagina = true;
        if (texto == null || texto.trim().length() < 2) {
            adaptador.limpiar();
            mostrarVacio(texto == null || texto.isEmpty() ? "Escribe al menos 2 letras para buscar." : null);
            return;
        }
        buscarPagina(texto, 0);
    }

    private void buscarPagina(String texto, int pagina) {
        cargandoMas = true;
        if (pagina == 0) {
            progreso.setVisibility(View.VISIBLE);
            vacio.setVisibility(View.GONE);
        }
        ClienteApi.crear(requireContext()).buscarRecetas(texto, pagina, 20)
                .enqueue(new Callback<RespuestaPaginaRecetas>() {
                    @Override public void onResponse(Call<RespuestaPaginaRecetas> call, Response<RespuestaPaginaRecetas> respuesta) {
                        cargandoMas = false;
                        progreso.setVisibility(View.GONE);
                        RespuestaPaginaRecetas cuerpo = respuesta.body();
                        if (cuerpo == null) { mostrarVacio("No se pudo buscar. Intenta de nuevo."); return; }
                        paginaActual = cuerpo.number;
                        esUltimaPagina = cuerpo.last;
                        if (pagina == 0) adaptador.actualizar(cuerpo.content); else adaptador.agregar(cuerpo.content);
                        mostrarVacio(cuerpo.empty && pagina == 0 ? "No encontramos recetas con ese nombre." : null);
                    }
                    @Override public void onFailure(Call<RespuestaPaginaRecetas> call, Throwable error) {
                        cargandoMas = false;
                        progreso.setVisibility(View.GONE);
                        mostrarVacio("No se pudo conectar. Revisa tu internet.");
                    }
                });
    }

    private void mostrarVacio(String mensaje) {
        vacio.setVisibility(mensaje == null ? View.GONE : View.VISIBLE);
        vacio.setText(mensaje);
    }
}
