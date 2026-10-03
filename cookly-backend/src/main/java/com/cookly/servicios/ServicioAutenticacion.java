package com.cookly.servicios;

import com.cookly.dto.RespuestaAcceso;
import com.cookly.dto.SolicitudAcceso;
import com.cookly.dto.SolicitudRegistro;
import com.cookly.modelos.Usuario;
import com.cookly.repositorios.RepositorioUsuario;
import com.cookly.seguridad.ServicioToken;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicioAutenticacion {

    private final RepositorioUsuario usuarios;
    private final PasswordEncoder codificador;
    private final ServicioToken token;
    private final ServicioCorreo servicioCorreo;
    private final String urlPublica;

    private final java.util.Map<String, java.time.Instant> ultimoEnvio =
            new java.util.concurrent.ConcurrentHashMap<>();

    public ServicioAutenticacion(
            RepositorioUsuario usuarios,
            PasswordEncoder codificador,
            ServicioToken token,
            ServicioCorreo servicioCorreo,
            @Value("${app.url-publica}") String urlPublica
    ) {
        this.usuarios = usuarios;
        this.codificador = codificador;
        this.token = token;
        this.servicioCorreo = servicioCorreo;
        this.urlPublica = urlPublica;
    }

    /**
     * Solicita la recuperación de contraseña.
     *
     * El mensaje público del controlador siempre es genérico por seguridad,
     * pero si Brevo falla, el error queda registrado en los logs de Render.
     */
    public void solicitarRecuperacion(String correoUsuario) {
        String destino = correoUsuario.toLowerCase().trim();

        java.time.Instant ahora = java.time.Instant.now();
        java.time.Instant previo = ultimoEnvio.get(destino);

        if (previo != null && previo.plusSeconds(60).isAfter(ahora)) {
            System.out.println(
                    "Recuperación: solicitud ignorada por límite de 60 segundos."
            );
            return;
        }

        var usuario = usuarios.findByCorreo(destino);

        if (usuario.isEmpty() || !usuario.get().isActivo()) {
            System.out.println(
                    "Recuperación: usuario no encontrado o inactivo."
            );
            return;
        }

        String jwt = token.crearRecuperacion(
                destino,
                sello(usuario.get().getContrasena())
        );

        String enlace = urlPublica
                + "/restablecer.html?token="
                + jwt;

        String html =
                "<!DOCTYPE html>"
                + "<html lang=\"es\">"
                + "<head>"
                + "<meta charset=\"UTF-8\">"
                + "<title>Restablece tu contraseña</title>"
                + "</head>"
                + "<body>"
                + "<p>Recibimos una solicitud para restablecer tu contraseña de Cookly.</p>"
                + "<p>"
                + "<a href=\"" + enlace + "\">"
                + "Continuar para crear una contraseña nueva"
                + "</a>"
                + "</p>"
                + "<p>El enlace vence en 15 minutos.</p>"
                + "<p>Si no solicitaste este cambio, puedes ignorar este correo.</p>"
                + "</body>"
                + "</html>";

        try {
            servicioCorreo.enviar(
                    destino,
                    "Restablece tu contraseña de Cookly",
                    html
            );

            // Solo bloqueamos nuevos intentos si Brevo aceptó el correo.
            ultimoEnvio.put(destino, ahora);

            System.out.println(
                    "Recuperación: Brevo aceptó el correo correctamente."
            );

        } catch (Exception e) {
            System.err.println(
                    "Recuperación: Brevo rechazó el correo: "
                            + e.getMessage()
            );

            throw new IllegalStateException(
                    "No se pudo enviar el correo de recuperación.",
                    e
            );
        }
    }

    /**
     * Restablece la contraseña usando el token generado por el backend.
     */
    @Transactional
    public void restablecerConToken(
            String tokenRecuperacion,
            String nuevaContrasena
    ) {
        String mensajeError =
                "El enlace no es válido o venció. Pide uno nuevo.";

        io.jsonwebtoken.Claims datos;

        try {
            datos = token.validarRecuperacion(tokenRecuperacion);
        } catch (Exception e) {
            throw new IllegalArgumentException(mensajeError);
        }

        var usuario = usuarios.findByCorreo(datos.getSubject())
                .orElseThrow(() ->
                        new IllegalArgumentException(mensajeError)
                );

        String selloActual = sello(usuario.getContrasena());
        String selloDelToken = datos.get("sello", String.class);

        if (!usuario.isActivo() || !selloActual.equals(selloDelToken)) {
            throw new IllegalArgumentException(mensajeError);
        }

        usuario.setContrasena(
                codificador.encode(nuevaContrasena)
        );

        usuarios.save(usuario);
    }

    /**
     * Genera una huella corta del hash actual.
     *
     * Si la contraseña cambia, el token anterior deja de ser válido.
     */
    private static String sello(String hashContrasena) {
        try {
            byte[] resultado = java.security.MessageDigest
                    .getInstance("SHA-256")
                    .digest(
                            hashContrasena.getBytes(
                                    java.nio.charset.StandardCharsets.UTF_8
                            )
                    );

            return java.util.HexFormat
                    .of()
                    .formatHex(resultado, 0, 8);

        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @Transactional
    public RespuestaAcceso registrar(SolicitudRegistro solicitud) {
        String correo = solicitud.correo()
                .toLowerCase()
                .trim();

        if (usuarios.existsByCorreo(correo)) {
            throw new IllegalArgumentException(
                    "El correo ya está registrado"
            );
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(solicitud.nombre());
        usuario.setCorreo(correo);
        usuario.setContrasena(
                codificador.encode(solicitud.contrasena())
        );

        usuarios.save(usuario);

        return respuesta(usuario);
    }

    public RespuestaAcceso acceder(SolicitudAcceso solicitud) {
        String correo = solicitud.correo()
                .toLowerCase()
                .trim();

        Usuario usuario = usuarios.findByCorreo(correo)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Credenciales inválidas"
                        )
                );

        if (!usuario.isActivo()
                || !codificador.matches(
                        solicitud.contrasena(),
                        usuario.getContrasena()
                )) {
            throw new IllegalArgumentException(
                    "Credenciales inválidas"
            );
        }

        return respuesta(usuario);
    }

    @Transactional
    public void cambiarMiContrasena(
            String correo,
            String contrasenaActual,
            String contrasenaNueva
    ) {
        Usuario usuario = usuarios.findByCorreo(
                correo.toLowerCase().trim()
        ).orElseThrow(() ->
                new IllegalArgumentException(
                        "Usuario no encontrado"
                )
        );

        if (!codificador.matches(
                contrasenaActual,
                usuario.getContrasena()
        )) {
            throw new IllegalArgumentException(
                    "La contraseña actual no es correcta"
            );
        }

        usuario.setContrasena(
                codificador.encode(contrasenaNueva)
        );

        usuarios.save(usuario);
    }

    /**
     * Se mantiene para compatibilidad con el flujo anterior.
     * La recuperación nueva debe usar restablecerConToken().
     */
    @Transactional
    public void restablecerContrasena(
            String correo,
            String nuevaContrasena
    ) {
        Usuario usuario = usuarios.findByCorreo(
                correo.toLowerCase().trim()
        ).orElseThrow(() ->
                new IllegalArgumentException(
                        "Usuario no encontrado"
                )
        );

        usuario.setContrasena(
                codificador.encode(nuevaContrasena)
        );

        usuarios.save(usuario);
    }

    @Transactional
    public RespuestaAcceso accederOCrearPorSocial(
            String correo,
            String nombre
    ) {
        String correoNormalizado = correo
                .toLowerCase()
                .trim();

        Usuario usuario = usuarios.findByCorreo(correoNormalizado)
                .orElseGet(() -> {
                    Usuario nuevo = new Usuario();

                    nuevo.setCorreo(correoNormalizado);
                    nuevo.setNombre(
                            nombre != null && !nombre.isBlank()
                                    ? nombre
                                    : correoNormalizado
                    );

                    nuevo.setContrasena(
                            codificador.encode(
                                    java.util.UUID
                                            .randomUUID()
                                            .toString()
                            )
                    );

                    usuarios.save(nuevo);
                    return nuevo;
                });

        if (!usuario.isActivo()) {
            throw new IllegalArgumentException(
                    "Cuenta desactivada"
            );
        }

        return respuesta(usuario);
    }

    private RespuestaAcceso respuesta(Usuario usuario) {
        return new RespuestaAcceso(
                token.crear(
                        usuario.getCorreo(),
                        usuario.getRol().name()
                ),
                usuario.getNombre(),
                usuario.getRol().name(),
                usuario.getCorreo()
        );
    }
}