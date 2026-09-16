package com.cookly.actividades;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.cookly.asistentes.AsistenteVoz;
import com.cookly.asistentes.ChatbotCocina;
import com.cookly.asistentes.InterfazProveedorAsistente;

public class ActividadAsistente extends AppCompatActivity {

    private static final int SOLICITUD_PERMISO_AUDIO = 41;

    private LinearLayout mensajes;
    private EditText entrada;
    private ChatbotCocina chatbot;
    private AsistenteVoz voz;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);

        boolean modoVoz = getIntent().getBooleanExtra("modoVoz", false);

        LinearLayout raiz = new LinearLayout(this);
        raiz.setOrientation(LinearLayout.VERTICAL);
        raiz.setPadding(18, 22, 18, 16);
        raiz.setBackgroundColor(Color.rgb(255, 248, 243));

        TextView volver = texto(
                "‹  Volver",
                16,
                Color.rgb(214, 90, 49),
                true
        );

        volver.setOnClickListener(v -> finish());
        raiz.addView(volver);

        TextView titulo = texto(
                modoVoz ? "Asistente de voz 🎙" : "Chat de cocina 💬",
                28,
                Color.rgb(36, 27, 24),
                true
        );

        raiz.addView(titulo);

        TextView ayuda = texto(
                "Pregunta por cantidades, sustituciones o pasos.",
                15,
                Color.rgb(120, 109, 103),
                false
        );

        raiz.addView(ayuda);

        ScrollView scroll = new ScrollView(this);

        mensajes = new LinearLayout(this);
        mensajes.setOrientation(LinearLayout.VERTICAL);

        scroll.addView(mensajes);

        LinearLayout.LayoutParams parametrosScroll =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        0,
                        1
                );

        raiz.addView(scroll, parametrosScroll);

        LinearLayout controles = new LinearLayout(this);
        controles.setGravity(Gravity.CENTER_VERTICAL);

        entrada = new EditText(this);
        entrada.setHint("Escribe tu pregunta");
        entrada.setSingleLine(false);
        entrada.setMaxLines(3);

        LinearLayout.LayoutParams parametrosEntrada =
                new LinearLayout.LayoutParams(
                        0,
                        58,
                        1
                );

        controles.addView(entrada, parametrosEntrada);

        Button enviar = new Button(this);
        enviar.setText("Enviar");
        controles.addView(enviar);

        Button hablar = new Button(this);
        hablar.setText("🎙");

        LinearLayout.LayoutParams parametrosMicrofono =
                new LinearLayout.LayoutParams(
                        58,
                        58
                );

        controles.addView(hablar, parametrosMicrofono);
        raiz.addView(controles);

        setContentView(raiz);

        chatbot = new ChatbotCocina();

        voz = new AsistenteVoz(this, new AsistenteVoz.Listener() {

            @Override
            public void textoReconocido(String texto) {
                entrada.setText(texto);
                entrada.setSelection(entrada.length());
                enviarPregunta(texto);
            }

            @Override
            public void error(String mensaje) {
                agregarMensaje(mensaje, false);
            }
        });

        enviar.setOnClickListener(v ->
                enviarPregunta(entrada.getText().toString())
        );

        hablar.setOnClickListener(v ->
                escucharConPermiso()
        );

        if (modoVoz) {
            agregarMensaje(
                    "Pulsa el micrófono y dime qué necesitas.",
                    false
            );
        }
    }

    private void escucharConPermiso() {

        if (voz == null) {
            return;
        }

        boolean permisoConcedido =
                ContextCompat.checkSelfPermission(
                        this,
                        Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED;

        if (!permisoConcedido) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{
                            Manifest.permission.RECORD_AUDIO
                    },
                    SOLICITUD_PERMISO_AUDIO
            );
        } else {
            voz.escuchar();
        }
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            String[] permisos,
            int[] resultados
    ) {
        super.onRequestPermissionsResult(
                requestCode,
                permisos,
                resultados
        );

        if (requestCode == SOLICITUD_PERMISO_AUDIO
                && resultados != null
                && resultados.length > 0
                && resultados[0] == PackageManager.PERMISSION_GRANTED
                && voz != null) {

            voz.escuchar();
        }
    }

    private void enviarPregunta(String pregunta) {

        if (pregunta == null || pregunta.trim().isEmpty()) {
            return;
        }

        agregarMensaje(pregunta.trim(), true);
        entrada.setText("");

        if (chatbot == null) {
            agregarMensaje(
                    "El chatbot todavía no está disponible.",
                    false
            );
            return;
        }

        chatbot.responder(
                pregunta.trim(),
                new InterfazProveedorAsistente.Resultado() {

                    @Override
                    public void completar(String respuesta) {
                        agregarMensaje(respuesta, false);

                        if (voz != null) {
                            voz.hablar(respuesta);
                        }
                    }

                    @Override
                    public void error(String mensaje) {
                        agregarMensaje(mensaje, false);
                    }
                }
        );
    }

    private void agregarMensaje(
            String mensaje,
            boolean usuario
    ) {
        if (mensajes == null) {
            return;
        }

        TextView burbuja = texto(
                mensaje,
                15,
                usuario
                        ? Color.WHITE
                        : Color.rgb(36, 27, 24),
                false
        );

        burbuja.setPadding(16, 14, 16, 14);

        burbuja.setGravity(
                usuario
                        ? Gravity.END
                        : Gravity.START
        );

        burbuja.setBackgroundColor(
                usuario
                        ? Color.rgb(214, 90, 49)
                        : Color.WHITE
        );

        LinearLayout.LayoutParams parametros =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );

        parametros.setMargins(0, 7, 0, 7);

        mensajes.addView(burbuja, parametros);
    }

    private TextView texto(
            String valor,
            int tamano,
            int color,
            boolean negrita
    ) {
        TextView vista = new TextView(this);

        vista.setText(valor);
        vista.setTextSize(tamano);
        vista.setTextColor(color);

        if (negrita) {
            vista.setTypeface(null, android.graphics.Typeface.BOLD);
        }

        vista.setPadding(0, 10, 0, 10);

        return vista;
    }

    @Override
    protected void onDestroy() {

        if (voz != null) {
            voz.liberar();
            voz = null;
        }

        super.onDestroy();
    }
}