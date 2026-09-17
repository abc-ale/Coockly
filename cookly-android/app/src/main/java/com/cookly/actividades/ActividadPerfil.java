package com.cookly.actividades;

import com.cookly.almacenamiento.AlmacenToken;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;

import com.cookly.modelos.RecetaDetalle;
import com.cookly.servicios.ClienteApi;
import com.google.android.material.card.MaterialCardView;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ActividadPerfil extends AppCompatActivity {
    private LinearLayout contenido;

    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(0xfffff8f3);
        contenido = new LinearLayout(this);
        contenido.setOrientation(LinearLayout.VERTICAL);
        contenido.setPadding(20, 22, 20, 28);
        scroll.addView(contenido);
        setContentView(scroll);

        TextView volver = texto("‹  Inicio", 16, 0xffD65A31, true);
        volver.setOnClickListener(v -> finish());
        contenido.addView(volver);
        TextView avatar = texto("👩‍🍳", 58, 0xff241B18, false);
        avatar.setGravity(Gravity.CENTER);
        avatar.setBackgroundColor(0xffffeee6);
        contenido.addView(avatar);
        TextView titulo = texto("Mi cocina", 29, 0xff241B18, true);
        titulo.setGravity(Gravity.CENTER);
        contenido.addView(titulo);
        TextView subtitulo = texto("Tu recetario, tus favoritos, tus reglas.", 15, 0xff786D67, false);
        subtitulo.setGravity(Gravity.CENTER);
        contenido.addView(subtitulo);

        LinearLayout estadisticas = new LinearLayout(this);
        estadisticas.setPadding(0, 18, 0, 18);
        estadisticas.addView(estadistica("0", "Favoritos"));
        estadisticas.addView(estadistica("0", "Guardadas"));
        estadisticas.addView(estadistica("0", "Creadas"));
        contenido.addView(estadisticas);

        contenido.addView(texto("Tus recetas", 21, 0xff241B18, true));
        cargarFavoritos();

        contenido.addView(texto("Herramientas", 21, 0xff241B18, true));
        contenido.addView(botonNavegacion("🗓  Menú semanal", ActividadMenuSemanal.class));
        contenido.addView(botonNavegacion("🛒  Listas de compra", ActividadListasCompra.class));
        contenido.addView(botonNavegacion("🕘  Historial", ActividadHistorial.class));

        contenido.addView(texto("Cuenta", 21, 0xff241B18, true));
        contenido.addView(botonNavegacion("🔒  Cambiar contraseña", ActividadCambiarContrasena.class));
        contenido.addView(botonNavegacion("🥗  Restricciones y alergias", ActividadPreferencias.class));

        String rol = new AlmacenToken(this).obtenerRol();
        if ("MODERADOR".equals(rol) || "ADMINISTRADOR".equals(rol)) {
            contenido.addView(texto("Moderación", 21, 0xff241B18, true));
            contenido.addView(botonNavegacion("🚩  Reportes pendientes", ActividadModeracion.class));
        }
        if ("ADMINISTRADOR".equals(rol)) {
            contenido.addView(botonNavegacion("👤  Administrar usuarios", ActividadAdministracion.class));
        }

        Button cerrar = new Button(this);
        cerrar.setText("Cerrar sesión");
        cerrar.setOnClickListener(v -> {
            new AlmacenToken(this).borrar();
            startActivity(new Intent(this, ActividadAcceso.class)
                    .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK));
            finish();
        });
        contenido.addView(cerrar);
    }

    private Button botonNavegacion(String texto, Class<?> destino) {
        Button b = new Button(this);
        b.setText(texto);
        b.setOnClickListener(v -> startActivity(new Intent(this, destino)));
        return b;
    }

    private TextView estadistica(String valor, String etiqueta) {
        TextView t = texto(valor + "\n" + etiqueta, 15, 0xff241B18, true);
        t.setGravity(Gravity.CENTER);
        t.setBackgroundColor(0xffffffff);
        t.setLayoutParams(new LinearLayout.LayoutParams(0, 76, 1));
        return t;
    }

    private void cargarFavoritos() {
        ClienteApi.crear(this).favoritos().enqueue(new Callback<List<RecetaDetalle>>() {
            @Override public void onResponse(Call<List<RecetaDetalle>> call, Response<List<RecetaDetalle>> response) {
                if (response.isSuccessful() && response.body() != null && !response.body().isEmpty()) {
                    for (RecetaDetalle receta : response.body()) tarjeta(receta.nombre, receta.descripcion);
                } else vacio();
            }
            @Override public void onFailure(Call<List<RecetaDetalle>> call, Throwable t) { vacio(); }
        });
    }

    private void vacio() {
        TextView vacio = texto("Aún no tienes favoritos.\nGuarda una receta y aparecerá aquí.", 16, 0xff786D67, false);
        vacio.setPadding(18, 26, 18, 26);
        contenido.addView(vacio, Math.max(0, contenido.getChildCount() - 1));
    }

    private void tarjeta(String nombre, String descripcion) {
        MaterialCardView card = new MaterialCardView(this);
        card.setRadius(20);
        card.setCardElevation(1);
        LinearLayout caja = new LinearLayout(this);
        caja.setOrientation(LinearLayout.VERTICAL);
        caja.setPadding(16, 14, 16, 14);
        TextView t = texto("♡  " + nombre, 17, 0xff241B18, true);
        TextView d = texto(descripcion == null ? "Receta guardada en tu cocina." : descripcion, 14, 0xff786D67, false);
        caja.addView(t);
        caja.addView(d);
        card.addView(caja);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.setMargins(0, 7, 0, 7);
        contenido.addView(card, p);
    }

    private TextView texto(String valor, int size, int color, boolean negrita) {
        TextView t = new TextView(this);
        t.setText(valor);
        t.setTextSize(size);
        t.setTextColor(color);
        if (negrita) t.setTypeface(null, 1);
        t.setPadding(0, 10, 0, 10);
        return t;
    }
}