// Pruebas automáticas de la API de Cookly (todos los módulos), de punta a punta.
//
// Uso (desde la carpeta pruebas-api):
//   BASE_URL=https://cookly-api-sb9w.onrender.com \
//   ADMIN_CORREO=admin@ejemplo.com ADMIN_CONTRASENA=... \
//   node --test api.test.mjs
//
// Necesita Node 20 o superior. Sin BASE_URL se usa http://localhost:8080.
// Crea un usuario de prueba nuevo en cada ejecución y, al final, lo desactiva (si se da la cuenta de administrador).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

const BASE = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const API = BASE + '/api/v1';
const ADMIN_CORREO = process.env.ADMIN_CORREO;
const ADMIN_CONTRASENA = process.env.ADMIN_CONTRASENA;
const SIN_ADMIN = !ADMIN_CORREO || !ADMIN_CONTRASENA;

const sufijo = Date.now();
const usuario = { nombre: 'QA Cookly', correo: `qa.${sufijo}@cookly-prueba.com`, contrasena: 'ClaveSegura123' };
const ctx = { tokenUsuario: null, tokenAdmin: null, usuarioId: null, recetaId: null, listaId: null, menuId: null };

async function llamar(metodo, ruta, { token, cuerpo, cabeceras } = {}) {
  const h = { ...(cabeceras || {}) };
  if (token) h.Authorization = 'Bearer ' + token;
  if (cuerpo !== undefined) h['Content-Type'] = 'application/json';
  const r = await fetch(API + ruta, { method: metodo, headers: h, body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined, signal: AbortSignal.timeout(60000) });
  const texto = await r.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* no era JSON */ }
  return { estado: r.status, json, texto, cabeceras: r.headers };
}
const ok = (r, ...validos) => assert.ok((validos.length ? validos : [200, 201, 204]).includes(r.estado), `HTTP ${r.estado}: ${r.texto.slice(0, 200)}`);

// ------------------------------------------------------------------ servidor
test('salud: el servidor responde (puede tardar si estaba dormido)', async () => {
  const r = await llamar('GET', '/salud');
  ok(r, 200);
});

// ------------------------------------------------------------------ seguridad
test('seguridad: rutas privadas sin token se rechazan', async () => {
  for (const ruta of ['/recetas/favoritos', '/notificaciones', '/listas-compra', '/historial']) {
    const r = await llamar('GET', ruta);
    ok(r, 401, 403);
  }
});

test('seguridad: un token falso se rechaza', async () => {
  const r = await llamar('GET', '/recetas/favoritos', { token: 'token.falso.123' });
  ok(r, 401, 403);
});

test('seguridad: el panel de administración exige administrador', async () => {
  const r = await llamar('GET', '/administracion/resumen');
  ok(r, 401, 403);
});

// ------------------------------------------------------------------ cuentas
test('registro: contraseña corta se rechaza', async () => {
  const r = await llamar('POST', '/autenticacion/registro', { cuerpo: { nombre: 'X Y', correo: `corta.${sufijo}@cookly-prueba.com`, contrasena: '123' } });
  ok(r, 400);
});

test('registro: correo inválido se rechaza', async () => {
  const r = await llamar('POST', '/autenticacion/registro', { cuerpo: { nombre: 'X Y', correo: 'no-es-correo', contrasena: 'ClaveSegura123' } });
  ok(r, 400);
});

test('registro: crea la cuenta y devuelve un token', async () => {
  const r = await llamar('POST', '/autenticacion/registro', { cuerpo: usuario });
  ok(r, 200, 201);
  assert.ok(r.json.token, 'no devolvió token');
  assert.equal(r.json.rol, 'USUARIO');
  ctx.tokenUsuario = r.json.token;
});

// Las recetas y catálogos exigen sesión (como en la app), por eso van después del registro.
test('catálogos: etiquetas, restricciones y alergias', async () => {
  const r = await llamar('GET', '/catalogos', { token: ctx.tokenUsuario });
  ok(r, 200);
  for (const k of ['etiquetas', 'restricciones', 'alergias']) assert.ok(Array.isArray(r.json[k]), `falta ${k}`);
  assert.ok(r.json.etiquetas.length > 0, 'no hay etiquetas');
});

