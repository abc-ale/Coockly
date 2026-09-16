package com.cookly.servicios;

import com.cookly.modelos.*;
import com.cookly.repositorios.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ServicioCatalogos {
    private final RepositorioEtiqueta etiquetas;
    private final RepositorioRestriccionAlimentaria restricciones;
    private final RepositorioAlergia alergias;
    private final RepositorioUsuarioRestriccion usuarioRestricciones;
    private final RepositorioUsuarioAlergia usuarioAlergias;
    private final RepositorioUsuario usuarios;

    public ServicioCatalogos(RepositorioEtiqueta etiquetas, RepositorioRestriccionAlimentaria restricciones,
                              RepositorioAlergia alergias, RepositorioUsuarioRestriccion usuarioRestricciones,
                              RepositorioUsuarioAlergia usuarioAlergias, RepositorioUsuario usuarios) {
        this.etiquetas = etiquetas; this.restricciones = restricciones; this.alergias = alergias;
        this.usuarioRestricciones = usuarioRestricciones; this.usuarioAlergias = usuarioAlergias; this.usuarios = usuarios;
    }

    @Transactional(readOnly = true) public List<Etiqueta> etiquetas() { return etiquetas.findAll(); }
    @Transactional(readOnly = true) public List<RestriccionAlimentaria> restricciones() { return restricciones.findAll(); }
    @Transactional(readOnly = true) public List<Alergia> alergias() { return alergias.findAll(); }

    @Transactional
    public void actualizarMisRestricciones(String correo, List<Long> ids) {
        var usuario = usuarios.findByCorreo(correo).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        usuarioRestricciones.deleteByUsuarioId(usuario.getId());
        for (Long id : ids) {
            var r = restricciones.findById(id).orElseThrow(() -> new IllegalArgumentException("Restricción no encontrada: " + id));
            usuarioRestricciones.save(new UsuarioRestriccion(usuario, r));
        }
    }

    @Transactional
    public void actualizarMisAlergias(String correo, List<Long> ids) {
        var usuario = usuarios.findByCorreo(correo).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        usuarioAlergias.deleteByUsuarioId(usuario.getId());
        for (Long id : ids) {
            var a = alergias.findById(id).orElseThrow(() -> new IllegalArgumentException("Alergia no encontrada: " + id));
            usuarioAlergias.save(new UsuarioAlergia(usuario, a));
        }
    }

    @Transactional(readOnly = true)
    public List<UsuarioRestriccion> misRestricciones(String correo) {
        var usuario = usuarios.findByCorreo(correo).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        return usuarioRestricciones.findByUsuarioId(usuario.getId());
    }

    @Transactional(readOnly = true)
    public List<UsuarioAlergia> misAlergias(String correo) {
        var usuario = usuarios.findByCorreo(correo).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        return usuarioAlergias.findByUsuarioId(usuario.getId());
    }
}
