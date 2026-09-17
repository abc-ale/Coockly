package com.cookly.almacenamiento;

import android.content.*;
import androidx.security.crypto.*;
import java.io.IOException;
import java.security.GeneralSecurityException;

public class AlmacenToken {
    private final SharedPreferences preferencias;

    public AlmacenToken(Context c) {
        try {
            MasterKey llave = new MasterKey.Builder(c).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build();
            preferencias = EncryptedSharedPreferences.create(c, "sesion_segura", llave,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM);
        } catch (GeneralSecurityException | IOException e) {
            throw new IllegalStateException(e);
        }
    }

    public void guardar(String token) { preferencias.edit().putString("token", token).apply(); }
    public String obtener() { return preferencias.getString("token", null); }
    public void guardarRol(String rol) { preferencias.edit().putString("rol", rol).apply(); }
    public String obtenerRol() { return preferencias.getString("rol", "USUARIO"); }
    public void borrar() { preferencias.edit().clear().apply(); }

    public boolean esModeradorOAdmin() {
        String rol = obtenerRol();
        return "MODERADOR".equals(rol) || "ADMINISTRADOR".equals(rol);
    }
}