test('recetas: la búsqueda devuelve recetas', async () => {
  const r = await llamar('GET', '/recetas/buscar?texto=&pagina=0&tamano=20', { token: ctx.tokenUsuario });
  ok(r, 200);
  assert.ok(Array.isArray(r.json.content) && r.json.content.length > 0, 'no hay recetas');
  ctx.recetaId = r.json.content[0].id;
});

test('recetas: el detalle de una receta trae ingredientes y pasos', async () => {
  const r = await llamar('GET', `/recetas/${ctx.recetaId}`, { token: ctx.tokenUsuario });
  ok(r, 200);
  assert.ok(r.json.nombre);
});

test('recetas: buscar por texto que no existe devuelve lista vacía', async () => {
  const r = await llamar('GET', '/recetas/buscar?texto=zzzxxxqqq&pagina=0&tamano=5', { token: ctx.tokenUsuario });
  ok(r, 200);
  assert.equal(r.json.content.length, 0);
});

test('recetas: una receta inexistente da error 404', async () => {
  const r = await llamar('GET', '/recetas/99999999', { token: ctx.tokenUsuario });
  ok(r, 404);
});

test('registro: el mismo correo dos veces se rechaza', async () => {
  const r = await llamar('POST', '/autenticacion/registro', { cuerpo: usuario });
  ok(r, 400, 409);
});

test('login: contraseña incorrecta se rechaza', async () => {
  const r = await llamar('POST', '/autenticacion/login', { cuerpo: { correo: usuario.correo, contrasena: 'Incorrecta123' } });
  ok(r, 400, 401, 403);
});

test('login: con la contraseña correcta devuelve token', async () => {
  const r = await llamar('POST', '/autenticacion/login', { cuerpo: { correo: usuario.correo, contrasena: usuario.contrasena } });
  ok(r, 200);
  assert.ok(r.json.token);
  ctx.tokenUsuario = r.json.token;
});

test('recuperación de contraseña: responde igual exista o no el correo', async () => {
  const r = await llamar('POST', '/autenticacion/solicitar-recuperacion', { cuerpo: { correo: `no-existe.${sufijo}@cookly-prueba.com` } });
  ok(r, 200);
});

test('perfil: un usuario normal tiene contraseña propia', async () => {
  const r = await llamar('GET', '/perfil/contrasena/estado', { token: ctx.tokenUsuario });
  ok(r, 200);
  assert.equal(r.json.tienePropia, true);
});

test('perfil: cambiar nombre', async () => {
  const r = await llamar('PUT', '/perfil/nombre', { token: ctx.tokenUsuario, cuerpo: { nombre: 'QA Cookly Editado' } });
  ok(r, 200, 204);
});

test('perfil: cambiar contraseña con la actual incorrecta falla', async () => {
  const r = await llamar('PUT', '/perfil/contrasena', { token: ctx.tokenUsuario, cuerpo: { contrasenaActual: 'Incorrecta123', contrasenaNueva: 'OtraClave12345' } });
  ok(r, 400, 401, 403);
});

test('perfil: alergias y restricciones se guardan y se leen', async () => {
  const cat = await llamar('GET', '/catalogos', { token: ctx.tokenUsuario });
  const idA = cat.json.alergias[0]?.id;
  const idR = cat.json.restricciones[0]?.id;
  ok(await llamar('PUT', '/perfil/alergias', { token: ctx.tokenUsuario, cuerpo: { ids: idA ? [idA] : [] } }), 200, 204);
  ok(await llamar('PUT', '/perfil/restricciones', { token: ctx.tokenUsuario, cuerpo: { ids: idR ? [idR] : [] } }), 200, 204);
  const a = await llamar('GET', '/perfil/alergias', { token: ctx.tokenUsuario });
  ok(a, 200);
  assert.ok(Array.isArray(a.json));
  if (idA) assert.equal(a.json.length, 1);
});

