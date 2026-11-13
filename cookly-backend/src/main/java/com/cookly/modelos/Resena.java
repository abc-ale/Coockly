package com.cookly.modelos;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
@Entity
@Table(name = "resenas", uniqueConstraints = @UniqueConstraint(columnNames = {"receta_id", "usuario_id"}))
public class Resena {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "receta_id")
    @JsonIgnore private Receta receta;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "usuario_id")
    private Usuario usuario;
    @Column(nullable = false) private Short puntuacion;
    @Column(length = 1000) private String comentario;
    private Instant creadoEn = Instant.now();
    public Resena() { }
    public Resena(Receta receta, Usuario usuario, Short puntuacion, String comentario) {
        this.receta = receta; this.usuario = usuario; this.puntuacion = puntuacion; this.comentario = comentario;
    }
    public Long getId() { return id; }
    public Receta getReceta() { return receta; }
    public Usuario getUsuario() { return usuario; }
    public Short getPuntuacion() { return puntuacion; }
    public String getComentario() { return comentario; }
    public Instant getCreadoEn() { return creadoEn; }
    public void setPuntuacion(Short v) { puntuacion = v; }
    public void setComentario(String v) { comentario = v; }
}