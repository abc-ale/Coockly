package com.cookly.actividades;

import android.os.Bundle;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.modelos.*;
import com.cookly.servicios.ClienteApi;
import java.util.*;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/** Restricciones alimentarias y alergias del usuario, editables con checkboxes. */
public class ActividadPreferencias extends AppCompatActivity {
    private LinearLayout cajaRestricciones, cajaAlergias;
    private final Map<Long, CheckBox> checksRestricciones = new LinkedHashMap<>();
    private final Map<Long, CheckBox> checksAlergias = new LinkedHashMap<>();

    @Override public void onCreate(Bundle estado) {
        super.onCreate(estado);
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(0xfffff8f3);
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(28, 36, 28, 24);
        scroll.addView(l);
        setContentView(scroll);

        TextView volver = texto("‹  Volver", 16, 0xffD65A31, true);
        volver.setOnClickListener(v -> finish());
        l.addView(volver);
        l.addView(texto("Restricciones y alergias", 24, 0xff241B18, true));

        l.addView(texto("Restricciones alimentarias", 17, 0xff241B18, true));
        cajaRestricciones = new LinearLayout(this);
        cajaRestricciones.setOrientation(LinearLayout.VERTICAL);
        l.addView(cajaRestricciones);

        l.addView(texto("Alergias", 17, 0xff241B18, true));
        cajaAlergias = new LinearLayout(this);
        cajaAlergias.setOrientation(LinearLayout.VERTICAL);
        l.addView(cajaAlergias);

        Button guardar = new Button(this);
        guardar.setText("Guardar cambios");
        guardar.setOnClickListener(v -> guardar());
        l.addView(guardar);

        cargar();
    }

    private void cargar() {
        ClienteApi.crear(this).catalogos().enqueue(new Callback<RespuestaCatalogos>() {
            @Override public void onResponse(Call<RespuestaCatalogos> c, Response<RespuestaCatalogos> r) {
                if (r.body() == null) return;
                for (RestriccionAlimentaria res : r.body().restricciones) {
                    CheckBox cb = new CheckBox(ActividadPreferencias.this);
                    cb.setText(res.nombre);
                    cajaRestricciones.addView(cb);
                    checksRestricciones.put(res.id, cb);
                }
                for (Alergia a : r.body().alergias) {
                    CheckBox cb = new CheckBox(ActividadPreferencias.this);
                    cb.setText(a.nombre);
                    cajaAlergias.addView(cb);
                    checksAlergias.put(a.id, cb);
                }
                marcarActuales();
            }
            @Override public void onFailure(Call<RespuestaCatalogos> c, Throwable t) {
                Toast.makeText(ActividadPreferencias.this, "No se pudo cargar el catálogo", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void marcarActuales() {
        ClienteApi.crear(this).misRestricciones().enqueue(new Callback<List<UsuarioRestriccion>>() {
            @Override public void onResponse(Call<List<UsuarioRestriccion>> c, Response<List<UsuarioRestriccion>> r) {
                if (r.body() == null) return;
                for (UsuarioRestriccion ur : r.body()) {
                    CheckBox cb = checksRestricciones.get(ur.restriccion.id);
                    if (cb != null) cb.setChecked(true);
                }
            }
            @Override public void onFailure(Call<List<UsuarioRestriccion>> c, Throwable t) { }
        });
        ClienteApi.crear(this).misAlergias().enqueue(new Callback<List<UsuarioAlergia>>() {
            @Override public void onResponse(Call<List<UsuarioAlergia>> c, Response<List<UsuarioAlergia>> r) {
                if (r.body() == null) return;
                for (UsuarioAlergia ua : r.body()) {
                    CheckBox cb = checksAlergias.get(ua.alergia.id);
                    if (cb != null) cb.setChecked(true);
                }
            }
            @Override public void onFailure(Call<List<UsuarioAlergia>> c, Throwable t) { }
        });
    }

    private void guardar() {
        List<Long> idsRestricciones = new ArrayList<>();
        for (Map.Entry<Long, CheckBox> e : checksRestricciones.entrySet()) if (e.getValue().isChecked()) idsRestricciones.add(e.getKey());
        List<Long> idsAlergias = new ArrayList<>();
        for (Map.Entry<Long, CheckBox> e : checksAlergias.entrySet()) if (e.getValue().isChecked()) idsAlergias.add(e.getKey());

        ClienteApi.crear(this).actualizarMisRestricciones(new SolicitudIds(idsRestricciones)).enqueue(vacio());
        ClienteApi.crear(this).actualizarMisAlergias(new SolicitudIds(idsAlergias)).enqueue(vacio());
        Toast.makeText(this, "Preferencias guardadas", Toast.LENGTH_SHORT).show();
        finish();
    }

    private Callback<Void> vacio() {
        return new Callback<Void>() {
            @Override public void onResponse(Call<Void> c, Response<Void> r) { }
            @Override public void onFailure(Call<Void> c, Throwable t) { }
        };
    }

    private TextView texto(String v, int s, int col, boolean b) {
        TextView t = new TextView(this); t.setText(v); t.setTextSize(s); t.setTextColor(col);
        if (b) t.setTypeface(null, 1); t.setPadding(0, 14, 0, 14); return t;
    }
}
