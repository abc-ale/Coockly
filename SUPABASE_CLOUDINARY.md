# Configuración de Supabase y Cloudinary

## Supabase

1. Crea un proyecto en Supabase.
2. Ejecuta los dos SQL de `base-datos-supabase`.
3. En `Connect`, usa el connection pooler y completa en el backend:

```properties
SUPABASE_DATABASE_URL=jdbc:postgresql://HOST_POOLER:6543/postgres?sslmode=require
SUPABASE_DATABASE_USERNAME=USUARIO_POOLER
SUPABASE_DATABASE_PASSWORD=CONTRASENA
JWT_SECRETO=una-clave-aleatoria-de-32-o-mas-caracteres
```

Nunca uses la `service_role` key dentro de Android. El cliente solo recibe un JWT propio del backend.

## Cloudinary

1. Crea una cuenta y un upload preset solo si necesitas una subida unsigned temporal.
2. En producción usa el flujo firmado incluido:
   - Android llama `GET /api/v1/imagenes/firma`.
   - Spring Boot firma `timestamp` y `folder`.
   - Android sube directamente a `https://api.cloudinary.com/v1_1/CLOUD_NAME/image/upload`.
3. Configura únicamente en el servidor:

```properties
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

El secreto no se envía al dispositivo. `CargaImagenCloudinary.java` contiene el método cliente para completar el flujo cuando se agregue el selector de fotos.

## Recuperación de contraseña

El frontend ya presenta el formulario y el backend recibe `SolicitudRecuperacion`. Para una versión de producción conecta un proveedor de correo o Supabase Auth, genera un token aleatorio con expiración corta, guárdalo hasheado y valida el token antes de cambiar la contraseña. No envíes contraseñas ni tokens por logs.