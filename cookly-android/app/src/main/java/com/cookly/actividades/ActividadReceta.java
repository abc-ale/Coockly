package com.cookly.actividades;

import android.app.AlertDialog;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.text.InputType;
import android.view.Gravity;
import android.widget.*;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.R;
import com.cookly.almacenamiento.AlmacenToken;
import com.cookly.modelos.*;
import com.cookly.servicios.CargaImagenCloudinary;
import com.cookly.servicios.ClienteApi;
import com.cookly.utilidades.ConversorMedidas;
import com.google.android.material.card.MaterialCardView;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
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
    private boolean esFavorito;
    private boolean recetaReal; // true cuando viene del backend (tiene id real); solo entonces se cargan fotos/comentarios/reseñas
    private LinearLayout fotosVista, comentariosVista, resenasVista;
    private final ActivityResultLauncher<String> selectorImagen = registerForActivityResult(
            new ActivityResultContracts.GetContent(), uri -> { if (uri != null) subirFoto(uri); });

    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        long recetaId = getIntent().getLongExtra("recetaId", -1);
        if (recetaId != -1) {
            recetaReal = true;
            // Viene de una búsqueda real: trae la receta del backend antes de dibujar la pantalla.
            cargarDesdeBackend(recetaId);
            ClienteApi.crear(this).registrarVista(recetaId).enqueue(new Callback<Void>() {
                @Override public void onResponse(Call<Void> call, Response<Void> response) { }
                @Override public void onFailure(Call<Void> call, Throwable t) { }
            });
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
                ClienteApi.crear(ActividadReceta.this).favoritos().enqueue(new Callback<List<RecetaDetalle>>() {
                    @Override public void onResponse(Call<List<RecetaDetalle>> call, Response<List<RecetaDetalle>> resp) {
                        if (resp.body() != null) for (RecetaDetalle r : resp.body()) if (Objects.equals(r.id, receta.id)) esFavorito = true;
                        construirVista();
                    }
                    @Override public void onFailure(Call<List<RecetaDetalle>> call, Throwable t) { construirVista(); }
                });
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
        favorito.setText(esFavorito ? "♥  Guardada" : "♡  Guardar");
        favorito.setOnClickListener(v -> alternarFavorito(favorito));
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

        if (recetaReal) {
            TextView reportar = texto("🚩  Reportar esta receta", 13, 0xff786D67, false);
            reportar.setOnClickListener(v -> dialogoReportar());
            contenido.addView(reportar);
        }

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

        if (recetaReal) {
            construirSeccionFotos();
            construirSeccionResenas();
            construirSeccionComentarios();
        }
    }

    // ----------------------------- Favorito -----------------------------

    private void alternarFavorito(Button boton) {
        if (receta.id == null) {
            Toast.makeText(this, "Esta receta de ejemplo no se puede guardar.", Toast.LENGTH_SHORT).show();
            return;
        }
        long id = receta.id;
        if (esFavorito) {
            ClienteApi.crear(this).quitarFavorito(id).enqueue(new Callback<Void>() {
                @Override public void onResponse(Call<Void> call, Response<Void> response) { esFavorito = false; boton.setText("♡  Guardar"); }
                @Override public void onFailure(Call<Void> call, Throwable t) { Toast.makeText(ActividadReceta.this, "No se pudo actualizar.", Toast.LENGTH_SHORT).show(); }
            });
        } else {
            ClienteApi.crear(this).marcarFavorito(id).enqueue(new Callback<Void>() {
                @Override public void onResponse(Call<Void> call, Response<Void> response) { esFavorito = true; boton.setText("♥  Guardada"); }
                @Override public void onFailure(Call<Void> call, Throwable t) { Toast.makeText(ActividadReceta.this, "No se pudo guardar.", Toast.LENGTH_SHORT).show(); }
            });
        }
    }

    // ----------------------------- Reportar -----------------------------

    private void dialogoReportar() {
        EditText motivo = new EditText(this);
        motivo.setHint("¿Por qué reportas esta receta?");
        new AlertDialog.Builder(this).setTitle("Reportar receta").setView(motivo)
                .setPositiveButton("Enviar", (d, w) -> {
                    String v = motivo.getText().toString().trim();
                    if (v.isEmpty()) return;
                    ClienteApi.crear(this).crearReporte(new SolicitudReporte(receta.id, v)).enqueue(new Callback<Reporte>() {
                        @Override public void onResponse(Call<Reporte> call, Response<Reporte> response) {
                            Toast.makeText(ActividadReceta.this, "Gracias, revisaremos tu reporte.", Toast.LENGTH_SHORT).show();
                        }
                        @Override public void onFailure(Call<Reporte> call, Throwable t) {
                            Toast.makeText(ActividadReceta.this, "No se pudo enviar el reporte.", Toast.LENGTH_SHORT).show();
                        }
                    });
                })
                .setNegativeButton("Cancelar", null).show();
    }

    // ----------------------------- Fotos -----------------------------

    private void construirSeccionFotos() {
        LinearLayout encabezado = new LinearLayout(this);
        encabezado.setGravity(Gravity.CENTER_VERTICAL);
        TextView titulo = texto("Fotos", 21, 0xff241B18, true);
        encabezado.addView(titulo, new LinearLayout.LayoutParams(0, -2, 1));
        Button agregar = new Button(this);
        agregar.setText("+ Añadir foto");
        agregar.setTextSize(12);
        agregar.setOnClickListener(v -> selectorImagen.launch("image/*"));
        encabezado.addView(agregar);
        contenido.addView(encabezado);

        fotosVista = new LinearLayout(this);
        fotosVista.setOrientation(LinearLayout.HORIZONTAL);
        HorizontalScrollView scrollFotos = new HorizontalScrollView(this);
        scrollFotos.addView(fotosVista);
        contenido.addView(scrollFotos);
        cargarFotos();
    }

    private void cargarFotos() {
        ClienteApi.crear(this).listarImagenes(receta.id).enqueue(new Callback<List<Imagen>>() {
            @Override public void onResponse(Call<List<Imagen>> call, Response<List<Imagen>> respuesta) {
                fotosVista.removeAllViews();
                if (respuesta.body() == null || respuesta.body().isEmpty()) {
                    fotosVista.addView(texto("Sé el primero en subir una foto.", 13, 0xff786D67, false));
                    return;
                }
                for (Imagen imagen : respuesta.body()) fotosVista.addView(miniaturaFoto(imagen));
            }
            @Override public void onFailure(Call<List<Imagen>> call, Throwable t) { }
        });
    }

    private ImageView miniaturaFoto(Imagen imagen) {
        ImageView vista = new ImageView(this);
        vista.setBackgroundColor(0xffEEE2DA);
        vista.setScaleType(ImageView.ScaleType.CENTER_CROP);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(140, 140);
        p.setMargins(0, 8, 10, 8);
        vista.setLayoutParams(p);
        new Thread(() -> {
            try (InputStream entrada = new java.net.URL(imagen.url).openStream()) {
                Bitmap mapaBits = BitmapFactory.decodeStream(entrada);
                runOnUiThread(() -> vista.setImageBitmap(mapaBits));
            } catch (Exception ignorado) { }
        }).start();
        vista.setOnLongClickListener(v -> {
            new AlertDialog.Builder(this).setMessage("¿Eliminar esta foto?")
                    .setPositiveButton("Eliminar", (d, w) -> ClienteApi.crear(this).eliminarImagen(imagen.id).enqueue(new Callback<Void>() {
                        @Override public void onResponse(Call<Void> call, Response<Void> response) { cargarFotos(); }
                        @Override public void onFailure(Call<Void> call, Throwable t) { }
                    }))
                    .setNegativeButton("Cancelar", null).show();
            return true;
        });
        return vista;
    }

    private void subirFoto(Uri uri) {
        File temporal = copiarAArchivoTemporal(uri);
        if (temporal == null) { Toast.makeText(this, "No se pudo leer la imagen.", Toast.LENGTH_SHORT).show(); return; }
        Toast.makeText(this, "Subiendo foto…", Toast.LENGTH_SHORT).show();
        CargaImagenCloudinary.firmarYSubir(this, temporal, new CargaImagenCloudinary.Resultado() {
            @Override public void completo(String url, String identificadorPublico) {
                ClienteApi.crear(ActividadReceta.this)
                        .guardarImagen(new SolicitudImagen(receta.id, url, identificadorPublico))
                        .enqueue(new Callback<Imagen>() {
                            @Override public void onResponse(Call<Imagen> call, Response<Imagen> response) { cargarFotos(); }
                            @Override public void onFailure(Call<Imagen> call, Throwable t) { }
                        });
            }
            @Override public void error(String mensaje) { runOnUiThread(() -> Toast.makeText(ActividadReceta.this, mensaje, Toast.LENGTH_SHORT).show()); }
        });
    }

    private File copiarAArchivoTemporal(Uri uri) {
        try (InputStream entrada = getContentResolver().openInputStream(uri)) {
            if (entrada == null) return null;
            File archivo = File.createTempFile("cookly_foto", ".jpg", getCacheDir());
            try (FileOutputStream salida = new FileOutputStream(archivo)) {
                byte[] buffer = new byte[8192];
                int leidos;
                while ((leidos = entrada.read(buffer)) != -1) salida.write(buffer, 0, leidos);
            }
            return archivo;
        } catch (Exception e) { return null; }
    }

    // ----------------------------- Reseñas -----------------------------

    private void construirSeccionResenas() {
        LinearLayout encabezado = new LinearLayout(this);
        encabezado.setGravity(Gravity.CENTER_VERTICAL);
        TextView titulo = texto("Reseñas", 21, 0xff241B18, true);
        encabezado.addView(titulo, new LinearLayout.LayoutParams(0, -2, 1));
        Button calificar = new Button(this);
        calificar.setText("Calificar");
        calificar.setTextSize(12);
        calificar.setOnClickListener(v -> dialogoResena());
        encabezado.addView(calificar);
        contenido.addView(encabezado);

        resenasVista = new LinearLayout(this);
        resenasVista.setOrientation(LinearLayout.VERTICAL);
        contenido.addView(resenasVista);
        cargarResenas();
    }

    private void cargarResenas() {
        ClienteApi.crear(this).listarResenas(receta.id).enqueue(new Callback<RespuestaResenas>() {
            @Override public void onResponse(Call<RespuestaResenas> call, Response<RespuestaResenas> respuesta) {
                resenasVista.removeAllViews();
                if (respuesta.body() == null || respuesta.body().resenas.isEmpty()) {
                    resenasVista.addView(texto("Aún no hay reseñas.", 14, 0xff786D67, false));
                    return;
                }
                String promedio = String.format(Locale.getDefault(), "%.1f", respuesta.body().promedio);
                resenasVista.addView(texto("⭐  " + promedio + " de 5  ·  " + respuesta.body().resenas.size() + " reseñas", 15, 0xff241B18, true));
                for (Resena resena : respuesta.body().resenas) {
                    String autor = resena.usuario != null ? resena.usuario.nombre : "Usuario";
                    resenasVista.addView(texto("⭐".repeat(Math.max(1, resena.puntuacion)) + "  " + autor
                            + (resena.comentario != null && !resena.comentario.isEmpty() ? "\n" + resena.comentario : ""), 14, 0xff241B18, false));
                }
            }
            @Override public void onFailure(Call<RespuestaResenas> call, Throwable t) { }
        });
    }

    private void dialogoResena() {
        LinearLayout caja = new LinearLayout(this);
        caja.setOrientation(LinearLayout.VERTICAL);
        caja.setPadding(24, 12, 24, 0);
        RatingBar estrellas = new RatingBar(this);
        estrellas.setNumStars(5);
        estrellas.setStepSize(1);
        estrellas.setRating(5);
        EditText comentario = new EditText(this);
        comentario.setHint("Cuéntanos qué te pareció (opcional)");
        caja.addView(estrellas);
        caja.addView(comentario);
        new AlertDialog.Builder(this).setTitle("Califica esta receta").setView(caja)
                .setPositiveButton("Guardar", (d, w) -> {
                    int puntuacion = Math.round(estrellas.getRating());
                    ClienteApi.crear(this).guardarResena(receta.id, new SolicitudResena(puntuacion, comentario.getText().toString().trim()))
                            .enqueue(new Callback<Resena>() {
                                @Override public void onResponse(Call<Resena> call, Response<Resena> response) { cargarResenas(); }
                                @Override public void onFailure(Call<Resena> call, Throwable t) {
                                    Toast.makeText(ActividadReceta.this, "No se pudo guardar tu reseña.", Toast.LENGTH_SHORT).show();
                                }
                            });
                })
                .setNegativeButton("Cancelar", null).show();
    }

    // ----------------------------- Comentarios -----------------------------

    private void construirSeccionComentarios() {
        contenido.addView(texto("Comentarios", 21, 0xff241B18, true));
        LinearLayout entrada = new LinearLayout(this);
        entrada.setGravity(Gravity.CENTER_VERTICAL);
        EditText campo = new EditText(this);
        campo.setHint("Escribe un comentario…");
        entrada.addView(campo, new LinearLayout.LayoutParams(0, -2, 1));
        Button enviar = new Button(this);
        enviar.setText("Enviar");
        enviar.setOnClickListener(v -> {
            String texto = campo.getText().toString().trim();
            if (texto.isEmpty()) return;
            ClienteApi.crear(this).crearComentario(receta.id, new SolicitudComentario(texto)).enqueue(new Callback<Comentario>() {
                @Override public void onResponse(Call<Comentario> call, Response<Comentario> response) {
                    campo.setText("");
                    cargarComentarios();
                }
                @Override public void onFailure(Call<Comentario> call, Throwable t) {
                    Toast.makeText(ActividadReceta.this, "No se pudo publicar el comentario.", Toast.LENGTH_SHORT).show();
                }
            });
        });
        entrada.addView(enviar);
        contenido.addView(entrada);

        comentariosVista = new LinearLayout(this);
        comentariosVista.setOrientation(LinearLayout.VERTICAL);
        contenido.addView(comentariosVista);
        cargarComentarios();
    }

    private void cargarComentarios() {
        ClienteApi.crear(this).listarComentarios(receta.id).enqueue(new Callback<List<Comentario>>() {
            @Override public void onResponse(Call<List<Comentario>> call, Response<List<Comentario>> respuesta) {
                comentariosVista.removeAllViews();
                if (respuesta.body() == null || respuesta.body().isEmpty()) {
                    comentariosVista.addView(texto("Sé el primero en comentar.", 14, 0xff786D67, false));
                    return;
                }
                boolean puedeModerar = new AlmacenToken(ActividadReceta.this).esModeradorOAdmin();
                for (Comentario comentario : respuesta.body()) comentariosVista.addView(filaComentario(comentario, puedeModerar));
            }
            @Override public void onFailure(Call<List<Comentario>> call, Throwable t) { }
        });
    }

    private LinearLayout filaComentario(Comentario comentario, boolean puedeModerar) {
        LinearLayout fila = new LinearLayout(this);
        fila.setOrientation(LinearLayout.VERTICAL);
        fila.setPadding(0, 8, 0, 8);
        String autor = comentario.usuario != null ? comentario.usuario.nombre : "Usuario";
        LinearLayout encabezado = new LinearLayout(this);
        encabezado.setGravity(Gravity.CENTER_VERTICAL);
        encabezado.addView(texto(autor, 14, 0xff241B18, true), new LinearLayout.LayoutParams(0, -2, 1));
        if (puedeModerar) {
            Button eliminar = new Button(this);
            eliminar.setText("Eliminar");
            eliminar.setTextSize(10);
            eliminar.setOnClickListener(v -> ClienteApi.crear(this).eliminarComentario(receta.id, comentario.id).enqueue(new Callback<Void>() {
                @Override public void onResponse(Call<Void> call, Response<Void> response) { cargarComentarios(); }
                @Override public void onFailure(Call<Void> call, Throwable t) { }
            }));
            encabezado.addView(eliminar);
        }
        fila.addView(encabezado);
        fila.addView(texto(comentario.contenido, 14, 0xff241B18, false));
        return fila;
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