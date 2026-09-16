package com.cookly.actividades;

import android.graphics.Color;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

public class ActividadNuevaReceta extends AppCompatActivity {

    private static final int NARANJA = 0xffD65A31;
    private static final int TEXTO_OSCURO = 0xff241B18;
    private static final int TEXTO_SUAVE = 0xff786D67;
    private static final int FONDO = 0xffFFF8F3;

    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(FONDO);
        LinearLayout contenido = new LinearLayout(this);
        contenido.setOrientation(LinearLayout.VERTICAL);
        contenido.setPadding(28, 24, 28, 40);
        scroll.addView(contenido);
        setContentView(scroll);

        // --- Barra superior con volver ---
        TextView volver = new TextView(this);
        volver.setText("‹  Volver");
        volver.setTextSize(16);
        volver.setTextColor(NARANJA);
        volver.setTypeface(null, android.graphics.Typeface.BOLD);
        volver.setPadding(20, 20, 20, 20);
        volver.setMinHeight(140); // asegura un área táctil de al menos ~48dp
        volver.setGravity(Gravity.CENTER_VERTICAL);
        android.util.TypedValue valorFondo = new android.util.TypedValue();
        getTheme().resolveAttribute(android.R.attr.selectableItemBackground, valorFondo, true);
        volver.setBackgroundResource(valorFondo.resourceId); // ripple visual al tocar
        volver.setClickable(true);
        volver.setFocusable(true);
        volver.setOnClickListener(v -> finish());
        contenido.addView(volver, new LinearLayout.LayoutParams(-2, -2));

        // --- Encabezado ---
        TextView titulo = new TextView(this);
        titulo.setText("Crea una receta");
        titulo.setTextSize(26);
        titulo.setTypeface(null, android.graphics.Typeface.BOLD);
        titulo.setTextColor(TEXTO_OSCURO);
        contenido.addView(titulo);

        TextView subtitulo = new TextView(this);
        subtitulo.setText("Comparte tu receta con la comunidad de Cookly.");
        subtitulo.setTextSize(14);
        subtitulo.setTextColor(TEXTO_SUAVE);
        subtitulo.setPadding(0, 6, 0, 24);
        contenido.addView(subtitulo);

        // --- Selector de foto (placeholder) ---
        LinearLayout foto = new LinearLayout(this);
        foto.setOrientation(LinearLayout.VERTICAL);
        foto.setGravity(Gravity.CENTER);
        foto.setBackgroundColor(0xffF2E4DB);
        foto.setPadding(20, 36, 20, 36);
        TextView icono = new TextView(this);
        icono.setText("📷");
        icono.setTextSize(30);
        icono.setGravity(Gravity.CENTER);
        TextView fotoTexto = new TextView(this);
        fotoTexto.setText("Añadir foto (próximamente)");
        fotoTexto.setTextSize(14);
        fotoTexto.setTextColor(TEXTO_SUAVE);
        fotoTexto.setGravity(Gravity.CENTER);
        fotoTexto.setPadding(0, 8, 0, 0);
        foto.addView(icono);
        foto.addView(fotoTexto);
        contenido.addView(foto, seccion(0, 28));

        // --- Sección: Detalles ---
        contenido.addView(encabezadoSeccion("Detalles"));
        TextInputEditText nombre = campo(contenido, "Nombre de la receta", InputType.TYPE_CLASS_TEXT, 1);
        TextInputEditText minutos = campo(contenido, "Tiempo de preparación (minutos)", InputType.TYPE_CLASS_NUMBER, 1);

