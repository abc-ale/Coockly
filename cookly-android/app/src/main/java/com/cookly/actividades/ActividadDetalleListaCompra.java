package com.cookly.actividades;

import android.os.Bundle;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.modelos.*;
import com.cookly.servicios.ClienteApi;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * No existe GET /listas-compra/{id} (solo la lista completa de "mis listas",
 * que ya trae los elementos incluidos), así que se trae todo y se filtra
 * localmente por el id que llegó por Intent.
 */
public class ActividadDetalleListaCompra extends AppCompatActivity {
    private LinearLayout contenido, cajaItems;
    private long listaId;

    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        listaId = getIntent().getLongExtra("listaId", -1);
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
        contenido.addView(texto("Tu lista", 24, 0xff241B18, true));

        cajaItems = new LinearLayout(this);
        cajaItems.setOrientation(LinearLayout.VERTICAL);
        contenido.addView(cajaItems);

        LinearLayout agregar = new LinearLayout(this);
        EditText nombreItem = new EditText(this);
        nombreItem.setHint("Ítem extra (ej. servilletas)");
        nombreItem.setLayoutParams(new LinearLayout.LayoutParams(0, -2, 1));
        Button agregarBoton = new Button(this);
        agregarBoton.setText("+");
        agregarBoton.setOnClickListener(v -> {
            String texto = nombreItem.getText().toString().trim();
            if (texto.isEmpty()) return;
            ClienteApi.crear(this).agregarItemLista(listaId, new SolicitudElementoListaCompra(null, texto, null, null))
                    .enqueue(new Callback<ElementoListaCompra>() {
                        @Override public void onResponse(Call<ElementoListaCompra> c, Response<ElementoListaCompra> r) { nombreItem.setText(""); cargar(); }
                        @Override public void onFailure(Call<ElementoListaCompra> c, Throwable t) { }
                    });
        });
        agregar.addView(nombreItem); agregar.addView(agregarBoton);
        contenido.addView(agregar);

        Button eliminarLista = new Button(this);
        eliminarLista.setText("Eliminar esta lista");
        eliminarLista.setOnClickListener(v -> ClienteApi.crear(this).eliminarListaCompra(listaId).enqueue(new Callback<Void>() {
            @Override public void onResponse(Call<Void> c, Response<Void> r) { finish(); }
            @Override public void onFailure(Call<Void> c, Throwable t) { }
        }));
        contenido.addView(eliminarLista);

        cargar();
    }

    private void cargar() {
        ClienteApi.crear(this).misListasCompra().enqueue(new Callback<List<ListaCompra>>() {
            @Override public void onResponse(Call<List<ListaCompra>> c, Response<List<ListaCompra>> r) {
                if (r.body() == null) return;
                for (ListaCompra lista : r.body()) {
                    if (lista.id == listaId) { dibujarItems(lista); return; }
                }
            }
            @Override public void onFailure(Call<List<ListaCompra>> c, Throwable t) { }
        });
    }

    private void dibujarItems(ListaCompra lista) {
        cajaItems.removeAllViews();
        if (lista.elementos == null || lista.elementos.isEmpty()) {
            cajaItems.addView(texto("Esta lista todavía no tiene ítems.", 14, 0xff786D67, false));
            return;
        }
        for (ElementoListaCompra item : lista.elementos) {
            LinearLayout fila = new LinearLayout(this);
            CheckBox check = new CheckBox(this);
            check.setChecked(item.comprado);
            check.setText(item.nombreVisible() + (item.cantidad != null ? "  (" + item.cantidad + " " + (item.unidad == null ? "" : item.unidad) + ")" : ""));
            check.setOnCheckedChangeListener((btn, marcado) -> ClienteApi.crear(this).marcarItemComprado(item.id, marcado)
                    .enqueue(new Callback<Void>() {
                        @Override public void onResponse(Call<Void> c, Response<Void> r) { }
                        @Override public void onFailure(Call<Void> c, Throwable t) { }
                    }));
            fila.addView(check);
            cajaItems.addView(fila);
        }
    }

    private TextView texto(String v, int s, int col, boolean b) {
        TextView t = new TextView(this); t.setText(v); t.setTextSize(s); t.setTextColor(col);
        if (b) t.setTypeface(null, 1); t.setPadding(0, 10, 0, 10); return t;
    }
}