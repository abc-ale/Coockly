package com.cookly.modelos;
public class SolicitudReporte {
    public long recetaId;
    public String motivo;
    public SolicitudReporte(long recetaId, String motivo) { this.recetaId = recetaId; this.motivo = motivo; }
}