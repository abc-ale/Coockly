package com.cookly.dto; import jakarta.validation.constraints.*;
public record SolicitudRegistro(@NotBlank @Size(max=100) String nombre,@NotBlank @Email String correo,@NotBlank @Size(min=10,max=72) String contrasena){}
