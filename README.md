# Cookly

Sistema Android Java + API Spring Boot + PostgreSQL Supabase. No incluye credenciales ni APK firmado.

## Puesta en marcha

1. Ejecute `base-datos-supabase/esquemas/001_esquema_inicial.sql` y luego los datos iniciales en Supabase.
2. Abra `cookly-backend/src/main/resources/application-local.properties`, pegue sus credenciales de Supabase y arranque con `./mvnw.cmd spring-boot:run` en Windows. El Maven Wrapper descargará Maven automáticamente la primera vez; el perfil local se carga por defecto y el archivo está excluido de Git.
3. Desde `cookly-backend`, ejecute `mvn spring-boot:run`.
4. Cambie `https://TU_API/api/v1/` por la URL HTTPS real en `ClienteApi.java` y abra `cookly-android` con Android Studio para generar el APK.

La arquitectura separa controlador, servicio y repositorio. El endpoint `POST /api/v1/recetas/menu-express` es temporal: compara ingredientes sin escribir en la despensa.
