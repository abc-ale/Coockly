package com.cookly.actividades;

import android.content.Intent;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.R;
import com.google.android.material.card.MaterialCardView;

public class ActividadInicio extends AppCompatActivity {
    private LinearLayout lista;
    private final String[][] recetas = {
            {"🍝", "Pasta cremosa de tomate", "25 min · Fácil", "pasta cremosa"},
            {"🥗", "Ensalada fresca de garbanzos", "15 min · Ligera", "ensalada"},
            {"🍳", "Huevos mediterráneos", "12 min · Rápida", "huevos"}
    };

    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        setContentView(R.layout.actividad_inicio);
        lista = findViewById(R.id.contenedorRecetas);
        for (String[] receta : recetas) tarjeta(receta);
        findViewById(R.id.botonMenuExpress).setOnClickListener(v ->
                startActivity(new Intent(this, ActividadMenuExpress.class)));
        findViewById(R.id.botonChat).setOnClickListener(v -> abrirAsistente(false));
        findViewById(R.id.botonVoz).setOnClickListener(v -> abrirAsistente(true));
        findViewById(R.id.botonAgregar).setOnClickListener(v ->
                startActivity(new Intent(this, ActividadNuevaReceta.class)));
        findViewById(R.id.botonPerfil).setOnClickListener(v ->
                startActivity(new Intent(this, ActividadPerfil.class)));
        findViewById(R.id.botonPerfilInferior).setOnClickListener(v ->
                startActivity(new Intent(this, ActividadPerfil.class)));
    }

    private void tarjeta(String[] receta) {
        MaterialCardView card = new MaterialCardView(this);
        card.setRadius(22);
        card.setCardElevation(2);
        card.setStrokeWidth(1);
        card.setStrokeColor(0xffEEE2DA);
        LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(-1, -2);
        cp.setMargins(0, 5, 0, 9);
        card.setLayoutParams(cp);
        LinearLayout fila = new LinearLayout(this);
        fila.setPadding(16, 14, 16, 14);
        fila.setGravity(Gravity.CENTER_VERTICAL);
        TextView emoji = new TextView(this);
        emoji.setText(receta[0]);
        emoji.setTextSize(36);
        emoji.setGravity(Gravity.CENTER);
        fila.addView(emoji, new LinearLayout.LayoutParams(64, 64));
        LinearLayout texto = new LinearLayout(this);
        texto.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(0, -2, 1);
        tp.setMargins(14, 0, 0, 0);
        texto.setLayoutParams(tp);
        TextView titulo = new TextView(this);
        titulo.setText(receta[1]);
        titulo.setTextColor(0xff241B18);
        titulo.setTextSize(17);
        titulo.setTypeface(null, 1);
        texto.addView(titulo);
        TextView meta = new TextView(this);
        meta.setText(receta[2] + "  ·  Ver receta");
        meta.setTextColor(0xff786D67);
        meta.setTextSize(14);
        texto.addView(meta);
        fila.addView(texto);
        TextView flecha = new TextView(this);
        flecha.setText("›");
        flecha.setTextSize(28);
        flecha.setTextColor(0xffD65A31);
        fila.addView(flecha);
        card.addView(fila);
        card.setOnClickListener(v -> {
            Intent intent = new Intent(this, ActividadReceta.class);
            intent.putExtra("receta", receta[3]);
            intent.putExtra("titulo", receta[1]);
            intent.putExtra("emoji", receta[0]);
            startActivity(intent);
        });
        lista.addView(card);
    }

    private void abrirAsistente(boolean voz) {
        Intent intent = new Intent(this, ActividadAsistente.class);
        intent.putExtra("modoVoz", voz);
        startActivity(intent);
    }
}