package com.cookly.controladores;
import com.cookly.dto.*; import com.cookly.servicios.ServicioReceta; import jakarta.validation.Valid; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api/v1/recetas") public class ControladorReceta { private final ServicioReceta servicio; public ControladorReceta(ServicioReceta s){servicio=s;} @PostMapping("/menu-express") public Map<String,List<RecomendacionReceta>> menuExpress(@Valid @RequestBody SolicitudMenuExpress s){return Map.of("recetas",servicio.menuExpress(s));} }
