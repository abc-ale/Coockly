package com.cookly.servicios;

import com.cookly.dto.*;
import com.cookly.modelos.*;
import com.cookly.repositorios.*;
import com.cookly.seguridad.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioAutenticacion {
    private final RepositorioUsuario usuarios;
    private final PasswordEncoder codificador;
    private final ServicioToken token;

    public ServicioAutenticacion(RepositorioUsuario u, PasswordEncoder c, ServicioToken t) {
        usuarios = u;
        codificador = c;
        token = t;
    }

    @Transactional
    public RespuestaAcceso registrar(SolicitudRegistro s) {
        if (usuarios.existsByCorreo(s.correo().toLowerCase()))
            throw new IllegalArgumentException("El correo ya está registrado");
        var u = new Usuario();
        u.setNombre(s.nombre());
        u.setCorreo(s.correo().toLowerCase());
        u.setContrasena(codificador.encode(s.contrasena()));
        usuarios.save(u);
        return respuesta(u);
    }

    public RespuestaAcceso acceder(SolicitudAcceso s) {
        var u = usuarios.findByCorreo(s.correo().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Credenciales inválidas"));
        if (!u.isActivo() || !codificador.matches(s.contrasena(), u.getContrasena()))
            throw new IllegalArgumentException("Credenciales inválidas");
        return respuesta(u);
    }

    @Transactional
    public void cambiarMiContrasena(String correo, String contrasenaActual, String contrasenaNueva) {
        var u = usuarios.findByCorreo(correo.toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        if (!codificador.matches(contrasenaActual, u.getContrasena()))
            throw new IllegalArgumentException("La contraseña actual no es correcta");
        u.setContrasena(codificador.encode(contrasenaNueva));
        usuarios.save(u);
    }

    @Transactional
    public void restablecerContrasena(String correo, String nuevaContrasena) {
        var u = usuarios.findByCorreo(correo.toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        u.setContrasena(codificador.encode(nuevaContrasena));
        usuarios.save(u);
    }

    @Transactional
    public RespuestaAcceso accederOCrearPorSocial(String correo, String nombre) {
        var u = usuarios.findByCorreo(correo.toLowerCase()).orElseGet(() -> {
            var nuevo = new Usuario();
            nuevo.setCorreo(correo.toLowerCase());
            nuevo.setNombre(nombre != null && !nombre.isBlank() ? nombre : correo);
            nuevo.setContrasena(codificador.encode(java.util.UUID.randomUUID().toString()));
            usuarios.save(nuevo);
            return nuevo;
        });
        if (!u.isActivo()) throw new IllegalArgumentException("Cuenta desactivada");
        return respuesta(u);
    }

    private RespuestaAcceso respuesta(Usuario u) {
        return new RespuestaAcceso(token.crear(u.getCorreo(), u.getRol().name()), u.getNombre(), u.getRol().name(), u.getCorreo());
    }
}