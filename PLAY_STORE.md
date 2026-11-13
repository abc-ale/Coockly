# Checklist de publicación en Google Play

## Antes de generar el AAB

- Cambia `applicationId` si necesitas el identificador final de tu marca.
- Configura `PRODUCTION_API_URL` con una URL HTTPS estable.
- Completa la recuperación de contraseña real y la política de privacidad.
- Añade icono, nombre comercial, email de soporte y una cuenta de prueba.
- Revisa el permiso `RECORD_AUDIO`: explica en la ficha que se usa para el asistente de voz y solicita el permiso solo al pulsar el micrófono.
- Prueba login, logout, recuperación, menú Express, favoritos, imágenes, modo guiado y modo sin conexión.

## Firma y AAB

No subas un keystore al repositorio. En Android Studio:

1. `Build > Generate Signed Bundle / APK`.
2. Selecciona `Android App Bundle`.
3. Crea o selecciona un keystore guardado fuera del proyecto.
4. Genera `release`.
5. Conserva el keystore y sus contraseñas en un gestor seguro.

Por terminal:

```bash
./gradlew clean bundleRelease -PPRODUCTION_API_URL=https://TU_API/api/v1/
```

El resultado estará en `cookly-android/app/build/outputs/bundle/release/`.

## Google Play Console

Sube el `.aab`, completa la ficha, clasificación de contenido, seguridad de datos, política de privacidad y prueba cerrada. Incrementa `versionCode` en cada actualización. La publicación queda bajo tu control; este proyecto no publica automáticamente.