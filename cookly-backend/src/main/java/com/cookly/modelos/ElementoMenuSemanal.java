package com.cookly.modelos;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "elementos_menu_semanal")
public class ElementoMenuSemanal {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "menu_id")
    @JsonIgnore private MenuSemanal menu;
    @ManyToOne(optional = false, fetch = FetchType.EAGER) @JoinColumn(name = "receta_id")
    private Receta receta;
    @Column(nullable = false) private Short diaSemana;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private TipoComida tipoComida;

    public ElementoMenuSemanal() { }
    public ElementoMenuSemanal(MenuSemanal menu, Receta receta, Short diaSemana, TipoComida tipoComida) {
        this.menu = menu; this.receta = receta; this.diaSemana = diaSemana; this.tipoComida = tipoComida;
    }

    public Long getId() { return id; }
    public MenuSemanal getMenu() { return menu; }
    public Receta getReceta() { return receta; }
    public Short getDiaSemana() { return diaSemana; }
    public TipoComida getTipoComida() { return tipoComida; }
}
