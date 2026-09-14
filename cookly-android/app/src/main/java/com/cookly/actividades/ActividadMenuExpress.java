package com.cookly.actividades;

import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.cookly.R;
import com.cookly.adaptadores.AdaptadorRecomendaciones;
import com.cookly.modelos.RecomendacionReceta;
import com.cookly.vistasmodelos.VistaModeloMenuExpress;
import com.google.android.material.button.MaterialButton;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/** Pantalla completa de búsqueda: reemplaza el antiguo diálogo que solo mostraba un Toast. */
public class ActividadMenuExpress extends AppCompatActivity {
    private EditText campoIngredientes;
    private MaterialButton botonBuscar;
    private ProgressBar progreso;
    private TextView estado;
    private AdaptadorRecomendaciones adaptador;

    @Override
    protected void onCreate(Bundle estadoGuardado) {
        super.onCreate(estadoGuardado);
        setContentView(R.layout.actividad_menu_express);

        campoIngredientes = findViewById(R.id.campoIngredientes);
        botonBuscar = findViewById(R.id.botonBuscarIngredientes);
        progreso = findViewById(R.id.progresoMenu);
        estado = findViewById(R.id.estadoMenu);

        RecyclerView lista = findViewById(R.id.listaRecomendaciones);
        lista.setLayoutManager(new LinearLayoutManager(this));
        adaptador = new AdaptadorRecomendaciones(this::mostrarReceta);
        lista.setAdapter(adaptador);

        VistaModeloMenuExpress modelo = new ViewModelProvider(this).get(VistaModeloMenuExpress.class);
        modelo.obtenerRecomendaciones().observe(this, recetas -> {
            progreso.setVisibility(View.GONE);
            botonBuscar.setEnabled(true);
            adaptador.actualizar(recetas);
            if (recetas == null || recetas.isEmpty()) {
                mostrarEstado("No encontré coincidencias todavía. Prueba con huevo, arroz, tomate o pollo.");
            } else {
                estado.setVisibility(View.GONE);
            }
        });
        modelo.obtenerError().observe(this, mensaje -> {
            if (mensaje != null && !mensaje.isBlank()) {
                progreso.setVisibility(View.GONE);
                botonBuscar.setEnabled(true);
                mostrarEstado(mensaje);
            }
        });

        botonBuscar.setOnClickListener(v -> {
            List<String> ingredientes = Arrays.stream(campoIngredientes.getText().toString().split(","))
                    .map(String::trim)
                    .filter(ingrediente -> !ingrediente.isBlank())
                    .map(ingrediente -> ingrediente.toLowerCase(Locale.ROOT))
                    .distinct()
                    .collect(Collectors.toCollection(ArrayList::new));
            if (ingredientes.isEmpty()) {
                campoIngredientes.setError("Escribe al menos un ingrediente");
                return;
            }
            campoIngredientes.setError(null);
            progreso.setVisibility(View.VISIBLE);
            estado.setVisibility(View.GONE);
            botonBuscar.setEnabled(false);
            modelo.buscar(ingredientes);
        });
    }

    private void mostrarEstado(String mensaje) {
        estado.setText(mensaje);
        estado.setVisibility(View.VISIBLE);
    }

    private void mostrarReceta(RecomendacionReceta receta) {
        String faltantes = receta.ingredientesFaltantes == null || receta.ingredientesFaltantes.isEmpty()
                ? "Tienes todo lo necesario."
                : "Te faltan: " + TextUtils.join(", ", receta.ingredientesFaltantes);
        String tiempo = receta.minutosPreparacion == null ? "" : "\nTiempo estimado: " + receta.minutosPreparacion + " min";
        new AlertDialog.Builder(this)
                .setTitle("🍳 " + receta.nombre)
                .setMessage("Coincidencia: " + receta.porcentajeCoincidencia + "%\n\n" + faltantes + tiempo)
                .setPositiveButton("Entendido", null)
                .show();
    }

    public void volverInicio(View vista) {
        finish();
    }
}