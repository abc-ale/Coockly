package com.cookly.servicios;

import com.cookly.modelos.HistorialReceta;
import com.cookly.repositorios.RepositorioHistorialReceta;
import com.cookly.repositorios.RepositorioReceta;
import com.cookly.repositorios.RepositorioUsuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ServicioHistorial {
    private final RepositorioHistorialReceta historial;
    private final RepositorioReceta recetas;
    private final RepositorioUsuario usuarios;

    public ServicioHistorial(RepositorioHistorialReceta historial, RepositorioReceta recetas, RepositorioUsuario usuarios) {
        this.historial = historial; this.recetas = recetas; this.usuarios = usuarios;
    }

    @Transactional
    public void registrar(String correo, Long recetaId) {
        var usuario = usuarios.findByCorreo(correo).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        var receta = recetas.findById(recetaId).orElseThrow(() -> new IllegalArgumentException("Receta no encontrada"));
        historial.save(new HistorialReceta(usuario, receta));
    }

    @Transactional(readOnly = true)
    public List<HistorialReceta> ultimasVistas(String correo) {
        var usuario = usuarios.findByCorreo(correo).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        return historial.findTop50ByUsuarioIdOrderByVistoEnDesc(usuario.getId());
    }
}
