package com.cookly.modelos;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
@Entity
@Table(name = "usuarios_restricciones")
public class UsuarioRestriccion {
    @EmbeddedId private ClaveUsuarioRestriccion clave;
    @ManyToOne(fetch = FetchType.LAZY) @MapsId("usuarioId")
    @JoinColumn(name = "usuario_id") @JsonIgnore private Usuario usuario;
    @ManyToOne(fetch = FetchType.EAGER) @MapsId("restriccionId")
    @JoinColumn(name = "restriccion_id") private RestriccionAlimentaria restriccion;
    public UsuarioRestriccion() { }
    public UsuarioRestriccion(Usuario usuario, RestriccionAlimentaria restriccion) {
        this.usuario = usuario; this.restriccion = restriccion;
        this.clave = new ClaveUsuarioRestriccion(usuario.getId(), restriccion.getId());
    }
    public RestriccionAlimentaria getRestriccion() { return restriccion; }
}

