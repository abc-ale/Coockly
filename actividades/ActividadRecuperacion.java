package com.cookly.actividades;

import android.os.Bundle;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.R;
import com.cookly.modelos.SolicitudRecuperacion;
import com.cookly.servicios.ClienteApi;
import com.cookly.utilidades.ValidadorEntrada;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import java.util.Map;

public class ActividadRecuperacion extends AppCompatActivity {
    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        setContentView(R.layout.actividad_recuperacion);
        EditText correo = findViewById(R.id.correoRecuperacion);
        findViewById(R.id.botonVolver).setOnClickListener(v -> finish());
        findViewById(R.id.botonEnviarRecuperacion).setOnClickListener(v -> {
            String valor = correo.getText().toString().trim();
            if (!ValidadorEntrada.correoValido(valor)) {
                correo.setError("Escribe un correo válido");
                return;
            }
            ClienteApi.crear(this).solicitarRecuperacion(new SolicitudRecuperacion(valor))
                    .enqueue(new Callback<Map<String, String>>() {
                        @Override public void onResponse(Call<Map<String, String>> call, Response<Map<String, String>> response) {
                            Toast.makeText(ActividadRecuperacion.this,
                                    "Si la cuenta existe, recibirás el correo de recuperación.",
                                    Toast.LENGTH_LONG).show();
                        }
                        @Override public void onFailure(Call<Map<String, String>> call, Throwable t) {
                            Toast.makeText(ActividadRecuperacion.this, "No se pudo enviar. Inténtalo de nuevo.", Toast.LENGTH_SHORT).show();
                        }
                    });
        });
    }
}