package com.cookly.servicios;

import com.cookly.modelos.Rol;
import com.cookly.modelos.Usuario;
import com.cookly.repositorios.RepositorioUsuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioAdministracion {
    private final RepositorioUsuario usuarios;
    public ServicioAdministracion(RepositorioUsuario usuarios) { this.usuarios = usuarios; }

    @Transactional
    public Usuario cambiarRol(Long usuarioId, Rol nuevoRol) {
        var u = usuarios.findById(usuarioId).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        u.setRol(nuevoRol);
        return usuarios.save(u);
    }

    @Transactional
    public Usuario cambiarActivo(Long usuarioId, boolean activo) {
        var u = usuarios.findById(usuarioId).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        u.setActivo(activo);
        return usuarios.save(u);
    }
}
