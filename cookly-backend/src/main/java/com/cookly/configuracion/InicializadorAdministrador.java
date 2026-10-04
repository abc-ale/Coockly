package com.cookly.configuracion;

import com.cookly.modelos.Rol;
import com.cookly.modelos.Usuario;
import com.cookly.repositorios.RepositorioUsuario;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Crea la cuenta del administrador al arrancar, a partir de las variables de entorno
 * ADMIN_CORREO y ADMIN_CONTRASENA (y opcionalmente ADMIN_NOMBRE).
 *
 * - Si el correo no existe: crea la cuenta con rol ADMINISTRADOR.
 * - Si ya existe: solo le asegura el rol ADMINISTRADOR y que esté activa. NUNCA cambia su contraseña.
 * - Si las variables están vacías, no hace nada.
 */
@Component
public class InicializadorAdministrador implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(InicializadorAdministrador.class);

    private final RepositorioUsuario usuarios;
    private final PasswordEncoder codificador;
    private final String correo;
    private final String contrasena;
    private final String nombre;

    public InicializadorAdministrador(RepositorioUsuario usuarios, PasswordEncoder codificador,
                                      @Value("${admin.correo:}") String correo,
                                      @Value("${admin.contrasena:}") String contrasena,
                                      @Value("${admin.nombre:Administrador}") String nombre) {
        this.usuarios = usuarios;
        this.codificador = codificador;
        this.correo = correo == null ? "" : correo.trim().toLowerCase();
        this.contrasena = contrasena == null ? "" : contrasena;
        this.nombre = nombre == null || nombre.isBlank() ? "Administrador" : nombre.trim();
    }

    @Override
    public void run(ApplicationArguments args) {
        if (correo.isEmpty()) {
            return;
        }
        if (!correo.contains("@")) {
            log.warn("ADMIN_CORREO no parece un correo válido; no se creó el administrador.");
            return;
        }

        var existente = usuarios.findByCorreo(correo);
        if (existente.isPresent()) {
            Usuario u = existente.get();
            if (u.getRol() != Rol.ADMINISTRADOR || !u.isActivo()) {
                u.setRol(Rol.ADMINISTRADOR);
                u.setActivo(true);
                usuarios.save(u);
                log.info("La cuenta {} ahora es administradora.", correo);
            }
            return;
        }

        if (contrasena.length() < 10 || contrasena.length() > 72) {
            log.warn("ADMIN_CONTRASENA debe tener entre 10 y 72 caracteres; no se creó el administrador.");
            return;
        }
        Usuario u = new Usuario();
        u.setNombre(nombre);
        u.setCorreo(correo);
        u.setContrasena(codificador.encode(contrasena));
        u.setRol(Rol.ADMINISTRADOR);
        usuarios.save(u);
        log.info("Administrador creado: {}", correo);
    }
}