/* Cookly · Panel administrativo · Extras
   Agrega al panel, sin tocar admin.js: Reseñas, Comunidad (publicaciones y comentarios), Alergias,
   Editar recetas (con fotos) e Importar recetas desde CSV.
   Todo texto que viene del servidor se inserta con textContent (nunca como HTML). */
(function () {
  'use strict';

  var API = '/api/v1';
  var CLAVE_SESION = 'cookly_admin';

  // ------------------------------------------------------------------ utilidades

  function sesion() { try { return JSON.parse(sessionStorage.getItem(CLAVE_SESION)); } catch (e) { return null; } }

  function el(tag, atributos, hijos) {
    var n = document.createElement(tag);
    Object.keys(atributos || {}).forEach(function (k) {
      var v = atributos[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'texto') n.textContent = v;
      else if (k === 'clase') n.className = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    (hijos || []).forEach(function (h) { if (h) n.appendChild(typeof h === 'string' ? document.createTextNode(h) : h); });
    return n;
  }
  function vaciar(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function sinTildes(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }

  function aviso(texto, esError) {
    var cont = document.getElementById('avisos');
    if (!cont) return;
    var n = el('div', { clase: 'aviso' + (esError ? ' error' : ''), texto: texto });
    cont.appendChild(n);
    setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, esError ? 7000 : 4000);
  }

  function api(ruta, opciones) {
    var s = sesion();
    var op = Object.assign({}, opciones);
    var cab = Object.assign({}, op.headers || {});
    if (s) cab.Authorization = 'Bearer ' + s.token;
    op.headers = cab;
    return fetch(API + ruta, op).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (c) {
        if (r.status === 401) throw new Error('Tu sesión venció. Entra de nuevo.');
        if (!r.ok) throw new Error((c && c.mensaje) || 'No se pudo completar la acción (código ' + r.status + ').');
        return c;
      });
    });
  }
  function apiJson(ruta, metodo, cuerpo) {
    return api(ruta, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  }
  function conRed(e) { return e && e.message === 'Failed to fetch' ? new Error('No se pudo conectar con el servidor.') : e; }

  function debounce(fn, ms) { var t; return function () { var a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(null, a); }, ms); }; }

  // ------------------------------------------------------------------ lista genérica (reseñas, comunidad)

  function listaBorrable(cfg) {
    return function (raiz) {
      var cuerpo = el('div', { clase: 'px-lista' });
      var buscar = el('input', { type: 'search', placeholder: cfg.placeholder, 'aria-label': cfg.placeholder, autocomplete: 'off' });
      var soloBajas = null;
      var herr = [el('div', { clase: 'campo' }, [buscar])];
      if (cfg.filtroBajas) {
        soloBajas = el('input', { type: 'checkbox', id: 'px-bajas-' + cfg.id });
        herr.push(el('label', { clase: 'px-check', 'for': 'px-bajas-' + cfg.id }, [soloBajas, 'Solo 1 y 2 estrellas']));
      }
      raiz.appendChild(el('div', { clase: 'herramientas' }, herr));
      raiz.appendChild(cuerpo);

      var ultima = [];
      function pintar() {
        vaciar(cuerpo);
        var datos = ultima.filter(function (f) { return !(soloBajas && soloBajas.checked) || Number(f.estrellas) <= 2; });
        if (!datos.length) { cuerpo.appendChild(el('p', { clase: 'px-vacio', texto: cfg.vacio })); return; }
        datos.forEach(function (f) {
          var borrar = el('button', { type: 'button', clase: 'boton chico peligro', texto: 'Eliminar' });
          borrar.addEventListener('click', function () {
            if (!window.confirm(cfg.confirmar)) return;
            borrar.disabled = true;
            api(cfg.ruta + '/' + encodeURIComponent(f.id), { method: 'DELETE' })
              .then(function () { aviso(cfg.hecho); return cargar(); })
              .catch(function (e) { aviso(conRed(e).message, true); borrar.disabled = false; });
          });
          var meta = cfg.meta(f).filter(Boolean).join(' · ');
          cuerpo.appendChild(el('article', { clase: 'px-fila' }, [
            el('div', { clase: 'px-fila-texto' }, [
              el('div', { clase: 'px-fila-cab' }, [
                cfg.estrellas && f.estrellas ? el('span', { clase: 'px-estrellas', texto: f.estrellas + ' de 5', 'aria-label': f.estrellas + ' de 5 estrellas' }) : null,
                el('strong', { texto: f.autor || '' })
              ]),
              el('p', { clase: 'px-contenido', texto: f.contenido || '(sin texto)' }),
              el('div', { clase: 'px-meta', texto: meta })
            ]),
            borrar
          ]));
        });
      }
      function cargar() {
        var q = buscar.value.trim();
        return api(cfg.ruta + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (l) { ultima = l || []; pintar(); })
          .catch(function (e) { aviso(conRed(e).message, true); });
      }
      buscar.addEventListener('input', debounce(cargar, 350));
      if (soloBajas) soloBajas.addEventListener('change', pintar);
      return cargar;
    };
  }

  var construirResenas = listaBorrable({
    id: 'rs', ruta: '/administracion/resenas', placeholder: 'Buscar por opinión, autor, correo o receta',
    vacio: 'No hay reseñas.', confirmar: '¿Eliminar esta reseña? No se puede deshacer.', hecho: 'Reseña eliminada.',
    estrellas: true, filtroBajas: true,
    meta: function (f) { return [f.recetaNombre, f.fecha]; }
  });
  var construirPosts = listaBorrable({
    id: 'cp', ruta: '/administracion/comunidad/publicaciones', placeholder: 'Buscar por texto o autor',
    vacio: 'No hay publicaciones.', confirmar: '¿Eliminar esta publicación? También se borran sus comentarios.', hecho: 'Publicación eliminada.',
    meta: function (f) { return [f.fecha, 'Foto: ' + f.foto, f.comentarios + ' comentarios']; }
  });
  var construirComentariosCom = listaBorrable({
    id: 'cc', ruta: '/administracion/comunidad/comentarios', placeholder: 'Buscar por texto o autor',
    vacio: 'No hay comentarios.', confirmar: '¿Eliminar este comentario? Si tiene respuestas, también se borran.', hecho: 'Comentario eliminado.',
    meta: function (f) { return [f.tipo, f.fecha, f.publicacion ? 'En: ' + f.publicacion : '']; }
  });

  // ------------------------------------------------------------------ alergias

  function construirAlergias(raiz) {
    var catalogo = [], refs = {};

    function pintarCatalogo() {
      vaciar(refs.catalogo);
      if (!catalogo.length) { refs.catalogo.appendChild(el('p', { clase: 'px-vacio', texto: 'Todavía no hay alergias.' })); return; }
      catalogo.forEach(function (a) {
        var quitar = el('button', { type: 'button', clase: 'boton chico peligro', texto: 'Eliminar', 'aria-label': 'Eliminar ' + a.nombre });
        quitar.addEventListener('click', function () {
          if (!window.confirm('¿Eliminar "' + a.nombre + '"? Se quitará también de las personas y de los ingredientes que la tengan.')) return;
          quitar.disabled = true;
          api('/administracion/alergias/' + a.id, { method: 'DELETE' })
            .then(function () { aviso('Alergia eliminada.'); return todo(); })
            .catch(function (e) { aviso(conRed(e).message, true); quitar.disabled = false; });
        });
        refs.catalogo.appendChild(el('div', { clase: 'px-item' }, [
          el('div', { clase: 'nombre', texto: a.nombre }),
          el('div', { clase: 'datos', texto: a.personas + ' personas · ' + a.ingredientes + ' ingredientes' }),
          quitar
        ]));
      });
    }
    function cargarCatalogo() { return api('/administracion/alergias').then(function (l) { catalogo = l || []; pintarCatalogo(); }); }

    function filaIngrediente(ing) {
      var elegidas = {};
      (ing.alergias ? String(ing.alergias).split(',') : []).forEach(function (x) { if (x) elegidas[x] = true; });
      var chips = el('div', { clase: 'px-chips' });
      catalogo.forEach(function (a) {
        var c = el('button', { type: 'button', clase: 'px-chip', 'aria-pressed': elegidas[String(a.id)] ? 'true' : 'false', texto: a.nombre });
        c.addEventListener('click', function () {
          var on = c.getAttribute('aria-pressed') !== 'true';
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
          if (on) elegidas[String(a.id)] = true; else delete elegidas[String(a.id)];
        });
        chips.appendChild(c);
      });
      var estado = el('span', { clase: 'px-estado' + (ing.revisado ? ' ok' : ''), texto: ing.revisado ? 'Revisado' : 'Sin revisar' });
      var guardar = el('button', { type: 'button', clase: 'boton chico primario', texto: 'Guardar' });
      guardar.addEventListener('click', function () {
        guardar.disabled = true;
        apiJson('/administracion/alergias/ingredientes/' + ing.id, 'PUT', { alergiaIds: Object.keys(elegidas).map(Number) })
          .then(function () { aviso('"' + ing.nombre + '" guardado.'); estado.className = 'px-estado ok'; estado.textContent = 'Revisado'; return cargarCatalogo(); })
          .catch(function (e) { aviso(conRed(e).message, true); })
          .then(function () { guardar.disabled = false; });
      });
      return el('div', { clase: 'px-ing' }, [
        el('div', { clase: 'px-ing-cab' }, [el('div', { clase: 'nombre', texto: ing.nombre }), estado, guardar]), chips
      ]);
    }
    function cargarIngredientes() {
      var q = refs.buscar.value.trim();
      return api('/administracion/alergias/ingredientes?sinRevisar=' + (refs.sinRevisar.checked ? 'true' : 'false') + (q ? '&q=' + encodeURIComponent(q) : ''))
        .then(function (lista) {
          vaciar(refs.ingredientes);
          if (!lista || !lista.length) {
            refs.ingredientes.appendChild(el('p', { clase: 'px-vacio', texto: refs.sinRevisar.checked ? 'No quedan ingredientes sin revisar.' : 'No hay ingredientes que coincidan.' }));
            return;
          }
          lista.forEach(function (i) { refs.ingredientes.appendChild(filaIngrediente(i)); });
        });
    }
    function todo() { return cargarCatalogo().then(cargarIngredientes).catch(function (e) { aviso(conRed(e).message, true); }); }

    refs.catalogo = el('div');
    refs.nuevo = el('input', { type: 'text', maxlength: '80', placeholder: 'Nueva alergia (ej. Kiwi)', 'aria-label': 'Nombre de la nueva alergia', autocomplete: 'off' });
    var agregar = el('button', { type: 'button', clase: 'boton primario chico', texto: 'Agregar' });
    function crear() {
      var n = refs.nuevo.value.trim();
      if (!n) return;
      agregar.disabled = true;
      apiJson('/administracion/alergias', 'POST', { nombre: n })
        .then(function () { refs.nuevo.value = ''; aviso('Alergia creada.'); return todo(); })
        .catch(function (e) { aviso(conRed(e).message, true); })
        .then(function () { agregar.disabled = false; });
    }
    agregar.addEventListener('click', crear);
    refs.nuevo.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); crear(); } });

    refs.buscar = el('input', { type: 'search', placeholder: 'Buscar ingrediente', 'aria-label': 'Buscar ingrediente', autocomplete: 'off' });
    refs.sinRevisar = el('input', { type: 'checkbox', id: 'px-sin-revisar' });
    refs.ingredientes = el('div');
    refs.buscar.addEventListener('input', debounce(function () { cargarIngredientes().catch(function (e) { aviso(conRed(e).message, true); }); }, 350));
    refs.sinRevisar.addEventListener('change', function () { cargarIngredientes().catch(function (e) { aviso(conRed(e).message, true); }); });

    raiz.appendChild(el('div', { clase: 'px-dos' }, [
      el('section', { clase: 'px-tarjeta' }, [
        el('h2', { texto: 'Catálogo de alergias' }),
        el('p', { clase: 'px-ayuda', texto: 'Las que la gente puede elegir en la app.' }),
        el('div', { clase: 'px-nueva' }, [refs.nuevo, agregar]),
        refs.catalogo
      ]),
      el('section', { clase: 'px-tarjeta' }, [
        el('h2', { texto: 'Alérgenos por ingrediente' }),
        el('p', { clase: 'px-ayuda', texto: 'Marca qué alergias contiene cada ingrediente. Así la app avisa con exactitud; los que no revises siguen avisando por el nombre.' }),
        el('div', { clase: 'herramientas' }, [
          el('div', { clase: 'campo' }, [refs.buscar]),
          el('label', { clase: 'px-check', 'for': 'px-sin-revisar' }, [refs.sinRevisar, 'Solo sin revisar'])
        ]),
        refs.ingredientes
      ])
    ]));
    return todo;
  }

  // ------------------------------------------------------------------ editar recetas

  var etiquetasCache = null;
  function etiquetas() {
    if (etiquetasCache) return Promise.resolve(etiquetasCache);
    return api('/catalogos').then(function (c) { etiquetasCache = (c && c.etiquetas) || []; return etiquetasCache; })
      .catch(function () { return []; });
  }

  function construirRecetas(raiz) {
    var lista = el('div', { clase: 'px-lista' });
    var editor = el('div', { hidden: true });
    var buscar = el('input', { type: 'search', placeholder: 'Buscar receta por nombre, autor o correo', 'aria-label': 'Buscar receta', autocomplete: 'off' });
    var vistaLista = el('div', null, [el('div', { clase: 'herramientas' }, [el('div', { clase: 'campo' }, [buscar])]), lista]);
    raiz.appendChild(vistaLista);
    raiz.appendChild(editor);

    function cargar() {
      var q = buscar.value.trim();
      return api('/administracion/recetas' + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (datos) {
        vaciar(lista);
        if (!datos || !datos.length) { lista.appendChild(el('p', { clase: 'px-vacio', texto: 'No hay recetas.' })); return; }
        datos.forEach(function (r) {
          var editar = el('button', { type: 'button', clase: 'boton chico secundario', texto: 'Editar' });
          editar.addEventListener('click', function () { abrirEditor(r.id); });
          lista.appendChild(el('article', { clase: 'px-fila' }, [
            el('div', { clase: 'px-fila-texto' }, [
              el('strong', { texto: r.nombre }),
              el('div', { clase: 'px-meta', texto: [r.autor, r.fecha, r.favoritos + ' favoritos', r.comentarios + ' comentarios'].join(' · ') })
            ]),
            editar
          ]));
        });
      }).catch(function (e) { aviso(conRed(e).message, true); });
    }
    buscar.addEventListener('input', debounce(cargar, 350));

    function cerrarEditor() { vaciar(editor); editor.hidden = true; vistaLista.hidden = false; cargar(); }

    function abrirEditor(id) {
      Promise.all([api('/administracion/recetas/' + id + '/detalle'), etiquetas()]).then(function (r) {
        pintarEditor(r[0], r[1]);
      }).catch(function (e) { aviso(conRed(e).message, true); });
    }

    function filaIng(v) {
      v = v || {};
      var f = el('div', { clase: 'px-ing-fila' });
      f.appendChild(el('input', { type: 'text', clase: 'i-nombre', placeholder: 'Ingrediente', maxlength: '120', 'aria-label': 'Ingrediente', value: v.nombre || '' }));
      f.appendChild(el('input', { type: 'text', clase: 'i-cant', placeholder: 'Cantidad', inputmode: 'decimal', maxlength: '8', 'aria-label': 'Cantidad', value: v.cantidad === null || v.cantidad === undefined ? '' : String(v.cantidad) }));
      f.appendChild(el('input', { type: 'text', clase: 'i-unidad', placeholder: 'Unidad', maxlength: '20', 'aria-label': 'Unidad', value: v.unidad || '' }));
      var q = el('button', { type: 'button', clase: 'boton chico peligro', texto: 'Quitar', 'aria-label': 'Quitar ingrediente' });
      q.addEventListener('click', function () { if (f.parentNode.children.length > 1) f.remove(); });
      f.appendChild(q);
      return f;
    }
    function filaPaso(texto) {
      var f = el('div', { clase: 'px-paso-fila' });
      f.appendChild(el('span', { clase: 'px-num' }));
      var t = el('textarea', { rows: '2', maxlength: '1000', placeholder: 'Describe el paso', 'aria-label': 'Paso' });
      t.value = texto || '';
      f.appendChild(t);
      var q = el('button', { type: 'button', clase: 'boton chico peligro', texto: 'Quitar', 'aria-label': 'Quitar paso' });
      q.addEventListener('click', function () { var p = f.parentNode; if (p.children.length > 1) { f.remove(); numerar(p); } });
      f.appendChild(q);
      return f;
    }
    function numerar(cont) { Array.prototype.forEach.call(cont.children, function (f, i) { f.querySelector('.px-num').textContent = String(i + 1); }); }

    function pintarEditor(d, todasEtiquetas) {
      vistaLista.hidden = true; editor.hidden = false; vaciar(editor);

      var nombre = el('input', { type: 'text', maxlength: '150', value: d.nombre || '', 'aria-label': 'Nombre' });
      var desc = el('textarea', { rows: '3', maxlength: '2000', 'aria-label': 'Descripción' }); desc.value = d.descripcion || '';
      var minutos = el('input', { type: 'text', inputmode: 'numeric', maxlength: '4', value: d.minutosPreparacion || '', 'aria-label': 'Minutos' });

      var marcadas = {};
      (d.etiquetas || []).forEach(function (x) { marcadas[x] = true; });
      var chipsEt = el('div', { clase: 'px-chips' });
      todasEtiquetas.forEach(function (e) {
        var c = el('button', { type: 'button', clase: 'px-chip', 'aria-pressed': marcadas[e.id] ? 'true' : 'false', texto: e.nombre });
        c.addEventListener('click', function () {
          var on = c.getAttribute('aria-pressed') !== 'true';
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
          if (on) marcadas[e.id] = true; else delete marcadas[e.id];
        });
        chipsEt.appendChild(c);
      });

      var ings = el('div');
      (d.ingredientes && d.ingredientes.length ? d.ingredientes : [{}]).forEach(function (i) { ings.appendChild(filaIng(i)); });
      var masIng = el('button', { type: 'button', clase: 'boton chico secundario', texto: 'Agregar ingrediente' });
      masIng.addEventListener('click', function () { ings.appendChild(filaIng()); });

      var pasos = el('div');
      (d.pasos && d.pasos.length ? d.pasos : [{}]).forEach(function (p) { pasos.appendChild(filaPaso(p.instruccion)); });
      numerar(pasos);
      var masPaso = el('button', { type: 'button', clase: 'boton chico secundario', texto: 'Agregar paso' });
      masPaso.addEventListener('click', function () { pasos.appendChild(filaPaso()); numerar(pasos); });

      // fotos
      var fotos = el('div', { clase: 'px-fotos' });
      function pintarFotos(arr) {
        vaciar(fotos);
        if (!arr.length) fotos.appendChild(el('p', { clase: 'px-vacio', texto: 'Esta receta no tiene fotos.' }));
        arr.forEach(function (f) {
          var img = el('img', { src: f.url, alt: 'Foto de la receta', loading: 'lazy' });
          var q = el('button', { type: 'button', clase: 'boton chico peligro', texto: 'Quitar' });
          q.addEventListener('click', function () {
            if (!window.confirm('¿Quitar esta foto?')) return;
            q.disabled = true;
            api('/administracion/imagenes/' + f.id, { method: 'DELETE' })
              .then(function () { d.imagenes = d.imagenes.filter(function (x) { return x.id !== f.id; }); pintarFotos(d.imagenes); aviso('Foto eliminada.'); })
              .catch(function (e) { aviso(conRed(e).message, true); q.disabled = false; });
          });
          fotos.appendChild(el('div', { clase: 'px-foto' }, [img, q]));
        });
      }
      d.imagenes = d.imagenes || [];
      pintarFotos(d.imagenes);
      var archivos = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true, 'aria-label': 'Agregar fotos' });
      var subir = el('button', { type: 'button', clase: 'boton chico secundario', texto: 'Subir fotos' });
      subir.addEventListener('click', function () {
        if (!archivos.files.length) { aviso('Elige al menos una foto.', true); return; }
        var fd = new FormData();
        Array.prototype.forEach.call(archivos.files, function (f) { fd.append('imagenes', f, f.name); });
        subir.disabled = true; subir.textContent = 'Subiendo…';
        api('/administracion/recetas/' + d.id + '/imagenes', { method: 'POST', body: fd })
          .then(function () { aviso('Fotos agregadas.'); archivos.value = ''; return api('/administracion/recetas/' + d.id + '/detalle'); })
          .then(function (nuevo) { d.imagenes = nuevo.imagenes || []; pintarFotos(d.imagenes); })
          .catch(function (e) { aviso(conRed(e).message, true); })
          .then(function () { subir.disabled = false; subir.textContent = 'Subir fotos'; });
      });

      var guardar = el('button', { type: 'button', clase: 'boton primario', texto: 'Guardar cambios' });
      var cancelar = el('button', { type: 'button', clase: 'boton secundario', texto: 'Volver' });
      cancelar.addEventListener('click', cerrarEditor);
      guardar.addEventListener('click', function () {
        var n = nombre.value.trim();
        if (!n) return aviso('Escribe el nombre de la receta.', true);
        var mins = minutos.value.trim() === '' ? null : Number(minutos.value);
        if (mins !== null && (!Number.isInteger(mins) || mins < 1 || mins > 2000)) return aviso('Los minutos deben ser un entero entre 1 y 2000.', true);
        var ingredientes = [];
        Array.prototype.forEach.call(ings.children, function (f) {
          var nom = f.querySelector('.i-nombre').value.trim();
          if (!nom) return;
          var c = f.querySelector('.i-cant').value.trim().replace(',', '.');
          var u = f.querySelector('.i-unidad').value.trim();
          ingredientes.push({ nombre: nom, cantidad: c && !isNaN(Number(c)) ? Number(c) : null, unidad: u || null });
        });
        var textos = [];
        Array.prototype.forEach.call(pasos.querySelectorAll('textarea'), function (t) { var x = t.value.trim(); if (x) textos.push({ orden: textos.length + 1, instruccion: x }); });
        if (!ingredientes.length) return aviso('Agrega al menos un ingrediente.', true);
        if (!textos.length) return aviso('Agrega al menos un paso.', true);
        guardar.disabled = true;
        apiJson('/administracion/recetas/' + d.id, 'PUT', {
          nombre: n, descripcion: desc.value.trim() || null, minutosPreparacion: mins,
          ingredientes: ingredientes, pasos: textos, etiquetas: Object.keys(marcadas).map(Number)
        }).then(function () { aviso('Receta actualizada.'); cerrarEditor(); })
          .catch(function (e) { aviso(conRed(e).message, true); guardar.disabled = false; });
      });

      function campo(titulo, control) { return el('div', { clase: 'px-campo' }, [el('label', { texto: titulo }), control]); }
      editor.appendChild(el('div', { clase: 'px-tarjeta' }, [
        el('h2', { texto: 'Editar receta' }),
        campo('Nombre', nombre), campo('Descripción', desc), campo('Minutos de preparación', minutos),
        el('div', { clase: 'px-campo' }, [el('label', { texto: 'Etiquetas' }), chipsEt]),
        el('div', { clase: 'px-campo' }, [el('label', { texto: 'Ingredientes' }), ings, masIng]),
        el('div', { clase: 'px-campo' }, [el('label', { texto: 'Pasos' }), pasos, masPaso]),
        el('div', { clase: 'px-campo' }, [el('label', { texto: 'Fotos' }), fotos, el('div', { clase: 'px-subir' }, [archivos, subir])]),
        el('div', { clase: 'px-acciones' }, [guardar, cancelar])
      ]));
    }
    return function () { editor.hidden = true; vistaLista.hidden = false; vaciar(editor); return cargar(); };
  }

  // ------------------------------------------------------------------ importar CSV

  var COLUMNAS = ['nombre', 'descripcion', 'minutos', 'etiquetas', 'ingredientes', 'pasos'];

  function leerCsv(texto) {
    texto = texto.replace(/^﻿/, '');
    var primera = texto.split(/\r?\n/)[0] || '';
    var sep = (primera.split(';').length >= primera.split(',').length) ? ';' : ',';
    var filas = [], fila = [], campo = '', enComillas = false;
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      if (enComillas) {
        if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else enComillas = false; }
        else campo += c;
      } else if (c === '"') enComillas = true;
      else if (c === sep) { fila.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++;
        fila.push(campo); campo = '';
        if (fila.some(function (x) { return x.trim() !== ''; })) filas.push(fila);
        fila = [];
      } else campo += c;
    }
    fila.push(campo);
    if (fila.some(function (x) { return x.trim() !== ''; })) filas.push(fila);
    return filas;
  }

  function ingredienteDeTexto(t) {
    t = t.trim();
    var m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(t);
    if (!m) return { nombre: t, cantidad: null, unidad: null };
    var dentro = m[2].trim().replace(',', '.');
    var q = /^([0-9]+(?:\.[0-9]+)?)\s*(.*)$/.exec(dentro);
    if (!q) return { nombre: m[1].trim(), cantidad: null, unidad: dentro || null };
    return { nombre: m[1].trim(), cantidad: Number(q[1]), unidad: q[2].trim() || null };
  }

  function validarCsv(filas, listaEtiquetas) {
    var problemas = [], listas = [];
    if (filas.length < 2) return { problemas: ['El archivo no tiene recetas (solo la primera fila de títulos).'], listas: [] };
    var cab = filas[0].map(sinTildes), pos = {};
    COLUMNAS.forEach(function (c) { pos[c] = cab.indexOf(c); });
    var faltan = ['nombre', 'ingredientes', 'pasos'].filter(function (c) { return pos[c] < 0; });
    if (faltan.length) return { problemas: ['Faltan columnas: ' + faltan.join(', ') + '. Descarga la plantilla para ver el formato.'], listas: [] };
    var porNombre = {};
    listaEtiquetas.forEach(function (e) { porNombre[sinTildes(e.nombre)] = e.id; });
    for (var i = 1; i < filas.length; i++) {
      var f = filas[i];
      var dato = function (c) { return pos[c] < 0 ? '' : (f[pos[c]] || '').trim(); };
      var nombre = dato('nombre');
      var et = 'Fila ' + (i + 1) + (nombre ? ' (' + nombre + ')' : '');
      if (!nombre) { problemas.push(et + ': falta el nombre.'); continue; }
      var minutos = null;
      if (dato('minutos')) {
        minutos = Number(dato('minutos'));
        if (!Number.isInteger(minutos) || minutos < 1 || minutos > 2000) { problemas.push(et + ': los minutos deben ser un entero entre 1 y 2000.'); continue; }
      }
      var ingredientes = dato('ingredientes').split('|').map(function (x) { return x.trim(); }).filter(Boolean).map(ingredienteDeTexto);
      if (!ingredientes.length) { problemas.push(et + ': agrega al menos un ingrediente.'); continue; }
      var pasosTexto = dato('pasos').split('|').map(function (x) { return x.trim(); }).filter(Boolean);
      if (!pasosTexto.length) { problemas.push(et + ': agrega al menos un paso.'); continue; }
      var ids = [], desconocidas = [];
      dato('etiquetas').split('|').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (n) {
        var id = porNombre[sinTildes(n)];
        if (id) ids.push(id); else desconocidas.push(n);
      });
      if (desconocidas.length) problemas.push(et + ': etiqueta desconocida (' + desconocidas.join(', ') + '); se importa sin ella.');
      listas.push({
        nombre: nombre.slice(0, 150), descripcion: dato('descripcion') || null, minutosPreparacion: minutos,
        ingredientes: ingredientes,
        pasos: pasosTexto.map(function (t, k) { return { orden: k + 1, instruccion: t }; }),
        etiquetas: ids
      });
    }
    return { problemas: problemas, listas: listas };
  }

  function construirImportar(raiz) {
    var listas = [];
    var entrada = el('input', { type: 'file', id: 'px-csv', accept: '.csv,text/csv' });
    var resultado = el('div', { clase: 'px-resultado' });
    var importar = el('button', { type: 'button', clase: 'boton primario', texto: 'Importar recetas', disabled: true });
    var plantilla = el('button', { type: 'button', clase: 'boton secundario', texto: 'Descargar plantilla' });

    plantilla.addEventListener('click', function () {
      var cab = COLUMNAS.join(';');
      var ejemplo = 'Arroz con huevo;Un clásico rápido;20;Almuerzo|Fácil;Arroz (2 tazas)|Huevo (2)|Sal;Cocina el arroz|Fríe los huevos|Sirve caliente';
      var blob = new Blob(['﻿' + cab + '\r\n' + ejemplo + '\r\n'], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'plantilla-recetas.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });

    entrada.addEventListener('change', function () {
      vaciar(resultado); listas = []; importar.disabled = true;
      var archivo = entrada.files[0];
      if (!archivo) return;
      if (archivo.size > 2 * 1024 * 1024) { resultado.appendChild(el('p', { clase: 'px-error', texto: 'El archivo es muy grande (máximo 2 MB).' })); return; }
      var lector = new FileReader();
      lector.onload = function () {
        etiquetas().then(function (et) {
          var v = validarCsv(leerCsv(String(lector.result)), et);
          listas = v.listas;
          if (v.problemas.length) {
            var ul = el('ul', { clase: 'px-problemas' });
            v.problemas.slice(0, 30).forEach(function (p) { ul.appendChild(el('li', { texto: p })); });
            if (v.problemas.length > 30) ul.appendChild(el('li', { texto: '… y ' + (v.problemas.length - 30) + ' más.' }));
            resultado.appendChild(ul);
          }
          resultado.appendChild(el('p', { clase: 'px-resumen', texto: listas.length ? 'Listas para importar: ' + listas.length + ' receta' + (listas.length === 1 ? '' : 's') + '.' : 'No hay recetas válidas para importar.' }));
          importar.disabled = !listas.length;
        });
      };
      lector.readAsText(archivo, 'utf-8');
    });

    importar.addEventListener('click', function () {
      if (!listas.length) return;
      if (!window.confirm('¿Importar ' + listas.length + ' receta' + (listas.length === 1 ? '' : 's') + '?')) return;
      importar.disabled = true;
      var ok = 0, fallos = [], i = 0;
      var progreso = el('p', { clase: 'px-resumen' });
      resultado.appendChild(progreso);
      (function siguiente() {
        if (i >= listas.length) {
          progreso.textContent = 'Listo: ' + ok + ' importadas' + (fallos.length ? ', ' + fallos.length + ' con error.' : '.');
          fallos.forEach(function (f) { resultado.appendChild(el('p', { clase: 'px-error', texto: f })); });
          aviso(ok + ' receta' + (ok === 1 ? '' : 's') + ' importada' + (ok === 1 ? '' : 's') + '.', ok === 0);
          entrada.value = ''; listas = [];
          return;
        }
        var r = listas[i++];
        progreso.textContent = 'Importando ' + i + ' de ' + listas.length + '…';
        var fd = new FormData();
        fd.append('datos', new Blob([JSON.stringify(r)], { type: 'application/json' }));
        api('/administracion/recetas', { method: 'POST', body: fd })
          .then(function () { ok++; })
          .catch(function (e) { fallos.push(r.nombre + ': ' + conRed(e).message); })
          .then(siguiente);
      })();
    });

    raiz.appendChild(el('div', { clase: 'px-tarjeta' }, [
      el('h2', { texto: 'Importar varias recetas' }),
      el('p', { clase: 'px-ayuda', texto: 'Llena la plantilla en Excel, guárdala como CSV y súbela aquí. En "etiquetas", "ingredientes" y "pasos" separa con | ; la cantidad va entre paréntesis, por ejemplo: Arroz (2 tazas)|Sal. Las fotos se agregan después con "Editar recetas".' }),
      el('div', { clase: 'px-acciones' }, [plantilla]),
      el('div', { clase: 'px-campo' }, [el('label', { 'for': 'px-csv', texto: 'Archivo CSV' }), entrada]),
      resultado,
      el('div', { clase: 'px-acciones' }, [importar])
    ]));
    return function () {};
  }

  // ------------------------------------------------------------------ registro e inyección en el panel

  var EXTRAS = [
    { id: 'x-resenas', titulo: 'Reseñas', sub: 'Calificaciones y opiniones de las recetas. Elimina lo que no corresponda.', construir: construirResenas },
    { id: 'x-publicaciones', titulo: 'Publicaciones de Comunidad', sub: 'Lo que la gente publica en Comunidad. Elimina lo que no corresponda.', construir: construirPosts },
    { id: 'x-comentarios-comunidad', titulo: 'Comentarios de Comunidad', sub: 'Comentarios y respuestas de Comunidad, sin esperar a que alguien los reporte.', construir: construirComentariosCom },
    { id: 'x-editar', titulo: 'Editar recetas', sub: 'Cambia ingredientes, pasos, etiquetas y fotos de una receta ya publicada.', construir: construirRecetas },
    { id: 'x-importar', titulo: 'Importar recetas', sub: 'Carga muchas recetas de una vez desde un archivo CSV.', construir: construirImportar },
    { id: 'x-alergias', titulo: 'Alergias', sub: 'Catálogo de alergias y qué alérgenos contiene cada ingrediente.', construir: construirAlergias }
  ];

  var activo = null; // id de la sección extra visible

  function ocultarExtras() {
    activo = null;
    EXTRAS.forEach(function (x) { if (x.seccion) x.seccion.hidden = true; if (x.enlace) { x.enlace.removeAttribute('aria-current'); x.enlace.classList.remove('activo'); } });
  }

  function mostrar(x) {
    if (!sesion()) return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-seccion]'), function (s) { s.hidden = true; });
    Array.prototype.forEach.call(document.querySelectorAll('.navegacion a[data-nav]'), function (a) { a.removeAttribute('aria-current'); });
    ocultarExtras();
    activo = x.id;
    x.seccion.hidden = false;
    x.enlace.setAttribute('aria-current', 'page'); x.enlace.classList.add('activo');
    var t = document.getElementById('titulo-seccion'), s = document.getElementById('subtitulo-seccion');
    if (t) t.textContent = x.titulo;
    if (s) s.textContent = x.sub;
    try { history.replaceState(null, '', '#' + x.id); } catch (e) { /* sin historial */ }
    if (!x.cargar) x.cargar = x.construir(x.cuerpo) || function () {};
    var p = x.cargar();
    if (p && p.catch) p.catch(function (e) { aviso(conRed(e).message, true); });
    var c = document.getElementById('contenido');
    if (c) c.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function inyectar() {
    var nav = document.querySelector('.navegacion');
    var principal = document.getElementById('contenido');
    if (!nav || !principal) return false;
    var respaldo = nav.querySelector('[data-nav="historial"]');
    nav.insertBefore(el('span', { clase: 'px-nav-titulo', texto: 'Más herramientas' }), respaldo);
    EXTRAS.forEach(function (x) {
      x.enlace = el('a', { href: '#' + x.id, 'data-extra': x.id, texto: x.titulo });
      x.enlace.addEventListener('click', function (e) { e.preventDefault(); mostrar(x); });
      nav.insertBefore(x.enlace, respaldo);
      x.cuerpo = el('div');
      x.seccion = el('section', { 'data-extra': x.id, hidden: true }, [x.cuerpo]);
      principal.appendChild(x.seccion);
    });
    // Al usar un enlace propio del panel, se oculta lo nuestro y se deja trabajar a admin.js
    nav.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[data-nav]') : null;
      if (!a || !activo) return;
      ocultarExtras();
      if (('#' + a.getAttribute('data-nav')) === location.hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    window.addEventListener('hashchange', function () {
      var m = /^#(x-[a-z-]+)$/.exec(location.hash);
      var x = m && EXTRAS.filter(function (y) { return y.id === m[1]; })[0];
      if (x) mostrar(x); else if (activo) ocultarExtras();
    });
    return true;
  }

  // El panel solo existe en pantalla cuando hay sesión; esperamos a que aparezca la navegación.
  var intentos = 0;
  var espera = setInterval(function () {
    if (inyectar() || ++intentos > 40) {
      clearInterval(espera);
      var m = /^#(x-[a-z-]+)$/.exec(location.hash);
      var x = m && EXTRAS.filter(function (y) { return y.id === m[1]; })[0];
      if (x && x.enlace) { var r = setInterval(function () { if (sesion()) { clearInterval(r); mostrar(x); } }, 500); setTimeout(function () { clearInterval(r); }, 20000); }
    }
  }, 150);
})();