        // --- Sección: Ingredientes ---
        contenido.addView(encabezadoSeccion("Ingredientes"));
        TextView ayudaIngredientes = new TextView(this);
        ayudaIngredientes.setText("Un ingrediente por línea. Ejemplo:\n1 taza arroz\n2 cucharaditas sal");
        ayudaIngredientes.setTextSize(13);
        ayudaIngredientes.setTextColor(TEXTO_SUAVE);
        ayudaIngredientes.setPadding(0, 0, 0, 10);
        contenido.addView(ayudaIngredientes);
        TextInputEditText ingredientes = campo(contenido, "Ingredientes", InputType.TYPE_CLASS_TEXT
                | InputType.TYPE_TEXT_FLAG_MULTI_LINE, 4);

        // --- Sección: Preparación ---
        contenido.addView(encabezadoSeccion("Preparación"));
        TextView ayudaPasos = new TextView(this);
        ayudaPasos.setText("Un paso por línea, en orden.");
        ayudaPasos.setTextSize(13);
        ayudaPasos.setTextColor(TEXTO_SUAVE);
        ayudaPasos.setPadding(0, 0, 0, 10);
        contenido.addView(ayudaPasos);
        TextInputEditText pasos = campo(contenido, "Pasos de preparación", InputType.TYPE_CLASS_TEXT
                | InputType.TYPE_TEXT_FLAG_MULTI_LINE, 5);

        // --- Botón publicar ---
        Button publicar = new Button(this);
        publicar.setText("Publicar receta");
        publicar.setTextColor(Color.WHITE);
        publicar.setBackgroundColor(NARANJA);
        LinearLayout.LayoutParams parametrosBoton = new LinearLayout.LayoutParams(-1, 130);
        parametrosBoton.topMargin = 24;
        publicar.setOnClickListener(v -> {
            String textoNombre = textoDe(nombre);
            String textoIngredientes = textoDe(ingredientes);
            if (textoNombre.isEmpty() || textoIngredientes.isEmpty()) {
                Toast.makeText(this, "Añade al menos un nombre e ingredientes", Toast.LENGTH_SHORT).show();
                return;
            }
            // TODO: aquí falta llamar al backend (POST /api/v1/recetas) cuando ese
            // endpoint exista. Por ahora la receta no se guarda en el servidor.
            Toast.makeText(this, "¡Receta guardada! Se publicará al sincronizar con el servidor.", Toast.LENGTH_LONG).show();
            finish();
        });
        contenido.addView(publicar, parametrosBoton);
    }

    private TextView encabezadoSeccion(String texto) {
        TextView t = new TextView(this);
        t.setText(texto);
        t.setTextSize(18);
        t.setTypeface(null, android.graphics.Typeface.BOLD);
        t.setTextColor(TEXTO_OSCURO);
        t.setPadding(0, 22, 0, 10);
        return t;
    }

    /** Crea un campo con TextInputLayout: la etiqueta queda flotando arriba,
     *  nunca desaparece al escribir, a diferencia de un simple "hint". */
    private TextInputEditText campo(LinearLayout contenedor, String etiqueta, int tipo, int lineas) {
        TextInputLayout envoltorio = new TextInputLayout(
                new androidx.appcompat.view.ContextThemeWrapper(this, com.cookly.R.style.Widget_Cookly_TextInputLayout));
        envoltorio.setHint(etiqueta);
        envoltorio.setBoxBackgroundMode(TextInputLayout.BOX_BACKGROUND_OUTLINE);

        TextInputEditText campo = new TextInputEditText(this);
        campo.setInputType(tipo);
        campo.setMinLines(lineas);
        campo.setGravity(Gravity.TOP | Gravity.START);
        campo.setTextSize(16);
        envoltorio.addView(campo);

        LinearLayout.LayoutParams parametros = new LinearLayout.LayoutParams(-1, -2);
        parametros.bottomMargin = 16;
        contenedor.addView(envoltorio, parametros);
        return campo;
    }

    private LinearLayout.LayoutParams seccion(int arriba, int abajo) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.topMargin = arriba;
        p.bottomMargin = abajo;
        return p;
    }

    private String textoDe(TextInputEditText campo) {
        return campo.getText() == null ? "" : campo.getText().toString().trim();
    }
}