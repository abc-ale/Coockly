package com.cookly.modelos;

import jakarta.persistence.*;

@Entity
@Table(name = "favoritos")
public class Favorito {
    @EmbeddedId private ClaveFavorito clave;
    @ManyToOne(fetch = FetchType.LAZY) @MapsId("usuarioId")
    @JoinColumn(name = "usuario_id") private Usuario usuario;
    @ManyToOne(fetch = FetchType.LAZY) @MapsId("recetaId")
    @JoinColumn(name = "receta_id") private Receta receta;
    public Favorito() { }
    public Favorito(Usuario usuario, Receta receta) {
        this.usuario = usuario; this.receta = receta;
        this.clave = new ClaveFavorito(usuario.getId(), receta.getId());
    }
    public Receta getReceta() { return receta; }
}