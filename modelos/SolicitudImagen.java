package com.cookly.modelos;
/** Se manda DESPUÉS de subir a Cloudinary, con lo que devolvió RespuestaCargaCloudinary. */
public class SolicitudImagen {
    public long recetaId;
    public String url;
    public String identificadorPublico;
    public SolicitudImagen(long recetaId, String url, String identificadorPublico) {
        this.recetaId = recetaId; this.url = url; this.identificadorPublico = identificadorPublico;
    }
}
