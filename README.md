# Cookly 1.1

Aplicación Android Java + API Spring Boot + PostgreSQL de Supabase + Cloudinary.
El proyecto queda preparado para que el propietario genere el AAB y haga el envío a Google Play; no contiene credenciales, keystore ni APK firmado.

## Qué se mejoró

- Login visual renovado, registro con modo separado y recuperación de contraseña.
- Menú Express con ingredientes separados por líneas, comas o punto y coma.
- Perfil con favoritos y recetas guardadas consumidos desde la API.
- Detalle de receta con unidades (`gramos`, `taza`, `cucharada`, `cucharadita`, etc.) y selector de 1 a 100 porciones.
- Modo cocina guiada con temporizador independiente por paso.
- Chatbot local de respaldo y asistente de voz Android (SpeechRecognizer + TextToSpeech).
- Puntos de extensión para conectar manualmente un chatbot con IA y persistir su historial.
- Flujo de subida firmada a Cloudinary: el secreto solo vive en Spring Boot.
- Release con R8/minificación, API HTTPS, almacenamiento de sesión cifrado y sin credenciales en la APK.

## Estructura

- `cookly-android`: cliente Android Java. Abrir esta carpeta en Android Studio.
- `cookly-backend`: API Spring Boot y seguridad JWT.
- `base-datos-supabase`: esquema y catálogos para ejecutar en Supabase SQL Editor.
- `PLAY_STORE.md`: checklist para generar el AAB y publicar manualmente.
- `SUPABASE_CLOUDINARY.md`: configuración de servicios externos y variables.

## Inicio rápido

1. Ejecuta `base-datos-supabase/esquemas/001_esquema_inicial.sql` y después `datos-iniciales/002_catalogos.sql` en Supabase.
2. Configura las variables del backend siguiendo `SUPABASE_CLOUDINARY.md`.
3. Arranca `cookly-backend` con `./mvnw spring-boot:run` en Windows o `mvn spring-boot:run` con Maven instalado.
4. Abre `cookly-android` en Android Studio.
5. Para cambiar la URL del backend:

   `./gradlew bundleRelease -PPRODUCTION_API_URL=https://TU_API_HTTPS/api/v1/`

6. Genera el AAB firmado desde Android Studio y sigue `PLAY_STORE.md`.

## Rendimiento y publicación

La aplicación no descarga imágenes grandes en el arranque, usa llamadas bajo demanda, mantiene la sesión cifrada y activa R8 en release. Antes de publicar configura una CDN de Cloudinary con transformaciones y thumbnails; no insertes secretos en `BuildConfig`, XML ni el repositorio.

El endpoint de recuperación devuelve una respuesta genérica para no revelar si un correo existe. Antes de producción debes conectar el envío de correo y guardar tokens de un solo uso con caducidad; el endpoint y las clases ya están separados para completar esa integración.

## Asistentes

`cookly-android/app/src/main/java/com/cookly/asistentes/ChatbotCocina.java` tiene respuestas locales para que la app siga siendo funcional sin red.
`InterfazProveedorAsistente` y `ConfiguracionAsistentes` son los puntos para conectar tu endpoint de IA manualmente.
`AsistenteVoz` ya implementa reconocimiento y lectura en español; `ActividadAsistente` solicita el permiso de micrófono solo cuando el usuario pulsa el botón.