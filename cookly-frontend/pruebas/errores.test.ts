// @ts-nocheck  (archivo de pruebas de Node: el editor no trae los tipos de "node:test")
// Pruebas de lib/errores.ts: que los errores técnicos se vean como frases claras.
// Ejecutar desde cookly-frontend:  npx tsx --test pruebas/errores.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limpiarMensaje } from '../lib/errores';

test('sin mensaje devuelve lo mismo', () => {
  assert.equal(limpiarMensaje(undefined), undefined);
  assert.equal(limpiarMensaje(''), '');
});

test('error de red', () => {
  assert.match(limpiarMensaje('Network Error')!, /conectar con el servidor/);
});

test('tiempo de espera agotado', () => {
  assert.match(limpiarMensaje('timeout of 15000ms exceeded')!, /tardando en responder/);
});

test('sesión vencida (401 o 403)', () => {
  assert.match(limpiarMensaje('Request failed with status code 401')!, /sesión venció/);
  assert.match(limpiarMensaje('Request failed with status code 403')!, /sesión venció/);
});

test('un error técnico de Java no se muestra al usuario', () => {
  const m = limpiarMensaje('java.lang.NullPointerException at com.cookly.servicios.ServicioReceta')!;
  assert.doesNotMatch(m, /java|cookly|Exception/);
  assert.match(m, /Algo salió mal/);
});

test('un mensaje claro del servidor se conserva', () => {
  assert.equal(limpiarMensaje('Credenciales inválidas'), 'Credenciales inválidas');
});