package com.cookly.actividades;

import android.os.Bundle;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.modelos.*;
import com.cookly.servicios.ClienteApi;
import com.google.android.material.card.MaterialCardView;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ActividadModeracion extends AppCompatActivity {
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
        contenido.addView(texto("Reportes pendientes", 24, 0xff241B18, true));
        cargar();
    }

    private void cargar() {
        ClienteApi.crear(this).reportesPendientes().enqueue(new Callback<List<Reporte>>() {
            @Override public void onResponse(Call<List<Reporte>> c, Response<List<Reporte>> r) {
                if (r.body() == null || r.body().isEmpty()) {
                    contenido.addView(texto("No hay reportes pendientes. 🎉", 16, 0xff786D67, false));
                    return;
                }
                for (Reporte rep : r.body()) tarjeta(rep);
            }
            @Override public void onFailure(Call<List<Reporte>> c, Throwable t) {
                Toast.makeText(ActividadModeracion.this, "No se pudo cargar", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void tarjeta(Reporte rep) {
        MaterialCardView card = new MaterialCardView(this);
        card.setRadius(18);
        card.setCardElevation(1);
        LinearLayout caja = new LinearLayout(this);
        caja.setOrientation(LinearLayout.VERTICAL);
        caja.setPadding(16, 14, 16, 14);

        String autor = rep.usuario != null ? rep.usuario.nombre : "Usuario";
        caja.addView(texto("Motivo: " + rep.motivo, 16, 0xff241B18, true));
        caja.addView(texto("Reportado por: " + autor, 13, 0xff786D67, false));

        LinearLayout botones = new LinearLayout(this);
        Button descartar = new Button(this);
        descartar.setText("Descartar");
        descartar.setOnClickListener(v -> resolver(rep.id, EstadoReporte.DESCARTADO, false, card));
        Button revisar = new Button(this);
        revisar.setText("Marcar revisado");
        revisar.setOnClickListener(v -> resolver(rep.id, EstadoReporte.REVISADO, false, card));
        Button eliminarReceta = new Button(this);
        eliminarReceta.setText("Revisado + borrar receta");
        eliminarReceta.setOnClickListener(v -> resolver(rep.id, EstadoReporte.REVISADO, true, card));
        botones.addView(descartar); botones.addView(revisar); botones.addView(eliminarReceta);
        caja.addView(botones);

        card.addView(caja);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.setMargins(0, 8, 0, 8);
        contenido.addView(card, p);
    }

    private void resolver(Long id, EstadoReporte estado, boolean eliminarReceta, MaterialCardView card) {
        ClienteApi.crear(this).resolverReporte(id, new SolicitudRevisionReporte(estado), eliminarReceta)
                .enqueue(new Callback<Reporte>() {
                    @Override public void onResponse(Call<Reporte> c, Response<Reporte> r) {
                        contenido.removeView(card);
                        Toast.makeText(ActividadModeracion.this, "Reporte actualizado", Toast.LENGTH_SHORT).show();
                    }
                    @Override public void onFailure(Call<Reporte> c, Throwable t) {
                        Toast.makeText(ActividadModeracion.this, "No se pudo resolver el reporte", Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private TextView texto(String v, int s, int col, boolean b) {
        TextView t = new TextView(this); t.setText(v); t.setTextSize(s); t.setTextColor(col);
        if (b) t.setTypeface(null, 1); t.setPadding(0, 10, 0, 10); return t;
    }
}