# Despliegue en Render

1. Sube este proyecto completo a un repositorio privado de GitHub. No subas valores reales de `application-local.properties`.
2. En Render, selecciona **New > Blueprint** y conecta el repositorio. Render detectará `render.yaml` y creará `cookly-api`.
3. En la sección **Environment**, completa `SUPABASE_DATABASE_URL`, `SUPABASE_DATABASE_USERNAME`, `SUPABASE_DATABASE_PASSWORD`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`. Render genera `JWT_SECRETO` automáticamente.
4. Cuando el despliegue termine, prueba `https://TU-SERVICIO.onrender.com/api/v1/salud`. Debe responder `{"estado":"ok"}`.
5. Copia la URL completa `https://TU-SERVICIO.onrender.com/api/v1/` y agrégala en `cookly-android/gradle.properties` como `PRODUCTION_API_URL=...` antes de crear el AAB de lanzamiento.

La compilación `debug` usa el backend local del emulador (`10.0.2.2`). La compilación `release` usa HTTPS y es la indicada para Play Store.
