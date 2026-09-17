package com.cookly.actividades;

import android.app.DatePickerDialog;
import android.os.Bundle;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.modelos.*;
import com.cookly.servicios.ClienteApi;
import com.google.android.material.card.MaterialCardView;
import java.util.Calendar;
import java.util.Locale;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ActividadMenuSemanal extends AppCompatActivity {
    private LinearLayout contenido, cajaElementos;
    private TextView etiquetaSemana;
    private String semanaSeleccionada;
    private Long menuActualId;
    private final String[] NOMBRES_DIA = {"", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"};

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
        contenido.addView(texto("Menú semanal", 24, 0xff241B18, true));

        etiquetaSemana = texto("Elige el lunes de la semana", 15, 0xff786D67, false);
        contenido.addView(etiquetaSemana);
        Button elegirSemana = new Button(this);
        elegirSemana.setText("Elegir semana");
        elegirSemana.setOnClickListener(v -> elegirFecha());
        contenido.addView(elegirSemana);

        cajaElementos = new LinearLayout(this);
        cajaElementos.setOrientation(LinearLayout.VERTICAL);
        contenido.addView(cajaElementos);

        Button generarLista = new Button(this);
        generarLista.setText("🛒  Generar lista de compra de esta semana");
        generarLista.setOnClickListener(v -> generarLista());
        contenido.addView(generarLista);
    }

    private void elegirFecha() {
        Calendar hoy = Calendar.getInstance();
        new DatePickerDialog(this, (vista, anio, mes, dia) -> {
            semanaSeleccionada = String.format(Locale.US, "%04d-%02d-%02d", anio, mes + 1, dia);
            etiquetaSemana.setText("Semana del " + semanaSeleccionada);
            obtenerOCrearMenu();
        }, hoy.get(Calendar.YEAR), hoy.get(Calendar.MONTH), hoy.get(Calendar.DAY_OF_MONTH)).show();
    }

    private void obtenerOCrearMenu() {
        ClienteApi.crear(this).obtenerOCrearMenu(new SolicitudMenuSemanal(semanaSeleccionada))
                .enqueue(new Callback<MenuSemanal>() {
                    @Override public void onResponse(Call<MenuSemanal> c, Response<MenuSemanal> r) {
                        if (r.body() == null) return;
                        menuActualId = r.body().id;
                        dibujarElementos(r.body());
                    }
                    @Override public void onFailure(Call<MenuSemanal> c, Throwable t) {
                        Toast.makeText(ActividadMenuSemanal.this, "No se pudo cargar el menú", Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void dibujarElementos(MenuSemanal menu) {
        cajaElementos.removeAllViews();
        if (menu.elementos != null) {
            for (ElementoMenuSemanal e : menu.elementos) tarjetaElemento(e);
        }
        LinearLayout agregar = new LinearLayout(this);
        EditText idReceta = new EditText(this);
        idReceta.setHint("ID de receta");
        idReceta.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        Spinner dia = new Spinner(this);
        dia.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item,
                new String[]{"Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"}));
        Spinner tipo = new Spinner(this);
        tipo.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item,
                new String[]{"DESAYUNO", "ALMUERZO", "CENA", "MERIENDA"}));
        Button agregarBoton = new Button(this);
        agregarBoton.setText("+ Agregar receta al menú");
        agregarBoton.setOnClickListener(v -> {
            String texto = idReceta.getText().toString().trim();
            if (texto.isEmpty()) { Toast.makeText(this, "Ingresa el ID de la receta", Toast.LENGTH_SHORT).show(); return; }
            long recetaId = Long.parseLong(texto);
            short diaSel = (short) (dia.getSelectedItemPosition() + 1);
            TipoComida tipoSel = TipoComida.values()[tipo.getSelectedItemPosition()];
            ClienteApi.crear(this).agregarRecetaAlMenu(menuActualId, new SolicitudElementoMenu(recetaId, diaSel, tipoSel))
                    .enqueue(new Callback<ElementoMenuSemanal>() {
                        @Override public void onResponse(Call<ElementoMenuSemanal> c, Response<ElementoMenuSemanal> r) {
                            obtenerOCrearMenu();
                        }
                        @Override public void onFailure(Call<ElementoMenuSemanal> c, Throwable t) {
                            Toast.makeText(ActividadMenuSemanal.this, "No se pudo agregar (¿el ID de receta existe?)", Toast.LENGTH_SHORT).show();
                        }
                    });
        });
        agregar.addView(idReceta); agregar.addView(dia); agregar.addView(tipo); agregar.addView(agregarBoton);
        cajaElementos.addView(agregar);
    }

    private void tarjetaElemento(ElementoMenuSemanal e) {
        MaterialCardView card = new MaterialCardView(this);
        card.setRadius(16); card.setCardElevation(1);
        LinearLayout caja = new LinearLayout(this);
        caja.setPadding(14, 10, 14, 10);
        String nombreReceta = e.receta != null ? e.receta.nombre : "Receta";
        TextView t = texto(NOMBRES_DIA[e.diaSemana] + " · " + e.tipoComida + " · " + nombreReceta, 15, 0xff241B18, false);
        t.setLayoutParams(new LinearLayout.LayoutParams(0, -2, 1));
        Button quitar = new Button(this);
        quitar.setText("✕");
        quitar.setOnClickListener(v -> ClienteApi.crear(this).quitarRecetaDelMenu(e.id).enqueue(new Callback<Void>() {
            @Override public void onResponse(Call<Void> c, Response<Void> r) { obtenerOCrearMenu(); }
            @Override public void onFailure(Call<Void> c, Throwable t2) { }
        }));
        caja.addView(t); caja.addView(quitar);
        card.addView(caja);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.setMargins(0, 6, 0, 6);
        cajaElementos.addView(card, p);
    }

    private void generarLista() {
        if (menuActualId == null) { Toast.makeText(this, "Primero elige una semana", Toast.LENGTH_SHORT).show(); return; }
        ClienteApi.crear(this).generarListaDesdeMenu(menuActualId, "Lista de la semana")
                .enqueue(new Callback<ListaCompra>() {
                    @Override public void onResponse(Call<ListaCompra> c, Response<ListaCompra> r) {
                        Toast.makeText(ActividadMenuSemanal.this, "Lista generada. Ábrela desde 'Listas de compra'.", Toast.LENGTH_LONG).show();
                    }
                    @Override public void onFailure(Call<ListaCompra> c, Throwable t) {
                        Toast.makeText(ActividadMenuSemanal.this, "No se pudo generar la lista", Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private TextView texto(String v, int s, int col, boolean b) {
        TextView t = new TextView(this); t.setText(v); t.setTextSize(s); t.setTextColor(col);
        if (b) t.setTypeface(null, 1); t.setPadding(0, 10, 0, 10); return t;
    }
}