package com.cookly.modelos;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
@Entity
@Table(name = "usuarios_alergias")
public class UsuarioAlergia {
    @EmbeddedId private ClaveUsuarioAlergia clave;
    @ManyToOne(fetch = FetchType.LAZY) @MapsId("usuarioId")
    @JoinColumn(name = "usuario_id") @JsonIgnore private Usuario usuario;
    @ManyToOne(fetch = FetchType.EAGER) @MapsId("alergiaId")
    @JoinColumn(name = "alergia_id") private Alergia alergia;
    public UsuarioAlergia() { }
    public UsuarioAlergia(Usuario usuario, Alergia alergia) {
        this.usuario = usuario; this.alergia = alergia;
        this.clave = new ClaveUsuarioAlergia(usuario.getId(), alergia.getId());
    }
    public Alergia getAlergia() { return alergia; }
}

