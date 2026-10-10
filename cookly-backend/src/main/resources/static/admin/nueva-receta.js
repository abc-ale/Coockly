/* Cookly · Panel administrativo · Formulario "Nueva receta" con fotos (Cloudinary).
   Las fotos se reducen en el navegador (máx. 1600 px) y el servidor las sube a Cloudinary.
   Todo texto del usuario se inserta con textContent, nunca como HTML. */
(function () {
  'use strict';

  var form = document.getElementById('form-receta');
  if (!form) return;

  var MAX_FOTOS = 6;
  var MAX_LADO = 1600;
  var $ = function (id) { return document.getElementById(id); };

  var fotos = [];               // { archivo: File|Blob, vista: urlTemporal }
  var etiquetasCargadas = false;

  function el(tag, attrs, hijos) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'clase') n.className = attrs[k];
      else if (k === 'texto') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (hijos || []).forEach(function (h) { n.appendChild(h); });
    return n;
  }

  function token() {
    try { return JSON.parse(sessionStorage.getItem('cookly_admin')).token; } catch (e) { return null; }
  }

  function mensaje(texto, tipo) {
    var m = $('receta-mensaje');
    m.textContent = texto || '';
    m.className = 'resultado' + (tipo === 'error' ? ' error' : '');
    m.hidden = !texto;
    if (texto) m.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ------------------------------------------------------------ etiquetas

  function cargarEtiquetas() {
    if (etiquetasCargadas || !token()) return;
    fetch('/api/v1/catalogos', { headers: { Authorization: 'Bearer ' + token() } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (c) {
        var cont = $('receta-etiquetas');
        cont.textContent = '';
        (c.etiquetas || []).forEach(function (e) {
          var id = 'et-' + e.id;
          var caja = el('input', { type: 'checkbox', id: id, value: String(e.id) });
          cont.appendChild(el('span', { clase: 'chip-et' }, [caja, el('label', { 'for': id, texto: e.nombre })]));
        });
        if (!(c.etiquetas || []).length) cont.appendChild(el('span', { clase: 'ayuda-form', texto: 'Aún no hay etiquetas creadas.' }));
        etiquetasCargadas = true;
      })
      .catch(function () { /* se reintenta la próxima vez que se abra la sección */ });
  }

  // ------------------------------------------------------------ ingredientes y pasos

  function filaIngrediente(valores) {
    valores = valores || {};
    var fila = el('div', { clase: 'fila-ing' });
    fila.appendChild(el('input', { type: 'text', clase: 'ing-nombre', placeholder: 'Ingrediente (ej. Arroz)', maxlength: '120', 'aria-label': 'Ingrediente', value: valores.nombre || '' }));
    fila.appendChild(el('input', { type: 'text', clase: 'ing-cantidad', placeholder: 'Cantidad', inputmode: 'decimal', maxlength: '8', 'aria-label': 'Cantidad', value: valores.cantidad || '' }));
    fila.appendChild(el('input', { type: 'text', clase: 'ing-unidad', placeholder: 'Unidad (g, taza…)', maxlength: '20', 'aria-label': 'Unidad', value: valores.unidad || '' }));
    var quitar = el('button', { type: 'button', clase: 'boton chico peligro', 'aria-label': 'Quitar ingrediente', texto: 'Quitar' });
    quitar.addEventListener('click', function () {
      if ($('receta-ingredientes').children.length > 1) fila.remove();
    });
    fila.appendChild(quitar);
    return fila;
  }

  function renumerarPasos() {
    Array.prototype.forEach.call($('receta-pasos').children, function (fila, i) {
      fila.querySelector('.paso-num').textContent = String(i + 1);
      fila.querySelector('textarea').setAttribute('aria-label', 'Paso ' + (i + 1));
    });
  }

  function filaPaso(texto) {
    var fila = el('div', { clase: 'fila-paso' });
    fila.appendChild(el('span', { clase: 'paso-num', texto: '1' }));
    var area = el('textarea', { rows: '2', maxlength: '800', placeholder: 'Describe este paso' });
    area.value = texto || '';
    fila.appendChild(area);
    var quitar = el('button', { type: 'button', clase: 'boton chico peligro', 'aria-label': 'Quitar paso', texto: 'Quitar' });
    quitar.addEventListener('click', function () {
      if ($('receta-pasos').children.length > 1) { fila.remove(); renumerarPasos(); }
    });
    fila.appendChild(quitar);
    return fila;
  }

  // ------------------------------------------------------------ fotos

  /** Reduce la foto a máx. 1600 px y la guarda como JPG; si algo falla se usa la original. */
  function reducir(archivo) {
    if (!window.createImageBitmap || !archivo.type || archivo.type.indexOf('image/') !== 0) return Promise.resolve(archivo);
    return createImageBitmap(archivo).then(function (img) {
      var escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
      var ancho = Math.round(img.width * escala), alto = Math.round(img.height * escala);
      var lienzo = document.createElement('canvas');
      lienzo.width = ancho; lienzo.height = alto;
      var ctx = lienzo.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, ancho, alto);
      ctx.drawImage(img, 0, 0, ancho, alto);
      return new Promise(function (ok) {
        lienzo.toBlob(function (b) { ok(b && b.size < archivo.size ? b : archivo); }, 'image/jpeg', 0.85);
      });
    }).catch(function () { return archivo; });
  }

  function pintarFotos() {
    var cont = $('receta-fotos');
    cont.textContent = '';
    fotos.forEach(function (f, i) {
      var img = el('img', { src: f.vista, alt: 'Foto ' + (i + 1) + ' de la receta' });
      var barra = el('div', { clase: 'foto-acciones' });
      if (i > 0) {
        var portada = el('button', { type: 'button', clase: 'boton chico secundario', texto: 'Hacer portada' });
        portada.addEventListener('click', function () { fotos.unshift(fotos.splice(i, 1)[0]); pintarFotos(); });
        barra.appendChild(portada);
      }
      var quitar = el('button', { type: 'button', clase: 'boton chico peligro', texto: 'Quitar' });
      quitar.addEventListener('click', function () { URL.revokeObjectURL(f.vista); fotos.splice(i, 1); pintarFotos(); });
      barra.appendChild(quitar);
      var tarjeta = el('figure', { clase: 'foto' }, [img]);
      if (i === 0) tarjeta.appendChild(el('span', { clase: 'foto-etiqueta', texto: 'Portada' }));
      tarjeta.appendChild(barra);
      cont.appendChild(tarjeta);
    });
    $('receta-contador-fotos').textContent = fotos.length + ' de ' + MAX_FOTOS + ' fotos';
    $('receta-zona').hidden = fotos.length >= MAX_FOTOS;
  }

  function agregarFotos(lista) {
    var nuevas = Array.prototype.slice.call(lista).filter(function (f) { return /^image\/(jpeg|png|webp)$/.test(f.type); });
    if (nuevas.length < lista.length) mensaje('Solo se aceptan fotos JPG, PNG o WebP.', 'error'); else mensaje('');
    nuevas = nuevas.slice(0, MAX_FOTOS - fotos.length);
    return Promise.all(nuevas.map(reducir)).then(function (listas) {
      listas.forEach(function (b) { fotos.push({ archivo: b, vista: URL.createObjectURL(b) }); });
      pintarFotos();
    });
  }

  // ------------------------------------------------------------ enviar

  function recoger() {
    var ingredientes = [];
    Array.prototype.forEach.call($('receta-ingredientes').children, function (fila) {
      var nombre = fila.querySelector('.ing-nombre').value.trim();
      if (!nombre) return;
      var cant = fila.querySelector('.ing-cantidad').value.trim().replace(',', '.');
      var unidad = fila.querySelector('.ing-unidad').value.trim();
      ingredientes.push({ nombre: nombre, cantidad: cant && !isNaN(Number(cant)) ? Number(cant) : null, unidad: unidad || null });
    });
    var pasos = [];
    Array.prototype.forEach.call($('receta-pasos').querySelectorAll('textarea'), function (t) {
      var texto = t.value.trim();
      if (texto) pasos.push({ orden: pasos.length + 1, instruccion: texto });
    });
    var etiquetas = Array.prototype.map.call($('receta-etiquetas').querySelectorAll('input:checked'), function (c) { return Number(c.value); });
    var minutos = $('receta-minutos').value.trim();
    return {
      nombre: $('receta-nombre').value.trim(),
      descripcion: $('receta-descripcion').value.trim() || null,
      minutosPreparacion: minutos ? Number(minutos) : null,
      ingredientes: ingredientes, pasos: pasos, etiquetas: etiquetas
    };
  }

  function limpiar() {
    form.reset();
    fotos.forEach(function (f) { URL.revokeObjectURL(f.vista); });
    fotos = [];
    pintarFotos();
    $('receta-ingredientes').textContent = '';
    $('receta-ingredientes').appendChild(filaIngrediente());
    $('receta-pasos').textContent = '';
    $('receta-pasos').appendChild(filaPaso());
    renumerarPasos();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = recoger();
    var minutosOk = d.minutosPreparacion === null || (Number.isInteger(d.minutosPreparacion) && d.minutosPreparacion >= 1 && d.minutosPreparacion <= 2000);
    if (!d.nombre) return mensaje('Escribe el nombre de la receta.', 'error');
    if (!minutosOk) return mensaje('Los minutos deben ser un número entero entre 1 y 2000.', 'error');
    if (!d.ingredientes.length) return mensaje('Agrega al menos un ingrediente.', 'error');
    if (!d.pasos.length) return mensaje('Agrega al menos un paso de preparación.', 'error');
    if (!fotos.length) return mensaje('Sube al menos una foto de la receta.', 'error');
    if (!token()) return mensaje('Tu sesión venció. Entra de nuevo.', 'error');

    var datos = new FormData();
    datos.append('datos', new Blob([JSON.stringify(d)], { type: 'application/json' }));
    fotos.forEach(function (f, i) { datos.append('imagenes', f.archivo, 'foto-' + (i + 1) + '.jpg'); });

    var boton = $('receta-guardar');
    boton.disabled = true;
    boton.textContent = 'Subiendo fotos y guardando…';
    mensaje('');
    fetch('/api/v1/administracion/recetas', { method: 'POST', headers: { Authorization: 'Bearer ' + token() }, body: datos })
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (c) {
          if (!r.ok) throw new Error((c && c.mensaje) || (r.status === 403 ? 'No tienes permiso para crear recetas.' : 'No se pudo guardar la receta (código ' + r.status + ').'));
          return c;
        });
      })
      .then(function (c) {
        limpiar();
        mensaje('¡Listo! La receta "' + c.nombre + '" ya está publicada y aparece en la app.');
      })
      .catch(function (ex) { mensaje(ex.message === 'Failed to fetch' ? 'No se pudo conectar con el servidor.' : ex.message, 'error'); })
      .then(function () { boton.disabled = false; boton.textContent = 'Guardar receta'; });
  });

  $('receta-limpiar').addEventListener('click', function () { limpiar(); mensaje(''); });
  $('receta-mas-ingrediente').addEventListener('click', function () { $('receta-ingredientes').appendChild(filaIngrediente()); });
  $('receta-mas-paso').addEventListener('click', function () { $('receta-pasos').appendChild(filaPaso()); renumerarPasos(); });

  var entrada = $('receta-archivos');
  entrada.addEventListener('change', function () { agregarFotos(entrada.files).then(function () { entrada.value = ''; }); });
  var zona = $('receta-zona');
  ['dragenter', 'dragover'].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add('arrastrando'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.remove('arrastrando'); }); });
  zona.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) agregarFotos(e.dataTransfer.files); });

  function alMostrar() { if (location.hash === '#nueva-receta') cargarEtiquetas(); }
  window.addEventListener('hashchange', alMostrar);

  limpiar();
  alMostrar();
  // Si la sesión se inicia después de cargar la página, la sección se abre más tarde: reintento corto.
  setTimeout(alMostrar, 1500);
})();