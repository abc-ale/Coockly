package com.cookly.dto; import jakarta.validation.constraints.*; import java.util.*;
public record SolicitudMenuExpress(@NotEmpty @Size(max=20) List<@NotBlank @Size(max=80) String> ingredientes){}