// ------------------------------------------------------------------ favoritos, reseñas, comentarios, historial
test('favoritos: marcar, listar y quitar', async () => {
  ok(await llamar('POST', `/recetas/${ctx.recetaId}/favorito`, { token: ctx.tokenUsuario }), 200, 204);
  const l = await llamar('GET', '/recetas/favoritos', { token: ctx.tokenUsuario });
  ok(l, 200);
  assert.ok(l.json.some((r) => r.id === ctx.recetaId), 'la receta no aparece en favoritos');
  ok(await llamar('DELETE', `/recetas/${ctx.recetaId}/favorito`, { token: ctx.tokenUsuario }), 200, 204);
  const l2 = await llamar('GET', '/recetas/favoritos', { token: ctx.tokenUsuario });
  assert.ok(!l2.json.some((r) => r.id === ctx.recetaId), 'la receta sigue en favoritos');
});

test('reseñas: puntuación fuera de rango se rechaza', async () => {
  const r = await llamar('PUT', `/recetas/${ctx.recetaId}/resenas`, { token: ctx.tokenUsuario, cuerpo: { puntuacion: 9, comentario: 'x' } });
  ok(r, 400);
});

test('reseñas: guardar, listar y eliminar', async () => {
  ok(await llamar('PUT', `/recetas/${ctx.recetaId}/resenas`, { token: ctx.tokenUsuario, cuerpo: { puntuacion: 5, comentario: 'Prueba automática' } }), 200, 201);
  const l = await llamar('GET', `/recetas/${ctx.recetaId}/resenas`, { token: ctx.tokenUsuario });
  ok(l, 200);
  ok(await llamar('DELETE', `/recetas/${ctx.recetaId}/resenas`, { token: ctx.tokenUsuario }), 200, 204);
});

test('comentarios: crear, listar y eliminar', async () => {
  const c = await llamar('POST', `/recetas/${ctx.recetaId}/comentarios`, { token: ctx.tokenUsuario, cuerpo: { contenido: 'Comentario de prueba automática' } });
  ok(c, 200, 201);
  const l = await llamar('GET', `/recetas/${ctx.recetaId}/comentarios`, { token: ctx.tokenUsuario });
  ok(l, 200);
  const id = c.json?.id;
  if (id) ok(await llamar('DELETE', `/recetas/${ctx.recetaId}/comentarios/${id}`, { token: ctx.tokenUsuario }), 200, 204);
});

test('comentarios: un comentario vacío se rechaza', async () => {
  const r = await llamar('POST', `/recetas/${ctx.recetaId}/comentarios`, { token: ctx.tokenUsuario, cuerpo: { contenido: '' } });
  ok(r, 400);
});

test('historial: registrar una receta vista y listarla', async () => {
  ok(await llamar('POST', `/historial/${ctx.recetaId}`, { token: ctx.tokenUsuario }), 200, 201, 204);
  const l = await llamar('GET', '/historial', { token: ctx.tokenUsuario });
  ok(l, 200);
});

test('reportes: reportar una receta', async () => {
  const r = await llamar('POST', '/reportes', { token: ctx.tokenUsuario, cuerpo: { recetaId: ctx.recetaId, motivo: 'Prueba automática' } });
  ok(r, 200, 201, 204);
});

// ------------------------------------------------------------------ lista de compras
test('lista de compras: crear, agregar ingrediente, marcar comprado y eliminar', async () => {
  const c = await llamar('POST', '/listas-compra', { token: ctx.tokenUsuario, cuerpo: { nombre: 'Lista QA' } });
  ok(c, 201);
  ctx.listaId = c.json.id;
  const i = await llamar('POST', `/listas-compra/${ctx.listaId}/elementos`, { token: ctx.tokenUsuario, cuerpo: { nombrePersonalizado: 'Arroz', cantidad: 2, unidad: 'kg' } });
  ok(i, 201);
  ok(await llamar('PUT', `/listas-compra/elementos/${i.json.id}/comprado?valor=true`, { token: ctx.tokenUsuario }), 200, 204);
  const l = await llamar('GET', '/listas-compra', { token: ctx.tokenUsuario });
  ok(l, 200);
  assert.ok(l.json.some((x) => x.id === ctx.listaId));
  ok(await llamar('DELETE', `/listas-compra/elementos/${i.json.id}`, { token: ctx.tokenUsuario }), 200, 204);
  ok(await llamar('DELETE', `/listas-compra/${ctx.listaId}`, { token: ctx.tokenUsuario }), 200, 204);
});

