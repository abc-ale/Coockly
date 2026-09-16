package com.cookly.actividades;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.widget.EditText;
import androidx.appcompat.app.AppCompatActivity;
import com.cookly.R;
import com.cookly.fragmentos.FragmentoResultadosBusqueda;

/**
 * Barra de búsqueda + resultados en vivo. El texto se debate 350ms antes de
 * llamar al backend (evita una petición por cada tecla mientras el usuario escribe).
 */
public class ActividadBusqueda extends AppCompatActivity {
    private static final long DEMORA_DEBOUNCE_MS = 350;
    private final Handler manejador = new Handler(Looper.getMainLooper());
    private Runnable tareaPendiente;
    private FragmentoResultadosBusqueda fragmento;

    @Override protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        setContentView(R.layout.actividad_busqueda);

        findViewById(R.id.botonVolverBusqueda).setOnClickListener(v -> finish());

        fragmento = new FragmentoResultadosBusqueda();
        fragmento.setAlAbrirReceta(receta -> {
            Intent intent = new Intent(this, ActividadReceta.class);
            intent.putExtra("recetaId", receta.id);
            startActivity(intent);
        });
        getSupportFragmentManager().beginTransaction()
                .replace(R.id.contenedorResultadosBusqueda, fragmento)
                .commit();

        EditText campoBusqueda = findViewById(R.id.campoBusqueda);
        campoBusqueda.requestFocus();
        campoBusqueda.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int i, int i1, int i2) { }
            @Override public void onTextChanged(CharSequence texto, int i, int i1, int i2) {
                if (tareaPendiente != null) manejador.removeCallbacks(tareaPendiente);
                String consulta = texto.toString();
                tareaPendiente = () -> fragmento.buscar(consulta);
                manejador.postDelayed(tareaPendiente, DEMORA_DEBOUNCE_MS);
            }
            @Override public void afterTextChanged(Editable editable) { }
        });
    }

    @Override protected void onDestroy() {
        super.onDestroy();
        if (tareaPendiente != null) manejador.removeCallbacks(tareaPendiente);
    }
}