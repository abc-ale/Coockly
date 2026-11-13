package com.cookly.modelos;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class ClaveFavorito implements Serializable {
    private Long usuarioId;
    private Long recetaId;
    public ClaveFavorito() { }
    public ClaveFavorito(Long usuarioId, Long recetaId) { this.usuarioId = usuarioId; this.recetaId = recetaId; }
    public Long getUsuarioId() { return usuarioId; }
    public Long getRecetaId() { return recetaId; }
    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ClaveFavorito that)) return false;
        return Objects.equals(usuarioId, that.usuarioId) && Objects.equals(recetaId, that.recetaId);
    }
    @Override public int hashCode() { return Objects.hash(usuarioId, recetaId); }
}