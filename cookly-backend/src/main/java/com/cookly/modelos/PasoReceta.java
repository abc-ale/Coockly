package com.cookly.modelos;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "pasos_receta")
public class PasoReceta {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "receta_id", nullable = false)
    @JsonIgnore private Receta receta;
    private Short orden;
    @Column(nullable = false, length = 2000) private String instruccion;
    @Transient private Integer segundosTemporizador;
    public PasoReceta() { }
    public PasoReceta(Receta receta, Short orden, String instruccion) {
        this.receta = receta; this.orden = orden; this.instruccion = instruccion;
    }
    public Long getId() { return id; }
    public Short getOrden() { return orden; }
    public String getInstruccion() { return instruccion; }
    public Integer getSegundosTemporizador() { return segundosTemporizador; }
}