package com.cookly.modelos;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
@Embeddable
public class ClaveUsuarioRestriccion implements Serializable {
    private Long usuarioId;
    private Long restriccionId;
    public ClaveUsuarioRestriccion() { }
    public ClaveUsuarioRestriccion(Long usuarioId, Long restriccionId) { this.usuarioId = usuarioId; this.restriccionId = restriccionId; }
    public Long getUsuarioId() { return usuarioId; }
    public Long getRestriccionId() { return restriccionId; }
    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ClaveUsuarioRestriccion that)) return false;
        return Objects.equals(usuarioId, that.usuarioId) && Objects.equals(restriccionId, that.restriccionId);
    }
    @Override public int hashCode() { return Objects.hash(usuarioId, restriccionId); }
}
