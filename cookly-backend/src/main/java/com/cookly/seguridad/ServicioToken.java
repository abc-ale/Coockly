package com.cookly.seguridad;
import io.jsonwebtoken.*; import io.jsonwebtoken.security.Keys; import org.springframework.beans.factory.annotation.*; import org.springframework.stereotype.Service; import java.nio.charset.StandardCharsets; import java.time.*; import java.util.*;
@Service public class ServicioToken { private final byte[] clave; private final byte[] claveRecuperacion; private final long expiracion;
 public ServicioToken(@Value("${seguridad.jwt.secreto}") String secreto,@Value("${seguridad.jwt.expiracion-minutos}") long minutos){ if(secreto.length()<32) throw new IllegalArgumentException("JWT_SECRETO debe tener al menos 32 caracteres"); clave=secreto.getBytes(StandardCharsets.UTF_8); claveRecuperacion=(secreto+"|recuperacion").getBytes(StandardCharsets.UTF_8); expiracion=minutos; }
 public String crear(String correo,String rol){ return Jwts.builder().subject(correo).claim("rol",rol).issuedAt(new Date()).expiration(Date.from(Instant.now().plus(Duration.ofMinutes(expiracion)))).signWith(Keys.hmacShaKeyFor(clave)).compact(); }
 public Claims validar(String token){ return Jwts.parser().verifyWith(Keys.hmacShaKeyFor(clave)).build().parseSignedClaims(token).getPayload(); }
 /** Token de 15 min para restablecer contraseña. Usa otra clave: no sirve como token de sesión. */
 public String crearRecuperacion(String correo,String sello){ return Jwts.builder().subject(correo).claim("sello",sello).issuedAt(new Date()).expiration(Date.from(Instant.now().plus(Duration.ofMinutes(15)))).signWith(Keys.hmacShaKeyFor(claveRecuperacion)).compact(); }
 public Claims validarRecuperacion(String token){ return Jwts.parser().verifyWith(Keys.hmacShaKeyFor(claveRecuperacion)).build().parseSignedClaims(token).getPayload(); }
}
