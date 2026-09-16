package com.cookly.modelos;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
@Entity
@Table(name = "comentarios")
public class Comentario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "receta_id")
    @JsonIgnore private Receta receta;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "usuario_id")
    private Usuario usuario;
    @Column(nullable = false, length = 1000) private String contenido;
    private Instant creadoEn = Instant.now();
    public Comentario() { }
    public Comentario(Receta receta, Usuario usuario, String contenido) {
        this.receta = receta; this.usuario = usuario; this.contenido = contenido;
    }
    public Long getId() { return id; }
    public Receta getReceta() { return receta; }
    public Usuario getUsuario() { return usuario; }
    public String getContenido() { return contenido; }
    public Instant getCreadoEn() { return creadoEn; }
}