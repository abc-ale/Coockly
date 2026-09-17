package com.cookly.actividades;

import android.content.Intent;
import android.os.Bundle;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.modelos.HistorialReceta;
import com.cookly.servicios.ClienteApi;
import com.google.android.material.card.MaterialCardView;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ActividadHistorial extends AppCompatActivity {
    private LinearLayout contenido;

    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(0xfffff8f3);
        contenido = new LinearLayout(this);
        contenido.setOrientation(LinearLayout.VERTICAL);
        contenido.setPadding(24, 36, 24, 24);
        scroll.addView(contenido);
        setContentView(scroll);

        TextView volver = texto("‹  Volver", 16, 0xffD65A31, true);
        volver.setOnClickListener(v -> finish());
        contenido.addView(volver);
        contenido.addView(texto("Vistas recientemente", 24, 0xff241B18, true));
        cargar();
    }

    private void cargar() {
        ClienteApi.crear(this).historial().enqueue(new Callback<List<HistorialReceta>>() {
            @Override public void onResponse(Call<List<HistorialReceta>> c, Response<List<HistorialReceta>> r) {
                if (r.body() == null || r.body().isEmpty()) {
                    contenido.addView(texto("Aún no has visto ninguna receta.", 15, 0xff786D67, false));
                    return;
                }
                for (HistorialReceta h : r.body()) tarjeta(h);
            }
            @Override public void onFailure(Call<List<HistorialReceta>> c, Throwable t) { }
        });
    }

    private void tarjeta(HistorialReceta h) {
        if (h.receta == null) return;
        MaterialCardView card = new MaterialCardView(this);
        card.setRadius(18); card.setCardElevation(1);
        LinearLayout caja = new LinearLayout(this);
        caja.setOrientation(LinearLayout.VERTICAL);
        caja.setPadding(16, 14, 16, 14);
        caja.addView(texto(h.receta.nombre, 16, 0xff241B18, true));
        caja.setOnClickListener(v -> {
            Intent intent = new Intent(this, ActividadReceta.class);
            intent.putExtra("recetaId", h.receta.id);
            startActivity(intent);
        });
        card.addView(caja);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.setMargins(0, 6, 0, 6);
        contenido.addView(card, p);
    }

    private TextView texto(String v, int s, int col, boolean b) {
        TextView t = new TextView(this); t.setText(v); t.setTextSize(s); t.setTextColor(col);
        if (b) t.setTypeface(null, 1); t.setPadding(0, 10, 0, 10); return t;
    }
}
