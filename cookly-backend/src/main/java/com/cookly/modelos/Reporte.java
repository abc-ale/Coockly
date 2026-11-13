package com.cookly.modelos;
import jakarta.persistence.*;
import java.time.Instant;
@Entity
@Table(name = "reportes")
public class Reporte {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "usuario_id")
    private Usuario usuario;
    @ManyToOne(optional = false, fetch = FetchType.EAGER) @JoinColumn(name = "receta_id")
    private Receta receta;
    @Column(nullable = false, length = 500) private String motivo;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private EstadoReporte estado = EstadoReporte.PENDIENTE;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "moderador_id")
    private Usuario moderador;
    private Instant creadoEn = Instant.now();
    public Reporte() { }
    public Reporte(Usuario usuario, Receta receta, String motivo) {
        this.usuario = usuario; this.receta = receta; this.motivo = motivo;
    }
    public Long getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public Receta getReceta() { return receta; }
    public String getMotivo() { return motivo; }
    public EstadoReporte getEstado() { return estado; }
    public Usuario getModerador() { return moderador; }
    public Instant getCreadoEn() { return creadoEn; }
    public void setEstado(EstadoReporte v) { estado = v; }
    public void setModerador(Usuario v) { moderador = v; }
}
