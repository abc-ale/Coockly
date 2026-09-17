package com.cookly.actividades;

import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.text.InputType;
import android.widget.*;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.modelos.RecetaDetalle;
import com.cookly.modelos.SolicitudCrearReceta;
import com.cookly.modelos.SolicitudImagen;
import com.cookly.servicios.CargaImagenCloudinary;
import com.cookly.servicios.ClienteApi;
import java.io.*;
import java.util.ArrayList;
import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ActividadNuevaReceta extends AppCompatActivity {
    private LinearLayout cajaIngredientes, cajaPasos;
    private ImageView previaImagen;
    private Uri imagenSeleccionada;
    private ActivityResultLauncher<String> selectorImagen;

    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        selectorImagen = registerForActivityResult(new ActivityResultContracts.GetContent(), uri -> {
            if (uri == null) return;
            imagenSeleccionada = uri;
            try {
                Bitmap bitmap = MediaStore.Images.Media.getBitmap(getContentResolver(), uri);
                previaImagen.setImageBitmap(bitmap);
                previaImagen.setVisibility(android.view.View.VISIBLE);
            } catch (IOException e) { Toast.makeText(this, "No se pudo leer la imagen", Toast.LENGTH_SHORT).show(); }
        });

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(0xfffff8f3);
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(24, 32, 24, 40);
        scroll.addView(l);
        setContentView(scroll);

        TextView volver = texto("‹  Volver", 16, 0xffD65A31, true);
        volver.setOnClickListener(v -> finish());
        l.addView(volver);
        l.addView(texto("Crea una receta", 24, 0xff241B18, true));

        previaImagen = new ImageView(this);
        previaImagen.setVisibility(android.view.View.GONE);
        previaImagen.setAdjustViewBounds(true);
        previaImagen.setLayoutParams(new LinearLayout.LayoutParams(-1, 400));
        l.addView(previaImagen);
        Button elegirFoto = new Button(this);
        elegirFoto.setText("📷  Elegir foto (opcional)");
        elegirFoto.setOnClickListener(v -> selectorImagen.launch("image/*"));
        l.addView(elegirFoto);

        EditText nombre = campo("Nombre de tu receta");
        EditText descripcion = campo("Descripción breve");
        EditText minutos = campo("Tiempo en minutos");
        minutos.setInputType(InputType.TYPE_CLASS_NUMBER);
        l.addView(nombre); l.addView(descripcion); l.addView(minutos);

        l.addView(texto("Ingredientes", 19, 0xff241B18, true));
        cajaIngredientes = new LinearLayout(this);
        cajaIngredientes.setOrientation(LinearLayout.VERTICAL);
        l.addView(cajaIngredientes);
        agregarFilaIngrediente();
        Button masIngrediente = new Button(this);
        masIngrediente.setText("+ Agregar ingrediente");
        masIngrediente.setOnClickListener(v -> agregarFilaIngrediente());
        l.addView(masIngrediente);

        l.addView(texto("Pasos de preparación", 19, 0xff241B18, true));
        cajaPasos = new LinearLayout(this);
        cajaPasos.setOrientation(LinearLayout.VERTICAL);
        l.addView(cajaPasos);
        agregarFilaPaso();
        Button masPaso = new Button(this);
        masPaso.setText("+ Agregar paso");
        masPaso.setOnClickListener(v -> agregarFilaPaso());
        l.addView(masPaso);

        Button publicar = new Button(this);
        publicar.setText("Publicar receta");
        publicar.setOnClickListener(v -> publicar(nombre, descripcion, minutos));
        l.addView(publicar);
    }

    private void agregarFilaIngrediente() {
        LinearLayout fila = new LinearLayout(this);
        EditText nombreIng = new EditText(this);
        nombreIng.setHint("Ingrediente (ej. arroz)");
        nombreIng.setLayoutParams(new LinearLayout.LayoutParams(0, -2, 2));
        EditText cantidad = new EditText(this);
        cantidad.setHint("Cant.");
        cantidad.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        cantidad.setLayoutParams(new LinearLayout.LayoutParams(0, -2, 1));
        EditText unidad = new EditText(this);
        unidad.setHint("Unidad");
        unidad.setLayoutParams(new LinearLayout.LayoutParams(0, -2, 1));
        fila.addView(nombreIng); fila.addView(cantidad); fila.addView(unidad);
        fila.setTag(new EditText[]{nombreIng, cantidad, unidad});
        cajaIngredientes.addView(fila);
    }

    private void agregarFilaPaso() {
        EditText paso = new EditText(this);
        paso.setHint("Describe este paso");
        cajaPasos.addView(paso);
    }

    private void publicar(EditText nombre, EditText descripcion, EditText minutos) {
        String n = nombre.getText().toString().trim();
        if (n.isEmpty()) { Toast.makeText(this, "Ponle un nombre a tu receta", Toast.LENGTH_SHORT).show(); return; }

        List<SolicitudCrearReceta.IngredienteNuevo> ingredientes = new ArrayList<>();
        for (int i = 0; i < cajaIngredientes.getChildCount(); i++) {
            EditText[] campos = (EditText[]) cajaIngredientes.getChildAt(i).getTag();
            String nombreIng = campos[0].getText().toString().trim();
            if (nombreIng.isEmpty()) continue;
            Double cantidad = null;
            String textoCantidad = campos[1].getText().toString().trim();
            if (!textoCantidad.isEmpty()) try { cantidad = Double.parseDouble(textoCantidad); } catch (NumberFormatException ignored) { }
            String unidad = campos[2].getText().toString().trim();
            ingredientes.add(new SolicitudCrearReceta.IngredienteNuevo(nombreIng, cantidad, unidad.isEmpty() ? null : unidad));
        }
        if (ingredientes.isEmpty()) { Toast.makeText(this, "Agrega al menos un ingrediente", Toast.LENGTH_SHORT).show(); return; }

        List<SolicitudCrearReceta.PasoNuevo> pasos = new ArrayList<>();
        for (int i = 0; i < cajaPasos.getChildCount(); i++) {
            EditText campo = (EditText) cajaPasos.getChildAt(i);
            String instruccion = campo.getText().toString().trim();
            if (!instruccion.isEmpty()) pasos.add(new SolicitudCrearReceta.PasoNuevo(pasos.size() + 1, instruccion));
        }
        if (pasos.isEmpty()) { Toast.makeText(this, "Agrega al menos un paso", Toast.LENGTH_SHORT).show(); return; }

        Integer mins = null;
        String textoMinutos = minutos.getText().toString().trim();
        if (!textoMinutos.isEmpty()) try { mins = Integer.parseInt(textoMinutos); } catch (NumberFormatException ignored) { }

        SolicitudCrearReceta solicitud = new SolicitudCrearReceta(n, descripcion.getText().toString().trim(), mins, ingredientes, pasos);
        ClienteApi.crear(this).crearReceta(solicitud).enqueue(new Callback<RecetaDetalle>() {
            @Override public void onResponse(Call<RecetaDetalle> c, Response<RecetaDetalle> r) {
                if (r.body() == null || r.body().id == null) { errorPublicar(); return; }
                if (imagenSeleccionada != null) subirImagen(r.body().id); else exito();
            }
            @Override public void onFailure(Call<RecetaDetalle> c, Throwable t) { errorPublicar(); }
        });
    }

    private void subirImagen(Long recetaId) {
        try {
            File archivo = new File(getCacheDir(), "receta_" + recetaId + ".jpg");
            try (InputStream entrada = getContentResolver().openInputStream(imagenSeleccionada);
                 OutputStream salida = new FileOutputStream(archivo)) {
                byte[] buffer = new byte[8192];
                int leidos;
                while ((leidos = entrada.read(buffer)) != -1) salida.write(buffer, 0, leidos);
            }
            CargaImagenCloudinary.firmarYSubir(this, archivo, new CargaImagenCloudinary.Resultado() {
                @Override public void completo(String url, String publicId) {
                    ClienteApi.crear(ActividadNuevaReceta.this)
                            .guardarImagen(new SolicitudImagen(recetaId, url, publicId))
                            .enqueue(new Callback<com.cookly.modelos.Imagen>() {
                                @Override public void onResponse(Call<com.cookly.modelos.Imagen> c, Response<com.cookly.modelos.Imagen> r) { exito(); }
                                @Override public void onFailure(Call<com.cookly.modelos.Imagen> c, Throwable t) { exito(); }
                            });
                }
                @Override public void error(String mensaje) {
                    Toast.makeText(ActividadNuevaReceta.this, "Receta creada, pero la foto no se pudo subir: " + mensaje, Toast.LENGTH_LONG).show();
                    finish();
                }
            });
        } catch (IOException e) { exito(); }
    }

    private void exito() {
        Toast.makeText(this, "¡Receta publicada! 🎉", Toast.LENGTH_LONG).show();
        finish();
    }

    private void errorPublicar() {
        Toast.makeText(this, "No se pudo publicar la receta. Intenta de nuevo.", Toast.LENGTH_SHORT).show();
    }

    private EditText campo(String hint) {
        EditText e = new EditText(this); e.setHint(hint); e.setTextSize(16); e.setPadding(10, 12, 10, 12); return e;
    }
    private TextView texto(String v, int s, int col, boolean b) {
        TextView t = new TextView(this); t.setText(v); t.setTextSize(s); t.setTextColor(col);
        if (b) t.setTypeface(null, 1); t.setPadding(0, 14, 0, 14); return t;
    }
}