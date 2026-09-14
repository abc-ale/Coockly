package com.cookly.modelos;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class ClaveIngredienteReceta implements Serializable {
    private Long recetaId;
    private Long ingredienteId;
    public ClaveIngredienteReceta() { }
    public ClaveIngredienteReceta(Long recetaId, Long ingredienteId) {
        this.recetaId = recetaId; this.ingredienteId = ingredienteId;
    }
    public Long getRecetaId() { return recetaId; }
    public Long getIngredienteId() { return ingredienteId; }
    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ClaveIngredienteReceta that)) return false;
        return Objects.equals(recetaId, that.recetaId) && Objects.equals(ingredienteId, that.ingredienteId);
    }
    @Override public int hashCode() { return Objects.hash(recetaId, ingredienteId); }
}