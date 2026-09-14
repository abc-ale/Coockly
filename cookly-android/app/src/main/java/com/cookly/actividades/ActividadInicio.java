package com.cookly.actividades;

import android.content.Intent;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.R;
import com.google.android.material.card.MaterialCardView;

/** Inicio ligero y claro: el catálogo se muestra de inmediato y Menú Express usa la API real. */
public class ActividadInicio extends AppCompatActivity {
    private LinearLayout lista;

    private final String[][] recetas = {
            {"🍗", "Arroz con pollo casero", "35 min · Completa", "arroz · pollo · cebolla · ajo · tomate"},
            {"🍳", "Huevos mediterráneos", "12 min · Rápida", "huevo · tomate · cebolla · ajo"},
            {"🍋", "Pollo al limón", "25 min · Fácil", "pollo · limón · ajo · cebolla"},
            {"🥔", "Papas doradas con ajo", "30 min · Económica", "papa · ajo · limón · aceite"},
            {"🍚", "Arroz salteado con huevo", "18 min · Aprovechamiento", "arroz · huevo · cebolla · tomate"},
            {"🥗", "Ensalada fresca de garbanzos", "15 min · Ligera", "garbanzo · tomate · cebolla · limón"},
            {"🍲", "Sopa rápida de pollo y papa", "40 min · Reconfortante", "pollo · papa · tomate · cebolla"},
            {"🍅", "Tomates rellenos de arroz", "28 min · Vegetariana", "tomate · arroz · cebolla · ajo"}
    };

    @Override
    public void onCreate(Bundle estado) {
        super.onCreate(estado);
        setContentView(R.layout.actividad_inicio);
        lista = findViewById(R.id.contenedorRecetas);
        for (String[] receta : recetas) tarjeta(receta);

        findViewById(R.id.botonMenuExpress).setOnClickListener(v ->
                startActivity(new Intent(this, ActividadMenuExpress.class)));
        findViewById(R.id.botonAgregar).setOnClickListener(v ->
                startActivity(new Intent(this, ActividadNuevaReceta.class)));
        findViewById(R.id.botonPerfil).setOnClickListener(v ->
                startActivity(new Intent(this, ActividadPerfil.class)));
        findViewById(R.id.botonPerfilInferior).setOnClickListener(v ->
                startActivity(new Intent(this, ActividadPerfil.class)));
    }

    private void tarjeta(String[] receta) {
        MaterialCardView tarjeta = new MaterialCardView(this);
        tarjeta.setRadius(24);
        tarjeta.setCardElevation(2);
        tarjeta.setContentPadding(0, 0, 0, 0);
        LinearLayout.LayoutParams parametros = new LinearLayout.LayoutParams(-1, -2);
        parametros.setMargins(0, 8, 0, 8);
        tarjeta.setLayoutParams(parametros);

        LinearLayout fila = new LinearLayout(this);
        fila.setPadding(16, 14, 16, 14);
        fila.setGravity(Gravity.CENTER_VERTICAL);

        TextView emoji = new TextView(this);
        emoji.setText(receta[0]);
        emoji.setTextSize(34);
        emoji.setGravity(Gravity.CENTER);
        fila.addView(emoji, new LinearLayout.LayoutParams(66, 66));

        LinearLayout textos = new LinearLayout(this);
        textos.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams parametrosTexto = new LinearLayout.LayoutParams(0, -2, 1);
        parametrosTexto.setMargins(12, 0, 8, 0);
        textos.setLayoutParams(parametrosTexto);

        TextView nombre = new TextView(this);
        nombre.setText(receta[1]);
        nombre.setTextSize(17);
        nombre.setTextColor(0xff241B18);
        nombre.setTypeface(null, 1);
        textos.addView(nombre);

        TextView meta = new TextView(this);
        meta.setText(receta[2]);
        meta.setTextColor(0xffD65A31);
        meta.setTextSize(13);
        textos.addView(meta);

        TextView ingredientes = new TextView(this);
        ingredientes.setText(receta[3]);
        ingredientes.setTextColor(0xff786D67);
        ingredientes.setTextSize(12);
        textos.addView(ingredientes);
        fila.addView(textos);

        TextView flecha = new TextView(this);
        flecha.setText("›");
        flecha.setTextSize(30);
        flecha.setTextColor(0xffD65A31);
        fila.addView(flecha);

        tarjeta.addView(fila);
        tarjeta.setOnClickListener(v -> detalle(receta));
        lista.addView(tarjeta);
    }

    private void detalle(String[] receta) {
        new androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle(receta[0] + "  " + receta[1])
                .setMessage(receta[2] + "\n\nIngredientes:\n" + receta[3]
                        + "\n\nAbre Menú Express para ver qué puedes preparar con lo que tienes.")
                .setPositiveButton("Entendido", null)
                .show();
    }
}