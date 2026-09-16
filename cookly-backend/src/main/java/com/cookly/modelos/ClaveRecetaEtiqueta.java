package com.cookly.modelos;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
@Embeddable
public class ClaveRecetaEtiqueta implements Serializable {
    private Long recetaId;
    private Long etiquetaId;
    public ClaveRecetaEtiqueta() { }
    public ClaveRecetaEtiqueta(Long recetaId, Long etiquetaId) { this.recetaId = recetaId; this.etiquetaId = etiquetaId; }
    public Long getRecetaId() { return recetaId; }
    public Long getEtiquetaId() { return etiquetaId; }
    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ClaveRecetaEtiqueta that)) return false;
        return Objects.equals(recetaId, that.recetaId) && Objects.equals(etiquetaId, that.etiquetaId);
    }
    @Override public int hashCode() { return Objects.hash(recetaId, etiquetaId); }
}
