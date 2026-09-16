package com.cookly.modelos;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
@Embeddable
public class ClaveUsuarioAlergia implements Serializable {
    private Long usuarioId;
    private Long alergiaId;
    public ClaveUsuarioAlergia() { }
    public ClaveUsuarioAlergia(Long usuarioId, Long alergiaId) { this.usuarioId = usuarioId; this.alergiaId = alergiaId; }
    public Long getUsuarioId() { return usuarioId; }
    public Long getAlergiaId() { return alergiaId; }
    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ClaveUsuarioAlergia that)) return false;
        return Objects.equals(usuarioId, that.usuarioId) && Objects.equals(alergiaId, that.alergiaId);
    }
    @Override public int hashCode() { return Objects.hash(usuarioId, alergiaId); }
}