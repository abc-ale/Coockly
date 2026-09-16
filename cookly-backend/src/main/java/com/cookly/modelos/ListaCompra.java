package com.cookly.modelos;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "listas_compra")
public class ListaCompra {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "usuario_id")
    @JsonIgnore private Usuario usuario;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "menu_id")
    private MenuSemanal menu;
    @Column(nullable = false) private String nombre;
    private Instant creadaEn = Instant.now();
    @OneToMany(mappedBy = "lista", fetch = FetchType.EAGER)
    private List<ElementoListaCompra> elementos = new ArrayList<>();

    public ListaCompra() { }
    public ListaCompra(Usuario usuario, String nombre) { this.usuario = usuario; this.nombre = nombre; }

    public Long getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public MenuSemanal getMenu() { return menu; }
    public void setMenu(MenuSemanal v) { menu = v; }
    public String getNombre() { return nombre; }
    public Instant getCreadaEn() { return creadaEn; }
    public List<ElementoListaCompra> getElementos() { return elementos; }
}
