package com.cookly.actividades;

import android.os.Bundle;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.modelos.SolicitudCambioContrasenaPropia;
import com.cookly.servicios.ClienteApi;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ActividadCambiarContrasena extends AppCompatActivity {
    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(28, 36, 28, 24);
        l.setBackgroundColor(0xfffff8f3);

        TextView volver = texto("‹  Volver", 16, 0xffD65A31, true);
        volver.setOnClickListener(v -> finish());
        TextView titulo = texto("Cambiar contraseña", 24, 0xff241B18, true);

        EditText actual = campo("Contraseña actual");
        EditText nueva = campo("Contraseña nueva (mínimo 10 caracteres)");

        Button guardar = new Button(this);
        guardar.setText("Guardar");
        guardar.setOnClickListener(v -> {
            String pActual = actual.getText().toString();
            String pNueva = nueva.getText().toString();
            if (pActual.isEmpty() || pNueva.length() < 10) {
                Toast.makeText(this, "La nueva contraseña debe tener al menos 10 caracteres", Toast.LENGTH_SHORT).show();
                return;
            }
            ClienteApi.crear(this).cambiarMiContrasena(new SolicitudCambioContrasenaPropia(pActual, pNueva))
                    .enqueue(new Callback<Map<String, String>>() {
                        @Override public void onResponse(Call<Map<String, String>> c, Response<Map<String, String>> r) {
                            if (r.isSuccessful()) { Toast.makeText(ActividadCambiarContrasena.this, "Contraseña actualizada", Toast.LENGTH_SHORT).show(); finish(); }
                            else Toast.makeText(ActividadCambiarContrasena.this, "La contraseña actual no es correcta", Toast.LENGTH_SHORT).show();
                        }
                        @Override public void onFailure(Call<Map<String, String>> c, Throwable t) {
                            Toast.makeText(ActividadCambiarContrasena.this, "No se pudo conectar", Toast.LENGTH_SHORT).show();
                        }
                    });
        });

        l.addView(volver); l.addView(titulo); l.addView(actual); l.addView(nueva); l.addView(guardar);
        setContentView(l);
    }

    private TextView texto(String v, int s, int c, boolean b) {
        TextView t = new TextView(this); t.setText(v); t.setTextSize(s); t.setTextColor(c);
        if (b) t.setTypeface(null, 1); t.setPadding(0, 14, 0, 14); return t;
    }
    private EditText campo(String hint) {
        EditText e = new EditText(this); e.setHint(hint);
        e.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
        return e;
    }
}