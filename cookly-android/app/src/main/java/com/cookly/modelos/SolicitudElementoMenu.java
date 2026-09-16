package com.cookly.modelos;
public class SolicitudElementoMenu {
    public long recetaId;
    public int diaSemana;
    public TipoComida tipoComida;
    public SolicitudElementoMenu(long recetaId, int diaSemana, TipoComida tipoComida) {
        this.recetaId = recetaId; this.diaSemana = diaSemana; this.tipoComida = tipoComida;
    }
}
