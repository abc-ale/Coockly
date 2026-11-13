package com.cookly.modelos;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
@Entity
@Table(name = "recetas_etiquetas")
public class RecetaEtiqueta {
    @EmbeddedId private ClaveRecetaEtiqueta clave;
    @ManyToOne(fetch = FetchType.LAZY) @MapsId("recetaId")
    @JoinColumn(name = "receta_id") @JsonIgnore private Receta receta;
    @ManyToOne(fetch = FetchType.EAGER) @MapsId("etiquetaId")
    @JoinColumn(name = "etiqueta_id") private Etiqueta etiqueta;
    public RecetaEtiqueta() { }
    public RecetaEtiqueta(Receta receta, Etiqueta etiqueta) {
        this.receta = receta; this.etiqueta = etiqueta;
        this.clave = new ClaveRecetaEtiqueta(receta.getId(), etiqueta.getId());
    }
    public Receta getReceta() { return receta; }
    public Etiqueta getEtiqueta() { return etiqueta; }
}
