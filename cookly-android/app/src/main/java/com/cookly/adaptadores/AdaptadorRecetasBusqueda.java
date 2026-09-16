package com.cookly.adaptadores;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.cookly.R;
import com.cookly.modelos.RecetaDetalle;
import java.util.ArrayList;
import java.util.List;

/** Presenta los resultados de búsqueda de recetas (GET recetas/buscar). */
public class AdaptadorRecetasBusqueda extends RecyclerView.Adapter<AdaptadorRecetasBusqueda.ContenedorReceta> {
    private final List<RecetaDetalle> recetas = new ArrayList<>();
    private final AlSeleccionarReceta alSeleccionar;

    public interface AlSeleccionarReceta { void seleccionar(RecetaDetalle receta); }
    public AdaptadorRecetasBusqueda(AlSeleccionarReceta alSeleccionar) { this.alSeleccionar = alSeleccionar; }

    public void actualizar(List<RecetaDetalle> nuevasRecetas) {
        recetas.clear();
        if (nuevasRecetas != null) recetas.addAll(nuevasRecetas);
        notifyDataSetChanged();
    }

    public void agregar(List<RecetaDetalle> masRecetas) {
        if (masRecetas == null || masRecetas.isEmpty()) return;
        int inicio = recetas.size();
        recetas.addAll(masRecetas);
        notifyItemRangeInserted(inicio, masRecetas.size());
    }

    public void limpiar() {
        recetas.clear();
        notifyDataSetChanged();
    }

    @NonNull @Override public ContenedorReceta onCreateViewHolder(@NonNull ViewGroup padre, int tipo) {
        return new ContenedorReceta(LayoutInflater.from(padre.getContext()).inflate(R.layout.elemento_receta_busqueda, padre, false));
    }

    @Override public void onBindViewHolder(@NonNull ContenedorReceta contenedor, int posicion) {
        RecetaDetalle receta = recetas.get(posicion);
        contenedor.nombre.setText(receta.nombre);
        String minutos = receta.minutosPreparacion == null ? "Tiempo flexible" : receta.minutosPreparacion + " min";
        contenedor.detalle.setText(minutos);
        contenedor.itemView.setOnClickListener(v -> alSeleccionar.seleccionar(receta));
    }

    @Override public int getItemCount() { return recetas.size(); }

    static class ContenedorReceta extends RecyclerView.ViewHolder {
        TextView nombre, detalle;
        ContenedorReceta(View vista) {
            super(vista);
            nombre = vista.findViewById(R.id.nombreRecetaBusqueda);
            detalle = vista.findViewById(R.id.detalleRecetaBusqueda);
        }
    }
}