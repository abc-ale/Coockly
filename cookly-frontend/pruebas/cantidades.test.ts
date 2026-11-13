// @ts-nocheck  (archivo de pruebas de Node: el editor no trae los tipos de "node:test")
// Pruebas automáticas del cálculo de porciones y conversión de unidades (lib/cantidades.ts).
// Ejecutar desde cookly-frontend:  npx tsx --test pruebas/cantidades.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PORCIONES_BASE, MIN_PERSONAS, MAX_PERSONAS,
  limitar, escalar, formatoCantidad, unidadConPlural, textoIngrediente,
} from '../lib/cantidades';

test('limitar: respeta el mínimo y el máximo de personas', () => {
  assert.equal(limitar(0), MIN_PERSONAS);
  assert.equal(limitar(-5), MIN_PERSONAS);
  assert.equal(limitar(9999), MAX_PERSONAS);
  assert.equal(limitar(3.6), 4);
  assert.equal(limitar(NaN), PORCIONES_BASE);
});

test('escalar: con las mismas personas de la receta la cantidad no cambia', () => {
  const e = escalar(2, 'tazas', 'arroz', PORCIONES_BASE, 'original');
  assert.equal(e.valor, 2);
  assert.equal(e.unidad, 'taza');
});

test('escalar: el doble de personas duplica la cantidad', () => {
  const e = escalar(2, 'tazas', 'arroz', PORCIONES_BASE * 2, 'original');
  assert.equal(e.valor, 4);
});

test('escalar: la mitad de personas reduce la cantidad a la mitad', () => {
  const e = escalar(400, 'g', 'pollo', PORCIONES_BASE / 2, 'original');
  assert.equal(e.valor, 200);
  assert.equal(e.unidad, 'g');
});

test('escalar: 1000 g pasan a 1 kg en modo original', () => {
  const e = escalar(500, 'g', 'papa', PORCIONES_BASE * 2, 'original');
  assert.equal(e.valor, 1);
  assert.equal(e.unidad, 'kg');
});

test('escalar: tazas de arroz a gramos (aproximado)', () => {
  const e = escalar(1, 'taza', 'arroz', PORCIONES_BASE, 'gramos');
  assert.equal(e.valor, 200);
  assert.equal(e.unidad, 'g');
  assert.equal(e.aproximado, true);
});

test('escalar: gramos a kilos', () => {
  const e = escalar(1500, 'g', 'papa', PORCIONES_BASE, 'kilos');
  assert.equal(e.valor, 1.5);
  assert.equal(e.unidad, 'kg');
});

test('escalar: 240 ml equivalen a 1 taza', () => {
  const e = escalar(240, 'ml', 'leche', PORCIONES_BASE, 'tazas');
  assert.equal(e.valor, 1);
  assert.equal(e.unidad, 'taza');
});

test('escalar: una unidad desconocida se deja igual', () => {
  const e = escalar(3, 'unidad', 'huevo', PORCIONES_BASE, 'gramos');
  assert.equal(e.valor, 3);
  assert.equal(e.unidad, 'unidad');
});

test('formatoCantidad: fracciones de cocina', () => {
  assert.equal(formatoCantidad(0.5), '½');
  assert.equal(formatoCantidad(0.25), '¼');
  assert.equal(formatoCantidad(4.17), '4 ¼');
  assert.equal(formatoCantidad(2), '2');
  assert.equal(formatoCantidad(250), '250');
});

test('unidadConPlural: plural solo cuando corresponde', () => {
  assert.equal(unidadConPlural('taza', 2), 'tazas');
  assert.equal(unidadConPlural('taza', 1), 'taza');
  assert.equal(unidadConPlural('g', 500), 'g');
  assert.equal(unidadConPlural('unidad', 3), 'unidades');
});

test('textoIngrediente: arma la frase final', () => {
  assert.equal(textoIngrediente(2, 'taza', 'arroz', PORCIONES_BASE, 'original'), '2 tazas de arroz');
});