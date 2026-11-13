package com.cookly.modelos;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
@Entity
@Table(name = "imagenes")
public class Imagen {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "receta_id")
    @JsonIgnore private Receta receta;
    @Column(nullable = false) private String url;
    @Column(nullable = false, unique = true) private String identificadorPublico;
    public Imagen() { }
    public Imagen(Receta receta, String url, String identificadorPublico) {
        this.receta = receta; this.url = url; this.identificadorPublico = identificadorPublico;
    }
    public Long getId() { return id; }
    public Receta getReceta() { return receta; }
    public String getUrl() { return url; }
    public String getIdentificadorPublico() { return identificadorPublico; }
}
