package com.cookly.actividades;

import android.content.Intent;
import android.os.Bundle;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.modelos.ListaCompra;
import com.cookly.modelos.SolicitudListaCompra;
import com.cookly.servicios.ClienteApi;
import com.google.android.material.card.MaterialCardView;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ActividadListasCompra extends AppCompatActivity {
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
        contenido.addView(texto("Listas de compra", 24, 0xff241B18, true));

        LinearLayout crear = new LinearLayout(this);
        EditText nombre = new EditText(this);
        nombre.setHint("Nombre de la lista (ej. Súper del sábado)");
        nombre.setLayoutParams(new LinearLayout.LayoutParams(0, -2, 1));
        Button crearBoton = new Button(this);
        crearBoton.setText("+ Crear");
        crearBoton.setOnClickListener(v -> {
            String n = nombre.getText().toString().trim();
            if (n.isEmpty()) return;
            ClienteApi.crear(this).crearListaCompra(new SolicitudListaCompra(n)).enqueue(new Callback<ListaCompra>() {
                @Override public void onResponse(Call<ListaCompra> c, Response<ListaCompra> r) { nombre.setText(""); cargar(); }
                @Override public void onFailure(Call<ListaCompra> c, Throwable t) { }
            });
        });
        crear.addView(nombre); crear.addView(crearBoton);
        contenido.addView(crear);
        cargar();
    }

    @Override protected void onResume() { super.onResume(); cargar(); }

    private void cargar() {
        // Quita las tarjetas de listas previas (deja el encabezado + el formulario de creación, primeras 3 vistas).
        while (contenido.getChildCount() > 3) contenido.removeViewAt(3);
        ClienteApi.crear(this).misListasCompra().enqueue(new Callback<List<ListaCompra>>() {
            @Override public void onResponse(Call<List<ListaCompra>> c, Response<List<ListaCompra>> r) {
                if (r.body() == null || r.body().isEmpty()) {
                    contenido.addView(texto("Aún no tienes listas. Créala arriba o genérala desde tu menú semanal.", 15, 0xff786D67, false));
                    return;
                }
                for (ListaCompra lista : r.body()) tarjeta(lista);
            }
            @Override public void onFailure(Call<List<ListaCompra>> c, Throwable t) { }
        });
    }

    private void tarjeta(ListaCompra lista) {
        MaterialCardView card = new MaterialCardView(this);
        card.setRadius(18); card.setCardElevation(1);
        LinearLayout caja = new LinearLayout(this);
        caja.setOrientation(LinearLayout.VERTICAL);
        caja.setPadding(16, 14, 16, 14);
        int total = lista.elementos == null ? 0 : lista.elementos.size();
        long comprados = lista.elementos == null ? 0 : lista.elementos.stream().filter(e -> e.comprado).count();
        caja.addView(texto("🛒  " + lista.nombre, 17, 0xff241B18, true));
        caja.addView(texto(comprados + " de " + total + " comprados", 13, 0xff786D67, false));
        caja.setOnClickListener(v -> {
            Intent intent = new Intent(this, ActividadDetalleListaCompra.class);
            intent.putExtra("listaId", lista.id);
            startActivity(intent);
        });
        card.addView(caja);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.setMargins(0, 7, 0, 7);
        contenido.addView(card, p);
    }

    private TextView texto(String v, int s, int col, boolean b) {
        TextView t = new TextView(this); t.setText(v); t.setTextSize(s); t.setTextColor(col);
        if (b) t.setTypeface(null, 1); t.setPadding(0, 10, 0, 10); return t;
    }
}