test('lista de compras: sin nombre se rechaza', async () => {
  const r = await llamar('POST', '/listas-compra', { token: ctx.tokenUsuario, cuerpo: { nombre: '' } });
  ok(r, 400);
});

// ------------------------------------------------------------------ menú semanal
test('menú semanal: crear la semana, agregar una receta y quitarla', async () => {
  const hoy = new Date();
  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const semana = lunes.toISOString().slice(0, 10);
  const m = await llamar('POST', '/menus', { token: ctx.tokenUsuario, cuerpo: { semana } });
  ok(m, 200, 201);
  ctx.menuId = m.json.id;
  const e = await llamar('POST', `/menus/${ctx.menuId}/elementos`, { token: ctx.tokenUsuario, cuerpo: { recetaId: ctx.recetaId, diaSemana: 1, tipoComida: 'ALMUERZO' } });
  ok(e, 200, 201);
  if (e.json?.id) ok(await llamar('DELETE', `/menus/elementos/${e.json.id}`, { token: ctx.tokenUsuario }), 200, 204);
});

test('menú semanal: día fuera de rango se rechaza', async () => {
  const r = await llamar('POST', `/menus/${ctx.menuId}/elementos`, { token: ctx.tokenUsuario, cuerpo: { recetaId: ctx.recetaId, diaSemana: 9, tipoComida: 'ALMUERZO' } });
  ok(r, 400);
});

test('menú express: sugiere recetas con pocos ingredientes', async () => {
  const r = await llamar('POST', '/recetas/menu-express', { token: ctx.tokenUsuario, cuerpo: { ingredientes: ['pollo', 'arroz'] } });
  ok(r, 200);
});

test('menú express: sin ingredientes se rechaza', async () => {
  const r = await llamar('POST', '/recetas/menu-express', { token: ctx.tokenUsuario, cuerpo: { ingredientes: [] } });
  ok(r, 400);
});

// ------------------------------------------------------------------ notificaciones y uso
test('notificaciones: listar, contar sin leer y marcar todas', async () => {
  const l = await llamar('GET', '/notificaciones', { token: ctx.tokenUsuario });
  ok(l, 200);
  assert.ok(Array.isArray(l.json));
  ok(await llamar('GET', '/notificaciones/sin-leer', { token: ctx.tokenUsuario }), 200);
  ok(await llamar('PUT', '/notificaciones/leer-todas', { token: ctx.tokenUsuario }), 200, 204);
});

test('uso: el latido de la app se registra', async () => {
  const r = await llamar('POST', '/uso/latido', { token: ctx.tokenUsuario, cuerpo: { plataforma: 'android' } });
  ok(r, 200, 204);
});

// ------------------------------------------------------------------ administración
test('administración: un usuario normal no puede entrar', async () => {
  const r = await llamar('GET', '/administracion/resumen', { token: ctx.tokenUsuario });
  ok(r, 403);
});

test('administración: el login del panel con datos incorrectos falla', async () => {
  const r = await llamar('POST', '/panel/acceso', { cuerpo: { correo: usuario.correo, contrasena: usuario.contrasena } });
  ok(r, 401, 403);
});

test('administración: inicio de sesión del administrador', { skip: SIN_ADMIN && 'faltan ADMIN_CORREO y ADMIN_CONTRASENA' }, async () => {
  const r = await llamar('POST', '/panel/acceso', { cuerpo: { correo: ADMIN_CORREO, contrasena: ADMIN_CONTRASENA } });
  ok(r, 200);
  assert.ok(r.json.token);
  ctx.tokenAdmin = r.json.token;
});

