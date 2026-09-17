package com.cookly.actividades;

import android.os.Bundle;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.modelos.SolicitudCambioRol;
import com.cookly.servicios.ClienteApi;
import java.util.Map;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * No hay endpoint para LISTAR usuarios todavía (solo cambiar rol/activo por id),
 * así que por ahora se opera buscando por ID. Si más adelante agregas un
 * GET /administracion/usuarios, esta pantalla se puede convertir en una lista.
 */
public class ActividadAdministracion extends AppCompatActivity {
    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(28, 36, 28, 24);
        l.setBackgroundColor(0xfffff8f3);

        TextView volver = texto("‹  Volver", 16, 0xffD65A31, true);
        volver.setOnClickListener(v -> finish());
        l.addView(volver);
        l.addView(texto("Administración de usuarios", 22, 0xff241B18, true));

        EditText idUsuario = new EditText(this);
        idUsuario.setHint("ID del usuario");
        idUsuario.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        l.addView(idUsuario);

        l.addView(texto("Cambiar rol a:", 15, 0xff786D67, false));
        LinearLayout botonesRol = new LinearLayout(this);
        Button usuario = botonRol("USUARIO", idUsuario);
        Button moderador = botonRol("MODERADOR", idUsuario);
        Button admin = botonRol("ADMINISTRADOR", idUsuario);
        botonesRol.addView(usuario); botonesRol.addView(moderador); botonesRol.addView(admin);
        l.addView(botonesRol);

        Button activar = new Button(this);
        activar.setText("Activar cuenta");
        activar.setOnClickListener(v -> cambiarActivo(idUsuario, true));
        Button desactivar = new Button(this);
        desactivar.setText("Desactivar cuenta (bloquear)");
        desactivar.setOnClickListener(v -> cambiarActivo(idUsuario, false));
        l.addView(activar); l.addView(desactivar);

        setContentView(l);
    }

    private Button botonRol(String rol, EditText idUsuario) {
        Button b = new Button(this);
        b.setText(rol);
        b.setOnClickListener(v -> {
            Long id = leerId(idUsuario);
            if (id == null) return;
            ClienteApi.crear(this).cambiarRolUsuario(id, new SolicitudCambioRol(rol)).enqueue(respuesta());
        });
        return b;
    }

    private void cambiarActivo(EditText idUsuario, boolean valor) {
        Long id = leerId(idUsuario);
        if (id == null) return;
        ClienteApi.crear(this).cambiarActivoUsuario(id, valor).enqueue(respuesta());
    }

    private Long leerId(EditText campo) {
        String texto = campo.getText().toString().trim();
        if (texto.isEmpty()) { Toast.makeText(this, "Ingresa el ID del usuario", Toast.LENGTH_SHORT).show(); return null; }
        try { return Long.parseLong(texto); }
        catch (NumberFormatException e) { Toast.makeText(this, "ID inválido", Toast.LENGTH_SHORT).show(); return null; }
    }

    private Callback<Map<String, String>> respuesta() {
        return new Callback<Map<String, String>>() {
            @Override public void onResponse(Call<Map<String, String>> c, Response<Map<String, String>> r) {
                Toast.makeText(ActividadAdministracion.this, r.isSuccessful() ? "Actualizado" : "No se pudo actualizar", Toast.LENGTH_SHORT).show();
            }
            @Override public void onFailure(Call<Map<String, String>> c, Throwable t) {
                Toast.makeText(ActividadAdministracion.this, "No se pudo conectar", Toast.LENGTH_SHORT).show();
            }
        };
    }

    private TextView texto(String v, int s, int col, boolean b) {
        TextView t = new TextView(this); t.setText(v); t.setTextSize(s); t.setTextColor(col);
        if (b) t.setTypeface(null, 1); t.setPadding(0, 14, 0, 14); return t;
    }
}