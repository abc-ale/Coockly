package com.cookly.actividades;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.R;
import com.cookly.modelos.RecomendacionReceta;
import com.cookly.modelos.SolicitudMenuExpress;
import com.cookly.servicios.ClienteApi;
import com.cookly.utilidades.ValidadorEntrada;
import java.util.*;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ActividadMenuExpress extends AppCompatActivity {
    private LinearLayout resultados;
    private ProgressBar progreso;

    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        setContentView(R.layout.actividad_menu_express);
        EditText ingredientes = findViewById(R.id.ingredientesExpress);
        resultados = findViewById(R.id.resultadosExpress);
        progreso = findViewById(R.id.progresoExpress);
        findViewById(R.id.botonVolverExpress).setOnClickListener(v -> finish());
        findViewById(R.id.botonGenerarMenu).setOnClickListener(v -> generar(ingredientes.getText().toString()));
    }

    private void generar(String texto) {
        List<String> lista = ValidadorEntrada.separarIngredientes(texto);
        if (lista.isEmpty()) {
            Toast.makeText(this, "Escribe al menos un ingrediente por línea.", Toast.LENGTH_SHORT).show();
            return;
        }
        progreso.setVisibility(View.VISIBLE);
        resultados.removeAllViews();
        ClienteApi.crear(this).menuExpress(new SolicitudMenuExpress(lista))
                .enqueue(new Callback<Map<String, List<RecomendacionReceta>>>() {
                    @Override public void onResponse(Call<Map<String, List<RecomendacionReceta>>> call, Response<Map<String, List<RecomendacionReceta>>> response) {
                        progreso.setVisibility(View.GONE);
                        List<RecomendacionReceta> recetas = response.body() == null ? null : response.body().get("recetas");
                        if (recetas == null || recetas.isEmpty()) {
                            mostrarVacio("No encontré una coincidencia todavía. Prueba con ingredientes más generales.");
                            return;
                        }
                        for (RecomendacionReceta receta : recetas) tarjeta(receta);
                    }
                    @Override public void onFailure(Call<Map<String, List<RecomendacionReceta>>> call, Throwable t) {
                        progreso.setVisibility(View.GONE);
                        mostrarVacio("No se pudo consultar el menú. Revisa la URL de tu API.");
                    }
                });
    }

    private void tarjeta(RecomendacionReceta receta) {
        TextView vista = new TextView(this);
        String faltantes = receta.ingredientesFaltantes == null || receta.ingredientesFaltantes.isEmpty()
                ? "Tienes todo lo necesario" : "Te faltan: " + String.join(", ", receta.ingredientesFaltantes);
        vista.setText("🍽  " + receta.nombre + "\n" + receta.porcentajeCoincidencia + "% de coincidencia  ·  "
                + (receta.minutosPreparacion == null ? "Tiempo flexible" : receta.minutosPreparacion + " min")
                + "\n" + faltantes);
        vista.setTextColor(Color.rgb(36, 27, 24));
        vista.setTextSize(16);
        vista.setPadding(18, 18, 18, 18);
        vista.setBackgroundResource(R.drawable.fondo_tarjeta);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.setMargins(0, 0, 0, 12);
        resultados.addView(vista, params);
    }

    private void mostrarVacio(String mensaje) {
        TextView vista = new TextView(this);
        vista.setText(mensaje);
        vista.setTextSize(15);
        vista.setTextColor(Color.DKGRAY);
        vista.setPadding(8, 18, 8, 18);
        resultados.addView(vista);
    }
}