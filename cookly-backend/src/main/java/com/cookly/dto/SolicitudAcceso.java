package com.cookly.dto; import jakarta.validation.constraints.*;
public record SolicitudAcceso(@NotBlank @Email String correo,@NotBlank String contrasena){}