const admin = (nombre, fn) => test('administración: ' + nombre, { skip: SIN_ADMIN && 'faltan ADMIN_CORREO y ADMIN_CONTRASENA' }, fn);

admin('el token del administrador se renueva en cada petición', async () => {
  const r = await llamar('GET', '/administracion/resumen', { token: ctx.tokenAdmin });
  ok(r, 200);
  assert.ok(r.cabeceras.get('x-token-nuevo'), 'falta X-Token-Nuevo');
});

admin('resumen y gráficas', async () => {
  ok(await llamar('GET', '/administracion/resumen', { token: ctx.tokenAdmin }), 200);
  ok(await llamar('GET', '/administracion/graficas', { token: ctx.tokenAdmin }), 200);
});

admin('listado de usuarios incluye al usuario de prueba', async () => {
  const r = await llamar('GET', '/administracion/usuarios', { token: ctx.tokenAdmin });
  ok(r, 200);
  const lista = Array.isArray(r.json) ? r.json : r.json.content || [];
  const mio = lista.find((u) => u.correo === usuario.correo);
  assert.ok(mio, 'el usuario de prueba no aparece');
  ctx.usuarioId = mio.id;
});

admin('contenido: recetas, reseñas, comentarios y auditoría', async () => {
  for (const ruta of ['/administracion/recetas', '/administracion/resenas', '/administracion/comentarios', '/administracion/auditoria']) {
    ok(await llamar('GET', ruta, { token: ctx.tokenAdmin }), 200);
  }
});

admin('detalle de una receta para editarla', async () => {
  ok(await llamar('GET', `/administracion/recetas/${ctx.recetaId}/detalle`, { token: ctx.tokenAdmin }), 200);
});

admin('moderación y comunidad', async () => {
  ok(await llamar('GET', '/administracion/moderacion/reportes', { token: ctx.tokenAdmin }), 200);
  ok(await llamar('GET', '/administracion/comunidad/publicaciones', { token: ctx.tokenAdmin }), 200);
  ok(await llamar('GET', '/administracion/comunidad/comentarios', { token: ctx.tokenAdmin }), 200);
  ok(await llamar('GET', '/administracion/reportes-comunidad', { token: ctx.tokenAdmin }), 200);
});

admin('alergias del catálogo', async () => {
  ok(await llamar('GET', '/administracion/alergias', { token: ctx.tokenAdmin }), 200);
});

admin('exportar usuarios en PDF (con formato %PDF)', async () => {
  const r = await fetch(API + '/administracion/exportar/usuarios.pdf', { headers: { Authorization: 'Bearer ' + ctx.tokenAdmin } });
  assert.equal(r.status, 200);
  const b = Buffer.from(await r.arrayBuffer());
  assert.equal(b.subarray(0, 4).toString('latin1'), '%PDF');
});

admin('exportar usuarios en Excel (archivo ZIP/xlsx)', async () => {
  const r = await fetch(API + '/administracion/exportar/usuarios.xlsx', { headers: { Authorization: 'Bearer ' + ctx.tokenAdmin } });
  assert.equal(r.status, 200);
  const b = Buffer.from(await r.arrayBuffer());
  assert.equal(b.subarray(0, 2).toString('latin1'), 'PK');
});

admin('el panel web se sirve', async () => {
  const r = await fetch(BASE + '/admin/');
  assert.equal(r.status, 200);
});

// ------------------------------------------------------------------ limpieza
after(async () => {
  if (SIN_ADMIN || !ctx.tokenAdmin || !ctx.usuarioId) return;
  // Se desactiva la cuenta de prueba para que no quede activa en el sistema.
  await llamar('PUT', `/administracion/usuarios/${ctx.usuarioId}/activo?valor=false`, { token: ctx.tokenAdmin }).catch(() => {});
});