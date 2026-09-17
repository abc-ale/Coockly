package com.cookly.actividades;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.R;
import com.cookly.almacenamiento.AlmacenToken;
import com.cookly.modelos.RespuestaAcceso;
import com.cookly.modelos.SolicitudAcceso;
import com.cookly.modelos.SolicitudRegistro;
import com.cookly.servicios.ClienteApi;
import com.cookly.utilidades.ValidadorEntrada;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ActividadAcceso extends AppCompatActivity {
    private EditText nombre, correo, contrasena;
    private boolean modoRegistro;

    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        if (new AlmacenToken(this).obtener() != null) { abrirInicio(); return; }
        setContentView(R.layout.actividad_acceso);
        nombre = findViewById(R.id.nombre);
        correo = findViewById(R.id.correo);
        contrasena = findViewById(R.id.contrasena);
        findViewById(R.id.botonAcceso).setOnClickListener(v -> acceder());
        findViewById(R.id.botonRegistro).setOnClickListener(v -> cambiarModo());
        findViewById(R.id.botonRecuperar).setOnClickListener(v ->
                startActivity(new Intent(this, ActividadRecuperacion.class)));
    }

    private void acceder() {
        if (!validarBase()) return;
        ClienteApi.crear(this).acceder(new SolicitudAcceso(texto(correo), texto(contrasena)))
                .enqueue(respuesta("Credenciales inválidas"));
    }

    private void registrar() {
        if (texto(nombre).isEmpty() || !validarBase()) {
            Toast.makeText(this, "Completa tu nombre, correo y una contraseña de 10 caracteres.", Toast.LENGTH_LONG).show();
            return;
        }
        ClienteApi.crear(this).registrar(new SolicitudRegistro(texto(nombre), texto(correo), texto(contrasena)))
                .enqueue(respuesta("No se pudo crear la cuenta"));
    }

    private void cambiarModo() {
        modoRegistro = !modoRegistro;
        findViewById(R.id.contenedorNombre).setVisibility(modoRegistro ? View.VISIBLE : View.GONE);
        findViewById(R.id.botonRecuperar).setVisibility(modoRegistro ? View.GONE : View.VISIBLE);
        findViewById(R.id.botonAcceso).setVisibility(modoRegistro ? View.GONE : View.VISIBLE);
        TextView titulo = findViewById(R.id.titulo);
        TextView boton = findViewById(R.id.botonRegistro);
        titulo.setText(modoRegistro ? "Crea tu cocina" : getString(R.string.titulo_acceso));
        boton.setText(modoRegistro ? "Crear mi cuenta" : getString(R.string.registro));
        boton.setOnClickListener(v -> {
            if (modoRegistro) registrar(); else cambiarModo();
        });
    }

    private boolean validarBase() {
        if (!ValidadorEntrada.correoValido(texto(correo))) {
            correo.setError("Correo inválido");
            return false;
        }
        if (!ValidadorEntrada.contrasenaValida(texto(contrasena))) {
            contrasena.setError("Usa al menos 10 caracteres");
            return false;
        }
        return true;
    }

    private Callback<RespuestaAcceso> respuesta(String mensajeError) {
        return new Callback<RespuestaAcceso>() {
            @Override public void onResponse(Call<RespuestaAcceso> llamada, Response<RespuestaAcceso> respuesta) {
                if (respuesta.isSuccessful() && respuesta.body() != null) {
                    new AlmacenToken(ActividadAcceso.this).guardar(respuesta.body().token);
                    new AlmacenToken(ActividadAcceso.this).guardarRol(respuesta.body().rol);
                    abrirInicio();
                } else Toast.makeText(ActividadAcceso.this, mensajeError, Toast.LENGTH_SHORT).show();
            }
            @Override public void onFailure(Call<RespuestaAcceso> llamada, Throwable causa) {
                Toast.makeText(ActividadAcceso.this, "No se pudo conectar. Revisa tu internet.", Toast.LENGTH_SHORT).show();
            }
        };
    }

    private String texto(EditText campo) { return campo.getText().toString().trim(); }
    private void abrirInicio() { startActivity(new Intent(this, ActividadInicio.class)); finish(); }
}