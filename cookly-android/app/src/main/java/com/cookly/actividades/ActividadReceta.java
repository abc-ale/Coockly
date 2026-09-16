package com.cookly.actividades;

import android.graphics.Color;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.view.Gravity;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.R;
import com.cookly.modelos.*;
import com.cookly.servicios.ClienteApi;
import com.cookly.utilidades.ConversorMedidas;
import com.google.android.material.card.MaterialCardView;
import java.util.*;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ActividadReceta extends AppCompatActivity {
    private LinearLayout contenido, ingredientesVista;
    private RecetaDetalle receta;
    private String emojiReceta = "🍽";
    private int porciones = 2;
    private TextView contador, pasoActual, tiempo;
    private CountDownTimer temporizador;
    private int indicePaso;

    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        long recetaId = getIntent().getLongExtra("recetaId", -1);
        if (recetaId != -1) {
            // Viene de una búsqueda real: trae la receta del backend antes de dibujar la pantalla.
            cargarDesdeBackend(recetaId);
        } else {
            // Modo de ejemplo (tarjetas de Inicio / Menú Express con datos locales).
            String emoji = getIntent().getStringExtra("emoji");
            if (emoji != null) emojiReceta = emoji;
            receta = crearReceta(getIntent().getStringExtra("receta"), getIntent().getStringExtra("titulo"));
            construirVista();
        }
    }

    private void cargarDesdeBackend(long id) {
        ClienteApi.crear(this).detalleReceta(id).enqueue(new retrofit2.Callback<RecetaDetalle>() {
            @Override public void onResponse(retrofit2.Call<RecetaDetalle> llamada, retrofit2.Response<RecetaDetalle> respuesta) {
                if (respuesta.body() == null) { avisarErrorYCerrar(); return; }
                receta = respuesta.body();
                construirVista();
            }
            @Override public void onFailure(retrofit2.Call<RecetaDetalle> llamada, Throwable error) { avisarErrorYCerrar(); }
        });
    }

    private void avisarErrorYCerrar() {
        Toast.makeText(this, "No se pudo cargar la receta. Revisa tu conexión.", Toast.LENGTH_SHORT).show();
        finish();
    }

    private void construirVista() {
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.rgb(255, 248, 243));
        contenido = new LinearLayout(this);
        contenido.setOrientation(LinearLayout.VERTICAL);
        contenido.setPadding(20, 22, 20, 30);
        scroll.addView(contenido);
        setContentView(scroll);

        TextView volver = texto("‹  Volver", 16, 0xffD65A31, true);
        volver.setOnClickListener(v -> finish());
        contenido.addView(volver);
        TextView hero = texto(emojiReceta + "  " + receta.nombre, 29, 0xff241B18, true);
        hero.setPadding(0, 28, 0, 0);
        contenido.addView(hero);
        contenido.addView(texto(receta.descripcion + "\n" + receta.minutosPreparacion + " min  ·  Cocina guiada disponible", 15, 0xff786D67, false));

        LinearLayout acciones = new LinearLayout(this);
        acciones.setGravity(Gravity.CENTER_VERTICAL);
        Button favorito = new Button(this);
        favorito.setText("♡  Guardar");
        favorito.setOnClickListener(v -> guardarFavorito(favorito));
        Button guiada = new Button(this);
        guiada.setText("▶  Cocinar guiado");
        guiada.setTextColor(0xffffffff);
        guiada.setBackgroundColor(0xffD65A31);
        guiada.setOnClickListener(v -> mostrarCocinaGuiada());
        acciones.addView(favorito, new LinearLayout.LayoutParams(0, 54, 1));
        LinearLayout.LayoutParams gp = new LinearLayout.LayoutParams(0, 54, 1);
        gp.setMargins(8, 0, 0, 0);
        acciones.addView(guiada, gp);
        contenido.addView(acciones);

        contenido.addView(texto("¿Para cuántas personas?", 19, 0xff241B18, true));
        NumberPicker picker = new NumberPicker(this);
        picker.setMinValue(1);
        picker.setMaxValue(100);
        picker.setValue(porciones);
        picker.setWrapSelectorWheel(false);
        contador = texto("2 personas", 14, 0xff786D67, false);
        contenido.addView(picker, new LinearLayout.LayoutParams(-1, 88));
        contenido.addView(contador);
        picker.setOnValueChangedListener((p, anterior, nuevo) -> {
            porciones = nuevo;
            contador.setText(nuevo + (nuevo == 1 ? " persona" : " personas") + " · cantidades actualizadas");
            actualizarIngredientes();
        });

        contenido.addView(texto("Ingredientes", 21, 0xff241B18, true));
        ingredientesVista = new LinearLayout(this);
        ingredientesVista.setOrientation(LinearLayout.VERTICAL);
        contenido.addView(ingredientesVista);
        actualizarIngredientes();
        contenido.addView(texto("Preparación", 21, 0xff241B18, true));
        for (PasoReceta paso : receta.pasos) {
            contenido.addView(texto("Paso " + paso.orden + "  " + paso.instruccion
                            + (paso.segundosTemporizador > 0 ? "  ·  " + (paso.segundosTemporizador / 60) + " min" : ""),
                    16, 0xff241B18, false));
        }
    }

    private void actualizarIngredientes() {
        if (ingredientesVista == null) return;
        ingredientesVista.removeAllViews();
        for (IngredienteReceta ingrediente : receta.ingredientes) {
            double cantidad = ConversorMedidas.escalar(ingrediente.cantidad, receta.porcionesBase, porciones);
            TextView item = texto("•  " + ConversorMedidas.formatear(cantidad, ingrediente.unidad)
                    + "  " + ingrediente.nombre, 16, 0xff241B18, false);
            item.setPadding(0, 7, 0, 7);
            ingredientesVista.addView(item);
        }
        TextView ayuda = texto("Medidas: 1 taza = 240 ml  ·  1 cucharada = 15 ml  ·  1 cucharadita = 5 ml", 12, 0xff786D67, false);
        ayuda.setPadding(0, 12, 0, 12);
        ingredientesVista.addView(ayuda);
    }

    private void mostrarCocinaGuiada() {
        if (receta.pasos.isEmpty()) return;
        indicePaso = 0;
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(20, 20, 20, 20);
        pasoActual = texto("", 18, 0xff241B18, true);
        tiempo = texto("", 34, 0xffD65A31, true);
        tiempo.setGravity(Gravity.CENTER);
        Button iniciar = new Button(this);
        iniciar.setText("Iniciar temporizador");
        Button siguiente = new Button(this);
        siguiente.setText("Siguiente paso");
        panel.addView(pasoActual);
        panel.addView(tiempo);
        panel.addView(iniciar);
        panel.addView(siguiente);
        actualizarPaso();
        iniciar.setOnClickListener(v -> iniciarTemporizador());
        siguiente.setOnClickListener(v -> {
            if (indicePaso < receta.pasos.size() - 1) {
                indicePaso++;
                actualizarPaso();
            } else {
                tiempo.setText("¡Listo! 🎉");
                pasoActual.setText("Terminaste tu receta.");
            }
        });
        new androidx.appcompat.app.AlertDialog.Builder(this).setTitle("Modo cocina guiada").setView(panel)
                .setNegativeButton("Cerrar", (d, w) -> detenerTemporizador()).show();
    }

    private void actualizarPaso() {
        PasoReceta paso = receta.pasos.get(indicePaso);
        pasoActual.setText("Paso " + paso.orden + " de " + receta.pasos.size() + "\n" + paso.instruccion);
        tiempo.setText(paso.segundosTemporizador > 0 ? formatearSegundos(paso.segundosTemporizador) : "Sin temporizador");
    }

    private void iniciarTemporizador() {
        PasoReceta paso = receta.pasos.get(indicePaso);
        if (paso.segundosTemporizador <= 0) return;
        detenerTemporizador();
        temporizador = new CountDownTimer(paso.segundosTemporizador * 1000L, 1000) {
            @Override public void onTick(long restante) { tiempo.setText(formatearSegundos((int) (restante / 1000))); }
            @Override public void onFinish() { tiempo.setText("¡Tiempo! 🔔"); }
        }.start();
    }

    private void detenerTemporizador() {
        if (temporizador != null) temporizador.cancel();
        temporizador = null;
    }

    private void guardarFavorito(Button boton) {
        boton.setText("♥  Guardada");
        Long id = receta.id;
        if (id != null) ClienteApi.crear(this).marcarFavorito(id).enqueue(new Callback<Void>() {
            @Override public void onResponse(Call<Void> call, Response<Void> response) { }
            @Override public void onFailure(Call<Void> call, Throwable t) { }
        });
    }

    private TextView texto(String valor, int size, int color, boolean negrita) {
        TextView t = new TextView(this);
        t.setText(valor);
        t.setTextSize(size);
        t.setTextColor(color);
        if (negrita) t.setTypeface(null, 1);
        t.setPadding(0, 12, 0, 12);
        return t;
    }

    private String formatearSegundos(int segundos) {
        return String.format(Locale.getDefault(), "%02d:%02d", segundos / 60, segundos % 60);
    }

    private RecetaDetalle crearReceta(String clave, String titulo) {
        RecetaDetalle r = new RecetaDetalle();
        r.id = null; // Al conectar Supabase, reemplazar por el id devuelto por GET /recetas/{id}.
        r.nombre = titulo == null ? "Receta Cookly" : titulo;
        r.descripcion = "Una receta práctica con cantidades claras para cocinar sin complicaciones.";
        r.porcionesBase = 2;
        r.minutosPreparacion = clave != null && clave.equals("huevos") ? 12 : 25;
        if ("ensalada".equals(clave)) {
            r.ingredientes.add(new IngredienteReceta("garbanzos cocidos", 1, "taza"));
            r.ingredientes.add(new IngredienteReceta("tomate", 1, "unidad"));
            r.ingredientes.add(new IngredienteReceta("limón", 2, "cucharadita"));
            r.pasos.add(new PasoReceta(1, "Mezcla los garbanzos y el tomate picado.", 0));
            r.pasos.add(new PasoReceta(2, "Aliña con limón, aceite y sal.", 60));
        } else if ("huevos".equals(clave)) {
            r.ingredientes.add(new IngredienteReceta("huevos", 4, "unidad"));
            r.ingredientes.add(new IngredienteReceta("tomate triturado", 1, "taza"));
            r.ingredientes.add(new IngredienteReceta("aceite de oliva", 1, "cucharada"));
            r.pasos.add(new PasoReceta(1, "Calienta el aceite y cocina el tomate.", 300));
            r.pasos.add(new PasoReceta(2, "Añade los huevos y tapa hasta cuajar.", 240));
        } else {
            r.ingredientes.add(new IngredienteReceta("pasta", 200, "gramos"));
            r.ingredientes.add(new IngredienteReceta("tomate triturado", 1, "taza"));
            r.ingredientes.add(new IngredienteReceta("crema", 2, "cucharada"));
            r.ingredientes.add(new IngredienteReceta("sal", 1, "cucharadita"));
            r.pasos.add(new PasoReceta(1, "Hierve la pasta en agua con sal.", 600));
            r.pasos.add(new PasoReceta(2, "Calienta el tomate y mezcla con la crema.", 300));
            r.pasos.add(new PasoReceta(3, "Integra la pasta y sirve caliente.", 60));
        }
        return r;
    }
}