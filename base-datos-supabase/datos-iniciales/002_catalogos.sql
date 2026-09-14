INSERT INTO ingredientes(nombre) VALUES
('huevo'),('arroz'),('tomate'),('pollo'),('cebolla'),('ajo'),('papa'),('limón'),
('aceite'),('pasta'),('garbanzo'),('crema')
ON CONFLICT DO NOTHING;
INSERT INTO etiquetas(nombre) VALUES ('peruana'),('rápida'),('saludable') ON CONFLICT DO NOTHING; INSERT INTO restricciones_alimentarias(nombre) VALUES ('Vegetariana'),('Vegana'),('Sin gluten') ON CONFLICT DO NOTHING; INSERT INTO alergias(nombre) VALUES ('Maní'),('Lácteos'),('Mariscos') ON CONFLICT DO NOTHING;
-- Sustituya los hashes por BCrypt generado en el entorno de despliegue; nunca use contraseñas planas.
INSERT INTO usuarios(nombre,correo,contrasena,rol) VALUES ('Administrador','admin@cookly.local','$2a$10$ReemplaceEsteHashConUnoValidoGeneradoEnProduccion000000000','ADMINISTRADOR'),('Moderador','moderador@cookly.local','$2a$10$ReemplaceEsteHashConUnoValidoGeneradoEnProduccion000000000','MODERADOR'),('Usuario','usuario@cookly.local','$2a$10$ReemplaceEsteHashConUnoValidoGeneradoEnProduccion000000000','USUARIO') ON CONFLICT(correo) DO NOTHING;

-- Catálogo inicial visible desde la primera instalación. Es idempotente para poder
-- ejecutar este archivo varias veces sin duplicar recetas ni ingredientes.
INSERT INTO recetas(nombre, descripcion, minutos_preparacion, creador_id)
SELECT datos.nombre, datos.descripcion, datos.minutos, u.id
FROM (VALUES
  ('Arroz con pollo casero', 'Un plato completo, rendidor y fácil de preparar.', 35),
  ('Huevos mediterráneos', 'Huevos con tomate, cebolla y ajo para cualquier momento del día.', 12),
  ('Pollo al limón', 'Pollo dorado con un toque fresco de limón y ajo.', 25),
  ('Papas doradas con ajo', 'Papas crujientes por fuera, suaves por dentro y listas en pocos pasos.', 30),
  ('Arroz salteado con huevo', 'Una receta rápida para aprovechar arroz y vegetales de la despensa.', 18),
  ('Ensalada fresca de garbanzos', 'Una opción ligera, fresca y con mucho sabor.', 15),
  ('Sopa rápida de pollo y papa', 'Comida reconfortante con ingredientes cotidianos.', 40),
  ('Tomates rellenos de arroz', 'Tomates horneados rellenos de arroz, cebolla y ajo.', 28)
) AS datos(nombre, descripcion, minutos)
CROSS JOIN usuarios u
WHERE u.correo = 'admin@cookly.local'
  AND NOT EXISTS (SELECT 1 FROM recetas r WHERE r.nombre = datos.nombre);

INSERT INTO ingredientes_receta(receta_id, ingrediente_id)
SELECT r.id, i.id FROM recetas r JOIN ingredientes i ON i.nombre IN ('arroz','pollo','cebolla','ajo','tomate')
WHERE r.nombre = 'Arroz con pollo casero' ON CONFLICT DO NOTHING;
INSERT INTO ingredientes_receta(receta_id, ingrediente_id)
SELECT r.id, i.id FROM recetas r JOIN ingredientes i ON i.nombre IN ('huevo','tomate','cebolla','ajo')
WHERE r.nombre = 'Huevos mediterráneos' ON CONFLICT DO NOTHING;
INSERT INTO ingredientes_receta(receta_id, ingrediente_id)
SELECT r.id, i.id FROM recetas r JOIN ingredientes i ON i.nombre IN ('pollo','limón','ajo','cebolla')
WHERE r.nombre = 'Pollo al limón' ON CONFLICT DO NOTHING;
INSERT INTO ingredientes_receta(receta_id, ingrediente_id)
SELECT r.id, i.id FROM recetas r JOIN ingredientes i ON i.nombre IN ('papa','ajo','limón','aceite')
WHERE r.nombre = 'Papas doradas con ajo' ON CONFLICT DO NOTHING;
INSERT INTO ingredientes_receta(receta_id, ingrediente_id)
SELECT r.id, i.id FROM recetas r JOIN ingredientes i ON i.nombre IN ('arroz','huevo','cebolla','ajo','tomate')
WHERE r.nombre = 'Arroz salteado con huevo' ON CONFLICT DO NOTHING;
INSERT INTO ingredientes_receta(receta_id, ingrediente_id)
SELECT r.id, i.id FROM recetas r JOIN ingredientes i ON i.nombre IN ('garbanzo','tomate','cebolla','limón')
WHERE r.nombre = 'Ensalada fresca de garbanzos' ON CONFLICT DO NOTHING;
INSERT INTO ingredientes_receta(receta_id, ingrediente_id)
SELECT r.id, i.id FROM recetas r JOIN ingredientes i ON i.nombre IN ('pollo','papa','tomate','cebolla','ajo')
WHERE r.nombre = 'Sopa rápida de pollo y papa' ON CONFLICT DO NOTHING;
INSERT INTO ingredientes_receta(receta_id, ingrediente_id)
SELECT r.id, i.id FROM recetas r JOIN ingredientes i ON i.nombre IN ('tomate','arroz','cebolla','ajo')
WHERE r.nombre = 'Tomates rellenos de arroz' ON CONFLICT DO NOTHING;
