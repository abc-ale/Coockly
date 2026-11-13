package com.cookly.modelos;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
@Entity
@Table(name = "historial_recetas")
public class HistorialReceta {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "usuario_id")
    @JsonIgnore private Usuario usuario;
    @ManyToOne(optional = false, fetch = FetchType.EAGER) @JoinColumn(name = "receta_id")
    private Receta receta;
    private Instant vistoEn = Instant.now();
    public HistorialReceta() { }
    public HistorialReceta(Usuario usuario, Receta receta) { this.usuario = usuario; this.receta = receta; }
    public Long getId() { return id; }
    public Receta getReceta() { return receta; }
    public Instant getVistoEn() { return vistoEn; }
}
