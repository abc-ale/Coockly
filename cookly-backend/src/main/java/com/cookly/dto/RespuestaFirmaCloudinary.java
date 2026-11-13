package com.cookly.dto;

public record RespuestaFirmaCloudinary(
        String cloudName, String apiKey, String firma, long timestamp, String carpeta) {}