package com.cookly.modelos;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.*;

@Entity
@Table(name = "menus_semanales")
public class MenuSemanal {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "usuario_id")
    @JsonIgnore private Usuario usuario;
    @Column(nullable = false) private LocalDate semana;
    @OneToMany(mappedBy = "menu", fetch = FetchType.EAGER)
    private List<ElementoMenuSemanal> elementos = new ArrayList<>();

    public MenuSemanal() { }
    public MenuSemanal(Usuario usuario, LocalDate semana) { this.usuario = usuario; this.semana = semana; }

    public Long getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public LocalDate getSemana() { return semana; }
    public List<ElementoMenuSemanal> getElementos() { return elementos; }
}
