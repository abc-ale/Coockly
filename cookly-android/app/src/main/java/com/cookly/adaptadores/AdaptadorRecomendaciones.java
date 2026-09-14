package com.cookly.adaptadores;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.cookly.R;
import com.cookly.modelos.RecomendacionReceta;
import java.util.ArrayList;
import java.util.List;

/** Presenta las recetas sugeridas por Menú Express. */
public class AdaptadorRecomendaciones extends RecyclerView.Adapter<AdaptadorRecomendaciones.ContenedorReceta> {
    private final List<RecomendacionReceta> recetas = new ArrayList<>();
    private final AlSeleccionarReceta alSeleccionar;

    public interface AlSeleccionarReceta { void seleccionar(RecomendacionReceta receta); }
    public AdaptadorRecomendaciones(AlSeleccionarReceta alSeleccionar) { this.alSeleccionar = alSeleccionar; }

    public void actualizar(List<RecomendacionReceta> nuevasRecetas) {
        recetas.clear();
        if (nuevasRecetas != null) recetas.addAll(nuevasRecetas);
        notifyDataSetChanged();
    }
    @NonNull @Override public ContenedorReceta onCreateViewHolder(@NonNull ViewGroup padre, int tipo) {
        return new ContenedorReceta(LayoutInflater.from(padre.getContext()).inflate(R.layout.elemento_recomendacion, padre, false));
    }
    @Override public void onBindViewHolder(@NonNull ContenedorReceta contenedor, int posicion) {
        RecomendacionReceta receta = recetas.get(posicion);
        contenedor.nombre.setText(receta.nombre);
        String tiempo = receta.minutosPreparacion == null ? "" : " · " + receta.minutosPreparacion + " min";
        contenedor.coincidencia.setText(receta.porcentajeCoincidencia + "% de coincidencia" + tiempo);
        String faltantes = receta.ingredientesFaltantes == null || receta.ingredientesFaltantes.isEmpty() ? "Tienes todos los ingredientes" : "Faltan: " + android.text.TextUtils.join(", ", receta.ingredientesFaltantes);
        contenedor.detalle.setText(faltantes);
        contenedor.itemView.setOnClickListener(v -> alSeleccionar.seleccionar(receta));
    }
    @Override public int getItemCount() { return recetas.size(); }
    static class ContenedorReceta extends RecyclerView.ViewHolder {
        TextView nombre, coincidencia, detalle;
        ContenedorReceta(View vista) { super(vista); nombre=vista.findViewById(R.id.nombreReceta); coincidencia=vista.findViewById(R.id.coincidencia); detalle=vista.findViewById(R.id.detalleFaltantes); }
    }
}
