package com.cookly.actividades;

import android.graphics.Color;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.cookly.asistentes.*;

public class ActividadAsistente extends AppCompatActivity {
    private LinearLayout mensajes;
    private EditText entrada;
    private ChatbotCocina chatbot;
    private AsistenteVoz voz;

    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        boolean modoVoz = getIntent().getBooleanExtra("modoVoz", false);
        LinearLayout raiz = new LinearLayout(this);
        raiz.setOrientation(LinearLayout.VERTICAL);
        raiz.setPadding(18, 22, 18, 16);
        raiz.setBackgroundColor(0xfffff8f3);
        TextView volver = texto("‹  Volver", 16, 0xffD65A31, true);
        volver.setOnClickListener(v -> finish());
        raiz.addView(volver);
        TextView titulo = texto(modoVoz ? "Asistente de voz 🎙" : "Chat de cocina 💬", 28, 0xff241B18, true);
        raiz.addView(titulo);
        TextView ayuda = texto("Pregunta por cantidades, sustituciones o pasos.", 15, 0xff786D67, false);
        raiz.addView(ayuda);
        ScrollView scroll = new ScrollView(this);
        mensajes = new LinearLayout(this);
        mensajes.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(mensajes);
        raiz.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        LinearLayout controles = new LinearLayout(this);
        entrada = new EditText(this);
        entrada.setHint("Escribe tu pregunta");
        controles.addView(entrada, new LinearLayout.LayoutParams(0, 58, 1));
        Button enviar = new Button(this);
        enviar.setText("Enviar");
        controles.addView(enviar);
        Button hablar = new Button(this);
        hablar.setText("🎙");
        controles.addView(hablar, new LinearLayout.LayoutParams(58, 58));
        raiz.addView(controles);
        setContentView(raiz);

        chatbot = new ChatbotCocina();
        voz = new AsistenteVoz(this, new AsistenteVoz.Listener() {
            @Override public void textoReconocido(String texto) { entrada.setText(texto); enviarPregunta(texto); }
            @Override public void error(String mensaje) { agregarMensaje(mensaje, false); }
        });
        enviar.setOnClickListener(v -> enviarPregunta(entrada.getText().toString()));
        hablar.setOnClickListener(v -> escucharConPermiso());
        if (modoVoz) agregarMensaje("Pulsa el micrófono y dime qué necesitas.", false);
    }

    private void escucharConPermiso() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, 41);
        } else voz.escuchar();
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permisos, int[] resultados) {
        super.onRequestPermissionsResult(requestCode, permisos, resultados);
        if (requestCode == 41 && resultados.length > 0 && resultados[0] == PackageManager.PERMISSION_GRANTED) voz.escuchar();
    }

    private void enviarPregunta(String pregunta) {
        if (pregunta == null || pregunta.trim().isEmpty()) return;
        agregarMensaje(pregunta, true);
        entrada.setText("");
        chatbot.responder(pregunta, new InterfazProveedorAsistente.Resultado() {
            @Override public void completar(String respuesta) { agregarMensaje(respuesta, false); voz.hablar(respuesta); }
            @Override public void error(String mensaje) { agregarMensaje(mensaje, false); }
        });
    }

    private void agregarMensaje(String mensaje, boolean usuario) {
        TextView burbuja = texto(mensaje, 15, usuario ? Color.WHITE : 0xff241B18, false);
        burbuja.setPadding(16, 14, 16, 14);
        burbuja.setGravity(usuario ? Gravity.END : Gravity.START);
        burbuja.setBackgroundColor(usuario ? 0xffD65A31 : 0xffffffff);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.setMargins(0, 7, 0, 7);
        mensajes.addView(burbuja, p);
    }

    private TextView texto(String valor, int size, int color, boolean negrita) {
        TextView t = new TextView(this);
        t.setText(valor); t.setTextSize(size); t.setTextColor(color);
        if (negrita) t.setTypeface(null, 1);
        t.setPadding(0, 10, 0, 10);
        return t;
    }

    @Override protected void onDestroy() {
        if (voz != null) voz.liberar();
        super.onDestroy();
    }
}