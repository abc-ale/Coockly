/* Cookly · Panel administrativo
   Sin dependencias salvo Chart.js (local). Todo el texto que viene del servidor se inserta con textContent,
   nunca como HTML, para que un nombre o una receta con "<script>" no pueda hacer nada. */
(function () {
  'use strict';

  var API = '/api/v1';
  var CLAVE_SESION = 'cookly_admin';
  var USUARIOS_POR_PAGINA = 25;

  var estado = {
    sesion: null,
    dias: 30,
    seccionActual: null,
    usuarios: [],
    filtro: { texto: '', rol: '', estado: '' },
    orden: { campo: 'creadoEn', dir: 'desc' },
    pagina: 1,
    graficas: null,
    resumen: null
  };
  var graficos = {};

  var SECCIONES = {
    resumen:  { titulo: 'Resumen',               sub: 'Cómo va Cookly en este momento.' },
    usuarios: { titulo: 'Usuarios',              sub: 'Personas registradas, su tiempo de uso y su rol.' },
    uso:      { titulo: 'Uso de la app',         sub: 'Cuánto, cuándo y quién usa Cookly.' },
    reportes: { titulo: 'Reportes de recetas',   sub: 'Recetas señaladas por la comunidad.' },
    'reportes-comunidad': { titulo: 'Reportes de comunidad', sub: 'Publicaciones y comentarios señalados desde Comunidad.' },
    comentarios: { titulo: 'Comentarios',          sub: 'Lo que escribe la comunidad. Elimina lo que no corresponda.' },
    recetas:  { titulo: 'Recetas',               sub: 'Todas las recetas publicadas, con su autor.' },
    historial: { titulo: 'Historial de acciones', sub: 'Qué hicieron los administradores y cuándo (últimas 200).' },
    respaldo: { titulo: 'Respaldo y recuperación', sub: 'Copia de seguridad de los datos y cómo recuperarlos.' }
  };

  var $ = function (id) { return document.getElementById(id); };
  var numero = new Intl.NumberFormat('es-PE');

  // ------------------------------------------------------------------ utilidades

  function el(etiqueta, atributos, hijos) {
    var nodo = document.createElement(etiqueta);
    if (atributos) {
      Object.keys(atributos).forEach(function (k) {
        var v = atributos[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'texto') nodo.textContent = v;
        else if (k === 'clase') nodo.className = v;
        else nodo.setAttribute(k, v === true ? '' : v);
      });
    }
    (hijos || []).forEach(function (h) {
      if (h === null || h === undefined) return;
      nodo.appendChild(typeof h === 'string' ? document.createTextNode(h) : h);
    });
    return nodo;
  }

  function vaciar(nodo) { while (nodo.firstChild) nodo.removeChild(nodo.firstChild); }

  function minutosATexto(min) {
    var m = Math.round(min || 0);
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60);
    var r = m % 60;
    return h + ' h ' + (r < 10 ? '0' : '') + r + ' min';
  }

  function bytesATexto(b) {
    if (b < 1024 * 1024) return numero.format(Math.round(b / 1024)) + ' KB';
    return numero.format(Math.round(b / (1024 * 1024) * 10) / 10) + ' MB';
  }

  function aviso(texto, esError) {
    var nodo = el('div', { clase: 'aviso' + (esError ? ' error' : ''), texto: texto });
    $('avisos').appendChild(nodo);
    setTimeout(function () { if (nodo.parentNode) nodo.parentNode.removeChild(nodo); }, esError ? 7000 : 4000);
  }

  // ------------------------------------------------------------------ sesión y API

  function leerSesion() {
    try { return JSON.parse(sessionStorage.getItem(CLAVE_SESION)); } catch (e) { return null; }
  }
  function guardarSesion(s) { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(s)); }

  function cerrarSesion(mensaje) {
    sessionStorage.removeItem(CLAVE_SESION);
    estado.sesion = null;
    Object.keys(graficos).forEach(function (k) { graficos[k].destroy(); delete graficos[k]; });
    mostrarAcceso(mensaje);
  }

  function mensajeDeError(cuerpo, estadoHttp) {
    if (cuerpo && cuerpo.mensaje) return cuerpo.mensaje;
    if (estadoHttp === 403) return 'No tienes permiso para hacer esto.';
    return 'No se pudo completar la acción (código ' + estadoHttp + ').';
  }

  function peticion(ruta, opciones) {
    opciones = opciones || {};
    var cabeceras = Object.assign({}, opciones.headers || {});
    if (estado.sesion) cabeceras.Authorization = 'Bearer ' + estado.sesion.token;
    return fetch(API + ruta, Object.assign({}, opciones, { headers: cabeceras })).then(function (r) {
      if (r.status === 401 && estado.sesion) {
        cerrarSesion('Tu sesión venció. Entra de nuevo.');
        throw new Error('sesion');
      }
      return r;
    });
  }

  function json(ruta, opciones) {
    return peticion(ruta, opciones).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (cuerpo) {
        if (!r.ok) throw new Error(mensajeDeError(cuerpo, r.status));
        return cuerpo;
      });
    });
  }

  function descargar(ruta, nombreRespaldo) {
    return peticion(ruta).then(function (r) {
      if (!r.ok) {
        return r.json().catch(function () { return null; }).then(function (c) { throw new Error(mensajeDeError(c, r.status)); });
      }
      var disp = r.headers.get('Content-Disposition') || '';
      var m = /filename="?([^";]+)"?/.exec(disp);
      return r.blob().then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = m ? m[1] : nombreRespaldo;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      });
    });
  }

  // ------------------------------------------------------------------ vistas

  function mostrarAcceso(mensaje) {
    $('vista-panel').hidden = true;
    $('vista-acceso').hidden = false;
    var e = $('acceso-error');
    e.hidden = !mensaje;
    e.textContent = mensaje || '';
    $('acceso-contrasena').value = '';
    ($('acceso-correo').value ? $('acceso-contrasena') : $('acceso-correo')).focus();
  }

  function mostrarPanel() {
    $('vista-acceso').hidden = true;
    $('vista-panel').hidden = false;
    $('admin-nombre').textContent = estado.sesion.nombre || estado.sesion.correo;
    navegar();
  }

  function seccionDesdeHash() {
    var h = (location.hash || '').replace('#', '');
    return SECCIONES[h] ? h : 'resumen';
  }

  function navegar() {
    if (!estado.sesion) return;
    var s = seccionDesdeHash();
    estado.seccionActual = s;
    document.querySelectorAll('[data-seccion]').forEach(function (n) { n.hidden = n.getAttribute('data-seccion') !== s; });
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === s) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $('titulo-seccion').textContent = SECCIONES[s].titulo;
    $('subtitulo-seccion').textContent = SECCIONES[s].sub;
    $('selector-rango').hidden = !(s === 'resumen' || s === 'uso');
    document.title = SECCIONES[s].titulo + ' · Cookly';
    cargarSeccion(s);
  }

  function cargarSeccion(s) {
    var tarea;
    if (s === 'resumen') tarea = Promise.all([cargarResumen(), cargarGraficas()]).then(pintarResumen);
    else if (s === 'uso') tarea = Promise.all([cargarResumen(), cargarGraficas()]).then(pintarUso);
    else if (s === 'usuarios') tarea = cargarUsuarios();
    else if (s === 'reportes') tarea = cargarReportes();
    else if (s === 'reportes-comunidad') tarea = cargarReportesComunidad();
    else if (s === 'respaldo') tarea = cargarRespaldo();
    else if (LISTAS[s]) tarea = cargarLista(s);
    if (tarea) tarea.catch(function (e) { if (e.message !== 'sesion') aviso(e.message, true); });
    if (s !== 'reportes') actualizarInsignia();
    if (s !== 'reportes-comunidad') actualizarInsigniaComunidad();
  }

  function cargarResumen() { return json('/administracion/resumen').then(function (r) { estado.resumen = r; }); }
  function cargarGraficas() { return json('/administracion/graficas?dias=' + estado.dias).then(function (g) { estado.graficas = g; }); }

  // ------------------------------------------------------------------ cifras

  function cifra(etiqueta, valor, nota, neutra, unidad) {
    var v = el('span', { clase: 'cifra-valor', texto: valor }, unidad ? [el('small', { texto: unidad })] : []);
    var hijos = [el('span', { clase: 'cifra-etiqueta', texto: etiqueta }), v];
    if (nota) hijos.push(typeof nota === 'string' ? el('span', { clase: 'cifra-nota' + (neutra ? ' neutra' : ''), texto: nota }) : nota);
    return el('div', { clase: 'cifra' }, hijos);
  }

  function pintarResumen() {
    var r = estado.resumen, cont = $('cifras-resumen');
    vaciar(cont);
    cont.appendChild(cifra('Usuarios', numero.format(r.usuariosTotal), '+' + numero.format(r.usuariosNuevos7d) + ' esta semana'));
    cont.appendChild(cifra('Recetas', numero.format(r.recetasTotal), '+' + numero.format(r.recetasNuevas30d) + ' en 30 días'));
    cont.appendChild(cifra('Activos hoy', numero.format(r.activosHoy), numero.format(r.enLineaAhora) + ' en línea ahora', true));
    var horas = Math.round(r.minutosUsoTotal / 60 * 10) / 10;
    cont.appendChild(cifra('Tiempo de uso', numero.format(horas), minutosATexto(r.minutosUso7d) + ' en 7 días', true, 'h'));
    var enlace = r.reportesPendientes > 0
      ? el('span', { clase: 'cifra-nota' }, [el('a', { href: '#reportes', texto: 'Revisar ahora' })])
      : el('span', { clase: 'cifra-nota neutra', texto: 'Todo al día' });
    cont.appendChild(cifra('Reportes pendientes', numero.format(r.reportesPendientes), enlace));

    var datos = $('datos-resumen');
    vaciar(datos);
    [
      ['Comentarios', numero.format(r.comentariosTotal)],
      ['Favoritos', numero.format(r.favoritosTotal)],
      ['Reseñas', numero.format(r.resenasTotal) + (r.resenasTotal ? ' (promedio ' + numero.format(r.puntuacionPromedio) + ' de 5)' : '')],
      ['Imágenes', numero.format(r.imagenesTotal)],
      ['Administradores', numero.format(r.administradores)],
      ['Base de datos', bytesATexto(r.baseDatosBytes)]
    ].forEach(function (p) {
      datos.appendChild(el('div', null, [el('dt', { texto: p[0] }), el('dd', { texto: p[1] })]));
    });

    var g = estado.graficas;
    dibujarBarras('g-usuarios', g.usuariosPorDia, 'Usuarios nuevos', color('--rosa-marca'));
    dibujarBarras('g-recetas', g.recetasPorDia, 'Recetas nuevas', color('--durazno'));
    dibujarRanking('g-vistas', 'vacio-vistas', g.topRecetasVistas, 'Vistas', color('--rosa-marca'));
    dibujarRanking('g-favoritas', 'vacio-favoritas', g.topRecetasFavoritas, 'Favoritos', color('--ciruela'));
    dibujarDona('g-estado', [
      { nombre: 'Activas', valor: r.usuariosActivos, color: color('--salvia') },
      { nombre: 'Inactivas', valor: r.usuariosInactivos, color: color('--borde-fuerte') }
    ]);
    var etiquetaEstado = { PENDIENTE: 'Pendientes', REVISADO: 'Revisados', DESCARTADO: 'Descartados' };
    var colorEstado = { PENDIENTE: color('--durazno'), REVISADO: color('--salvia'), DESCARTADO: color('--borde-fuerte') };
    var rep = g.reportesPorEstado.map(function (x) { return { nombre: etiquetaEstado[x.nombre] || x.nombre, valor: Number(x.valor), color: colorEstado[x.nombre] || color('--ciruela') }; });
    $('vacio-reportes').hidden = rep.length > 0;
    $('g-reportes').parentNode.hidden = rep.length === 0;
    if (rep.length) dibujarDona('g-reportes', rep);
  }

  function pintarUso() {
    var r = estado.resumen, g = estado.graficas, cont = $('cifras-uso');
    vaciar(cont);
    cont.appendChild(cifra('En línea ahora', numero.format(r.enLineaAhora), 'Usaron la app hace menos de 2 min', true));
    cont.appendChild(cifra('Activos hoy', numero.format(r.activosHoy), numero.format(r.activos7d) + ' en los últimos 7 días', true));
    cont.appendChild(cifra('Sesiones', numero.format(r.sesionesTotal), 'Desde que empezó el registro', true));
    cont.appendChild(cifra('Por sesión', numero.format(Math.round(r.minutosPorSesion * 10) / 10), 'Promedio de duración', true, 'min'));
    cont.appendChild(cifra('Tiempo total', numero.format(Math.round(r.minutosUsoTotal / 60 * 10) / 10), minutosATexto(r.minutosUso7d) + ' en 7 días', true, 'h'));

    var dias = g.usoPorDia;
    crearGrafico('g-uso', {
      data: {
        labels: dias.map(function (d) { return etiquetaDia(d.dia); }),
        datasets: [
          { type: 'bar', label: 'Minutos de uso', data: dias.map(function (d) { return Number(d.minutos); }), backgroundColor: color('--rosa-marca'), borderRadius: 4, yAxisID: 'y' },
          { type: 'line', label: 'Personas activas', data: dias.map(function (d) { return Number(d.activos); }), borderColor: color('--ciruela'), backgroundColor: color('--ciruela'), tension: 0.3, pointRadius: 2, yAxisID: 'y1' }
        ]
      },
      options: {
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Minutos' } },
          y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { precision: 0 }, title: { display: true, text: 'Personas' } }
        },
        plugins: { legend: { display: true, position: 'bottom' } }
      }
    });

    crearGrafico('g-horas', {
      type: 'bar',
      data: {
        labels: g.horasPico.map(function (h) { return h.hora + ' h'; }),
        datasets: [{ label: 'Sesiones iniciadas', data: g.horasPico.map(function (h) { return Number(h.valor); }), backgroundColor: color('--durazno'), borderRadius: 4 }]
      },
      options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 8 } } }, plugins: { legend: { display: false } } }
    });

    dibujarRanking('g-top-usuarios', 'vacio-top-usuarios', g.topUsuariosTiempo, 'Minutos de uso', color('--ciruela'));
  }

  // ------------------------------------------------------------------ gráficas

  function color(variable) { return getComputedStyle(document.documentElement).getPropertyValue(variable).trim(); }
  function movimientoReducido() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function etiquetaDia(iso) { return iso.slice(8, 10) + '/' + iso.slice(5, 7); }

  function crearGrafico(id, config) {
    if (graficos[id]) graficos[id].destroy();
    var base = {
      responsive: true,
      maintainAspectRatio: false,
      animation: movimientoReducido() ? false : { duration: 350 },
      font: { family: '"DM Sans", system-ui, sans-serif' },
      color: color('--apagado'),
      plugins: { legend: { display: false } },
      scales: {}
    };
    var opciones = Object.assign({}, base, config.options || {});
    opciones.plugins = Object.assign({}, base.plugins, (config.options || {}).plugins || {});
    opciones.scales = Object.assign({}, (config.options || {}).scales || {});
    Object.keys(opciones.scales).forEach(function (k) {
      var ejeConfig = opciones.scales[k];
      ejeConfig.grid = Object.assign({ color: color('--borde') }, ejeConfig.grid || {});
      ejeConfig.border = Object.assign({ display: false }, ejeConfig.border || {});
    });
    graficos[id] = new Chart($(id), { type: config.type, data: config.data, options: opciones });
  }

  function dibujarBarras(id, serie, nombre, colorBarra) {
    crearGrafico(id, {
      type: 'bar',
      data: {
        labels: serie.map(function (d) { return etiquetaDia(d.dia); }),
        datasets: [{ label: nombre, data: serie.map(function (d) { return Number(d.valor); }), backgroundColor: colorBarra, borderRadius: 4 }]
      },
      options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 10 } } } }
    });
  }

  function dibujarRanking(id, idVacio, filas, nombre, colorBarra) {
    var vacio = !filas || filas.length === 0;
    $(id).parentNode.hidden = vacio;
    $(idVacio).hidden = !vacio;
    if (vacio) { if (graficos[id]) { graficos[id].destroy(); delete graficos[id]; } return; }
    crearGrafico(id, {
      type: 'bar',
      data: {
        labels: filas.map(function (f) { return f.nombre.length > 26 ? f.nombre.slice(0, 25) + '…' : f.nombre; }),
        datasets: [{ label: nombre, data: filas.map(function (f) { return Number(f.valor); }), backgroundColor: colorBarra, borderRadius: 4 }]
      },
      options: { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } } }
    });
  }

  function dibujarDona(id, partes) {
    var total = partes.reduce(function (a, p) { return a + p.valor; }, 0);
    crearGrafico(id, {
      type: 'doughnut',
      data: {
        labels: partes.map(function (p) { return p.nombre + ' (' + numero.format(p.valor) + ')'; }),
        datasets: [{ data: total === 0 ? [1] : partes.map(function (p) { return p.valor; }), backgroundColor: total === 0 ? [color('--borde')] : partes.map(function (p) { return p.color; }), borderWidth: 0 }]
      },
      options: { cutout: '64%', plugins: { legend: { display: true, position: 'bottom' } } }
    });
  }

  // ------------------------------------------------------------------ usuarios

  function cargarUsuarios() {
    return json('/administracion/usuarios').then(function (lista) {
      estado.usuarios = lista;
      pintarUsuarios();
    });
  }

  function usuariosFiltrados() {
    var f = estado.filtro, t = f.texto.trim().toLowerCase();
    var lista = estado.usuarios.filter(function (u) {
      if (t && u.nombre.toLowerCase().indexOf(t) === -1 && u.correo.toLowerCase().indexOf(t) === -1) return false;
      if (f.rol && u.rol !== f.rol) return false;
      if (f.estado === 'activo' && !u.activo) return false;
      if (f.estado === 'inactivo' && u.activo) return false;
      return true;
    });
    var campo = estado.orden.campo, dir = estado.orden.dir === 'asc' ? 1 : -1;
    lista.sort(function (a, b) {
      var x = a[campo], y = b[campo];
      if (x === null || x === undefined) x = '';
      if (y === null || y === undefined) y = '';
      if (typeof x === 'string') return x.localeCompare(y, 'es') * dir;
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
    return lista;
  }

  function pintarUsuarios() {
    var lista = usuariosFiltrados();
    var paginas = Math.max(1, Math.ceil(lista.length / USUARIOS_POR_PAGINA));
    if (estado.pagina > paginas) estado.pagina = paginas;
    var desde = (estado.pagina - 1) * USUARIOS_POR_PAGINA;
    var visibles = lista.slice(desde, desde + USUARIOS_POR_PAGINA);

    document.querySelectorAll('#tabla-usuarios .orden').forEach(function (b) {
      if (b.getAttribute('data-orden') === estado.orden.campo) b.setAttribute('data-dir', estado.orden.dir); else b.removeAttribute('data-dir');
    });

    var cuerpo = document.querySelector('#tabla-usuarios tbody');
    vaciar(cuerpo);
    if (visibles.length === 0) {
      cuerpo.appendChild(el('tr', null, [el('td', { clase: 'sin-resultados', colspan: '9', texto: 'No hay usuarios que coincidan con la búsqueda.' })]));
    }
    visibles.forEach(function (u) {
      var esYo = estado.sesion && u.correo.toLowerCase() === (estado.sesion.correo || '').toLowerCase();
      var esAdmin = u.rol === 'ADMINISTRADOR';
      var acciones = el('div', { clase: 'acciones' }, [
        el('button', { type: 'button', clase: 'boton secundario chico', 'data-accion': 'rol', 'data-id': u.id, 'data-admin': esAdmin ? '1' : '0', disabled: esYo, texto: esAdmin ? 'Quitar admin' : 'Hacer admin' }),
        el('button', { type: 'button', clase: 'boton chico ' + (u.activo ? 'peligro' : 'secundario'), 'data-accion': 'activo', 'data-id': u.id, 'data-activo': u.activo ? '1' : '0', disabled: esYo, texto: u.activo ? 'Desactivar' : 'Activar' })
      ]);
      cuerpo.appendChild(el('tr', null, [
        el('td', null, [el('div', { clase: 'persona' }, [el('strong', { texto: u.nombre }), el('span', { texto: u.correo })])]),
        el('td', null, [el('span', { clase: 'etiqueta' + (esAdmin ? ' admin' : ''), texto: esAdmin ? 'Administrador' : 'Usuario' })]),
        el('td', null, [el('span', { clase: 'etiqueta ' + (u.activo ? 'activo' : 'inactivo'), texto: u.activo ? 'Activo' : 'Inactivo' })]),
        el('td', { texto: (u.creadoEn || '').slice(0, 10) }),
        el('td', { texto: u.ultimoAcceso || 'Sin uso registrado' }),
        el('td', { clase: 'num', texto: numero.format(u.sesiones) }),
        el('td', { clase: 'num', texto: minutosATexto(u.segundosUso / 60) }),
        el('td', { clase: 'num', texto: numero.format(u.recetas) }),
        el('td', null, [acciones])
      ]));
    });

    var pag = $('u-paginacion');
    vaciar(pag);
    pag.appendChild(el('span', { texto: numero.format(lista.length) + (lista.length === 1 ? ' usuario' : ' usuarios') + ' · página ' + estado.pagina + ' de ' + paginas }));
    pag.appendChild(el('div', null, [
      el('button', { type: 'button', clase: 'boton secundario chico', 'data-pagina': 'anterior', disabled: estado.pagina <= 1, texto: 'Anterior' }),
      el('button', { type: 'button', clase: 'boton secundario chico', 'data-pagina': 'siguiente', disabled: estado.pagina >= paginas, texto: 'Siguiente' })
    ]));
  }

  function accionUsuario(boton) {
    var id = boton.getAttribute('data-id');
    var usuario = estado.usuarios.filter(function (u) { return String(u.id) === id; })[0];
    if (!usuario) return;
    var accion = boton.getAttribute('data-accion'), ruta, opciones, pregunta;

    if (accion === 'rol') {
      var seraAdmin = boton.getAttribute('data-admin') !== '1';
      pregunta = seraAdmin
        ? '¿Dar permisos de administrador a ' + usuario.nombre + '? Podrá ver todo este panel.'
        : '¿Quitar el rol de administrador a ' + usuario.nombre + '?';
      ruta = '/administracion/usuarios/' + id + '/rol';
      opciones = { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rol: seraAdmin ? 'ADMINISTRADOR' : 'USUARIO' }) };
    } else {
      var activar = boton.getAttribute('data-activo') !== '1';
      pregunta = activar ? '¿Activar la cuenta de ' + usuario.nombre + '?' : '¿Desactivar la cuenta de ' + usuario.nombre + '? No podrá iniciar sesión.';
      ruta = '/administracion/usuarios/' + id + '/activo?valor=' + activar;
      opciones = { method: 'PUT' };
    }
    if (!window.confirm(pregunta)) return;

    boton.disabled = true;
    json(ruta, opciones)
      .then(function () { aviso('Cambio guardado.'); return cargarUsuarios(); })
      .catch(function (e) { if (e.message !== 'sesion') { aviso(e.message, true); boton.disabled = false; } });
  }

  // ------------------------------------------------------------------ reportes de recetas

  function actualizarInsignia() {
    json('/administracion/moderacion/reportes').then(function (lista) {
      var b = $('insignia-reportes');
      b.hidden = lista.length === 0;
      b.textContent = lista.length;
    }).catch(function () { /* la insignia es opcional */ });
  }

  function cargarReportes() {
    return json('/administracion/moderacion/reportes').then(function (lista) {
      var cont = $('lista-reportes');
      vaciar(cont);
      var b = $('insignia-reportes');
      b.hidden = lista.length === 0;
      b.textContent = lista.length;

      if (lista.length === 0) {
        cont.appendChild(el('div', { clase: 'estado-vacio' }, [el('strong', { texto: 'No hay reportes pendientes' }), 'Cuando alguien reporte una receta, aparecerá aquí.']));
        return;
      }
      lista.forEach(function (r) {
        var botones = el('div', { clase: 'acciones' }, [
          el('button', { type: 'button', clase: 'boton secundario chico', 'data-resolver': 'DESCARTADO', 'data-id': r.id, texto: 'Descartar' }),
          el('button', { type: 'button', clase: 'boton secundario chico', 'data-resolver': 'REVISADO', 'data-id': r.id, texto: 'Marcar revisado' }),
          el('button', { type: 'button', clase: 'boton peligro chico', 'data-resolver': 'ELIMINAR', 'data-id': r.id, 'data-receta': r.recetaNombre, texto: 'Eliminar receta' })
        ]);
        cont.appendChild(el('article', { clase: 'reporte' }, [
          el('div', null, [
            el('h2', { texto: r.recetaNombre }),
            el('p', { texto: 'Reportado por ' + r.reportante + ' (' + r.reportanteCorreo + ') · ' + (r.creadoEn || '') }),
            el('p', { clase: 'motivo', texto: r.motivo })
          ]),
          botones
        ]));
      });
    });
  }

  function resolverReporte(boton) {
    var id = boton.getAttribute('data-id');
    var modo = boton.getAttribute('data-resolver');
    var eliminar = modo === 'ELIMINAR';
    if (eliminar && !window.confirm('¿Eliminar la receta "' + boton.getAttribute('data-receta') + '" con todos sus comentarios, reseñas e imágenes? No se puede deshacer.')) return;
    boton.disabled = true;
    json('/administracion/moderacion/reportes/' + id + '?eliminarReceta=' + eliminar, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: modo === 'DESCARTADO' ? 'DESCARTADO' : 'REVISADO' })
    }).then(function () { aviso(eliminar ? 'Receta eliminada.' : 'Reporte actualizado.'); return cargarReportes(); })
      .catch(function (e) { if (e.message !== 'sesion') { aviso(e.message, true); boton.disabled = false; } });
  }

  // ------------------------------------------------------------------ reportes de comunidad

  function pintarInsigniaComunidad(cantidad) {
    var b = $('insignia-reportes-comunidad');
    b.hidden = cantidad === 0;
    b.textContent = cantidad;
  }

  function actualizarInsigniaComunidad() {
    json('/administracion/reportes-comunidad').then(function (lista) {
      pintarInsigniaComunidad(lista.length);
    }).catch(function () { /* la insignia es opcional */ });
  }

  function cargarReportesComunidad() {
    return json('/administracion/reportes-comunidad').then(function (lista) {
      var cont = $('lista-reportes-comunidad');
      vaciar(cont);
      pintarInsigniaComunidad(lista.length);

      if (lista.length === 0) {
        cont.appendChild(el('div', { clase: 'estado-vacio' }, [el('strong', { texto: 'No hay reportes pendientes' }), 'Cuando alguien reporte una publicación o un comentario, aparecerá aquí.']));
        return;
      }

      lista.forEach(function (r) {
        var esPost = r.tipo === 'POST';
        var que = esPost ? 'publicación' : 'comentario';
        var existe = r.contenidoExiste !== false;

        var detalle = [
          el('h2', { texto: (esPost ? 'Publicación' : 'Comentario') + ' de ' + (r.autor || 'una persona desconocida') }),
          el('p', { texto: 'Reportado por ' + (r.reportadoPor || 'un usuario') + ' · ' + (r.creadoEn || '') }),
          el('p', { clase: 'motivo', texto: 'Motivo: ' + r.motivo })
        ];

        if (!existe) {
          detalle.push(el('p', { texto: '(Este contenido ya fue eliminado.)' }));
        } else {
          if (r.contenido) detalle.push(el('p', { texto: '“' + r.contenido + '”' }));
          if (r.imagenUrl && /^https:\/\//.test(r.imagenUrl)) {
            var foto = document.createElement('img');
            foto.src = r.imagenUrl;
            foto.alt = 'Foto de la publicación reportada';
            foto.loading = 'lazy';
            foto.style.maxWidth = '260px';
            foto.style.width = '100%';
            foto.style.borderRadius = '10px';
            foto.style.display = 'block';
            foto.style.marginTop = '8px';
            detalle.push(foto);
          }
        }

        var botones = el('div', { clase: 'acciones' }, [
          el('button', { type: 'button', clase: 'boton secundario chico', 'data-resolver-com': 'DESCARTADO', 'data-id': r.id, texto: 'Descartar' }),
          el('button', { type: 'button', clase: 'boton secundario chico', 'data-resolver-com': 'REVISADO', 'data-id': r.id, texto: 'Marcar revisado' }),
          el('button', { type: 'button', clase: 'boton peligro chico', 'data-resolver-com': 'ELIMINAR', 'data-id': r.id, 'data-que': que, disabled: !existe, texto: 'Eliminar ' + que })
        ]);

        cont.appendChild(el('article', { clase: 'reporte' }, [el('div', null, detalle), botones]));
      });
    });
  }

  function resolverReporteComunidad(boton) {
    var id = boton.getAttribute('data-id');
    var modo = boton.getAttribute('data-resolver-com');
    var eliminar = modo === 'ELIMINAR';
    if (eliminar && !window.confirm('¿Eliminar este ' + boton.getAttribute('data-que') + '? No se puede deshacer.')) return;
    boton.disabled = true;
    json('/administracion/reportes-comunidad/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: modo === 'DESCARTADO' ? 'DESCARTADO' : 'REVISADO', eliminarContenido: eliminar })
    }).then(function () { aviso(eliminar ? 'Contenido eliminado.' : 'Reporte actualizado.'); return cargarReportesComunidad(); })
      .catch(function (e) { if (e.message !== 'sesion') { aviso(e.message, true); boton.disabled = false; } });
  }

  // ------------------------------------------------------------------ respaldo

  function cargarRespaldo() {
    return json('/administracion/respaldo/info').then(function (info) {
      $('respaldo-info').textContent = numero.format(info.filasTotal) + ' filas en ' + info.tablas.length + ' tablas · base de datos de ' + bytesATexto(info.baseDatosBytes) + ' · PostgreSQL ' + info.version;
      var cuerpo = document.querySelector('#tabla-respaldo tbody');
      vaciar(cuerpo);
      info.tablas.forEach(function (t) {
        cuerpo.appendChild(el('tr', null, [el('td', { texto: t.tabla }), el('td', { clase: 'num', texto: numero.format(t.filas) })]));
      });
    });
  }

  function restaurar(evento) {
    evento.preventDefault();
    var archivo = $('r-archivo').files[0];
    var salida = $('r-resultado');
    salida.hidden = true;
    if (!archivo) { aviso('Elige el archivo de respaldo.', true); return; }
    if ($('r-confirmar').value !== 'RESTAURAR') { aviso('Escribe RESTAURAR para confirmar.', true); return; }
    if (!window.confirm('Se recuperarán los datos que falten desde "' + archivo.name + '". ¿Continuar?')) return;

    var datos = new FormData();
    datos.append('archivo', archivo);
    datos.append('confirmacion', $('r-confirmar').value);
    var boton = $('btn-restaurar');
    boton.disabled = true;
    boton.textContent = 'Recuperando…';

    json('/administracion/respaldo/restaurar', { method: 'POST', body: datos })
      .then(function (r) {
        vaciar(salida);
        salida.className = 'resultado';
        salida.appendChild(el('strong', { texto: r.filasRecuperadas === 0 ? 'No faltaba ningún dato: todo lo del archivo ya estaba en la base de datos.' : 'Se recuperaron ' + numero.format(r.filasRecuperadas) + ' filas.' }));
        var tablas = Object.keys(r.porTabla || {});
        if (tablas.length) salida.appendChild(el('ul', null, tablas.map(function (t) { return el('li', { texto: t + ': ' + numero.format(r.porTabla[t]) }); })));
        if (r.tablasIgnoradas && r.tablasIgnoradas.length) salida.appendChild(el('p', { texto: 'Tablas del archivo que ya no existen y se ignoraron: ' + r.tablasIgnoradas.join(', ') + '.' }));
        salida.hidden = false;
        $('form-restaurar').reset();
        return cargarRespaldo();
      })
      .catch(function (e) {
        if (e.message === 'sesion') return;
        vaciar(salida);
        salida.className = 'resultado error';
        salida.textContent = e.message;
        salida.hidden = false;
      })
      .then(function () { boton.disabled = false; boton.textContent = 'Recuperar datos'; });
  }

  // ------------------------------------------------------------------ comentarios, recetas e historial

  var LISTAS = {
    comentarios: { ruta: '/administracion/comentarios', cont: 'lista-comentarios', buscar: 'c-buscar', vacio: 'No hay comentarios.',
      cols: [['Fecha', 'fecha'], ['Autor', 'autor'], ['Receta', 'recetaNombre'], ['Comentario', 'contenido']],
      pregunta: '¿Eliminar este comentario?' },
    recetas: { ruta: '/administracion/recetas', cont: 'lista-recetas', buscar: 're-buscar', vacio: 'No hay recetas.',
      cols: [['Fecha', 'fecha'], ['Receta', 'nombre'], ['Autor', 'autor'], ['Comentarios', 'comentarios'], ['Favoritos', 'favoritos']],
      pregunta: '¿Eliminar esta receta con todos sus datos? No se puede deshacer.' },
    historial: { ruta: '/administracion/auditoria', cont: 'lista-historial', vacio: 'Todavía no hay acciones registradas.',
      cols: [['Fecha', 'fecha'], ['Administrador', 'admin'], ['Acción', 'accion'], ['Detalle', 'detalle']] }
  };

  function cargarLista(nombre) {
    var cfg = LISTAS[nombre];
    var q = cfg.buscar ? $(cfg.buscar).value.trim() : '';
    return json(cfg.ruta + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (filas) { pintarLista(nombre, filas); });
  }

  function pintarLista(nombre, filas) {
    var cfg = LISTAS[nombre];
    var cont = $(cfg.cont);
    vaciar(cont);
    if (!filas.length) {
      cont.appendChild(el('div', { clase: 'estado-vacio' }, [el('strong', { texto: 'Nada por aquí' }), el('span', { texto: cfg.vacio })]));
      return;
    }
    var cab = el('tr', null, cfg.cols.map(function (c) { return el('th', { texto: c[0] }); }));
    var puedeBorrar = nombre !== 'historial';
    if (puedeBorrar) cab.appendChild(el('th'));
    var cuerpo = filas.map(function (f) {
      var tr = el('tr', null, cfg.cols.map(function (c) {
        var v = f[c[1]];
        var largo = c[1] === 'contenido' || c[1] === 'detalle';
        return el('td', { clase: largo ? 'largo' : null, texto: v === null || v === undefined ? '' : String(v) });
      }));
      if (puedeBorrar) tr.appendChild(el('td', null, [el('button', { type: 'button', clase: 'boton chico peligro', 'data-id': f.id, texto: 'Eliminar' })]));
      return tr;
    });
    cont.appendChild(el('div', { clase: 'tabla-envoltura' }, [el('table', null, [el('thead', null, [cab]), el('tbody', null, cuerpo)])]));
  }

  function iniciarListas() {
    ['comentarios', 'recetas'].forEach(function (nombre) {
      var cfg = LISTAS[nombre];
      var espera = null;
      $(cfg.buscar).addEventListener('input', function () {
        clearTimeout(espera);
        espera = setTimeout(function () {
          cargarLista(nombre).catch(function (e) { if (e.message !== 'sesion') aviso(e.message, true); });
        }, 350);
      });
      $(cfg.cont).addEventListener('click', function (e) {
        var b = e.target.closest('button[data-id]');
        if (!b || b.disabled || !window.confirm(cfg.pregunta)) return;
        b.disabled = true;
        json(cfg.ruta + '/' + b.getAttribute('data-id'), { method: 'DELETE' })
          .then(function () { aviso('Eliminado.'); return cargarLista(nombre); })
          .catch(function (ex) { if (ex.message !== 'sesion') { aviso(ex.message, true); b.disabled = false; } });
      });
    });
  }

  // ------------------------------------------------------------------ eventos

  function iniciarEventos() {
    // Ojito: muestra u oculta la contraseña
    var ojo = $('ojo-acceso');
    if (ojo) {
      ojo.addEventListener('click', function () {
        var campo = $('acceso-contrasena');
        var ver = campo.type === 'password';
        campo.type = ver ? 'text' : 'password';
        ojo.classList.toggle('is-visible', ver);
        ojo.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
      });
    }

    $('form-acceso').addEventListener('submit', function (e) {
      e.preventDefault();
      var correo = $('acceso-correo').value.trim();
      var contrasena = $('acceso-contrasena').value;
      var boton = $('acceso-boton');
      var err = $('acceso-error');
      err.hidden = true;
      if (!correo || !contrasena) { err.textContent = 'Escribe tu correo y tu contraseña.'; err.hidden = false; return; }
      boton.disabled = true;
      boton.textContent = 'Entrando…';
      fetch(API + '/panel/acceso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo: correo, contrasena: contrasena }) })
        .then(function (r) { return r.json().catch(function () { return null; }).then(function (c) { return { ok: r.ok, c: c, estado: r.status }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(mensajeDeError(r.c, r.estado));
          estado.sesion = { token: r.c.token, nombre: r.c.nombre, correo: r.c.correo || correo };
          guardarSesion(estado.sesion);
          mostrarPanel();
        })
        .catch(function (ex) { err.textContent = ex.message === 'Failed to fetch' ? 'No se pudo conectar con el servidor.' : ex.message; err.hidden = false; })
        .then(function () { boton.disabled = false; boton.textContent = 'Entrar'; });
    });

    iniciarListas();

    // recuperar contraseña (el enlace llega por correo y abre /restablecer.html)
    function verOlvide(ver) {
      $('form-acceso').hidden = ver;
      $('form-olvide').hidden = !ver;
      $('olvide-mensaje').hidden = true;
      $('olvide-mensaje').className = 'error-linea';
      if (ver) $('olvide-correo').value = $('acceso-correo').value.trim();
    }
    $('enlace-olvide').addEventListener('click', function (e) { e.preventDefault(); verOlvide(true); });
    $('enlace-volver').addEventListener('click', function (e) { e.preventDefault(); verOlvide(false); });
    if (window.location.hash === '#recuperar') {
      verOlvide(true);
      try { window.history.replaceState({}, document.title, window.location.pathname); } catch (x) { /* sin problema */ }
    }
    $('form-olvide').addEventListener('submit', function (e) {
      e.preventDefault();
      var correo = $('olvide-correo').value.trim();
      var msg = $('olvide-mensaje');
      var boton = $('olvide-boton');
      msg.hidden = true;
      msg.className = 'error-linea';
      if (!correo) { msg.textContent = 'Escribe tu correo.'; msg.hidden = false; return; }
      boton.disabled = true;
      boton.textContent = 'Enviando…';
      fetch(API + '/autenticacion/solicitar-recuperacion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo: correo, origen: 'panel' }) })
        .then(function (r) { return r.json().catch(function () { return null; }).then(function (c) { return { ok: r.ok, c: c, estado: r.status }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.estado >= 500 ? 'No se pudo enviar el correo. Revisa la configuración de Brevo en Render.' : mensajeDeError(r.c, r.estado));
          msg.className = 'exito-linea';
          msg.textContent = 'Si el correo existe, recibirás el enlace en unos minutos. Revisa también spam.';
          msg.hidden = false;
        })
        .catch(function (ex) { msg.textContent = ex.message === 'Failed to fetch' ? 'No se pudo conectar con el servidor.' : ex.message; msg.hidden = false; })
        .then(function () { boton.disabled = false; boton.textContent = 'Enviar enlace'; });
    });

    $('btn-salir').addEventListener('click', function () { cerrarSesion(); });
    window.addEventListener('hashchange', navegar);

    $('selector-rango').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-dias]');
      if (!b) return;
      estado.dias = Number(b.getAttribute('data-dias'));
      document.querySelectorAll('#selector-rango button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      cargarSeccion(estado.seccionActual);
    });

    // usuarios
    $('u-buscar').addEventListener('input', function (e) { estado.filtro.texto = e.target.value; estado.pagina = 1; pintarUsuarios(); });
    $('u-rol').addEventListener('change', function (e) { estado.filtro.rol = e.target.value; estado.pagina = 1; pintarUsuarios(); });
    $('u-estado').addEventListener('change', function (e) { estado.filtro.estado = e.target.value; estado.pagina = 1; pintarUsuarios(); });
    $('tabla-usuarios').addEventListener('click', function (e) {
      var orden = e.target.closest('.orden');
      if (orden) {
        var campo = orden.getAttribute('data-orden');
        estado.orden = { campo: campo, dir: estado.orden.campo === campo && estado.orden.dir === 'asc' ? 'desc' : 'asc' };
        pintarUsuarios();
        return;
      }
      var b = e.target.closest('button[data-accion]');
      if (b && !b.disabled) accionUsuario(b);
    });
    $('u-paginacion').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pagina]');
      if (!b) return;
      estado.pagina += b.getAttribute('data-pagina') === 'siguiente' ? 1 : -1;
      pintarUsuarios();
    });
    function exportar(boton, ruta, nombre) {
      boton.disabled = true;
      var texto = boton.textContent;
      boton.textContent = 'Generando…';
      descargar(ruta, nombre)
        .catch(function (e) { if (e.message !== 'sesion') aviso(e.message, true); })
        .then(function () { boton.disabled = false; boton.textContent = texto; });
    }
    $('btn-excel').addEventListener('click', function () { exportar($('btn-excel'), '/administracion/exportar/usuarios.xlsx', 'cookly-usuarios.xlsx'); });
    $('btn-pdf').addEventListener('click', function () { exportar($('btn-pdf'), '/administracion/exportar/usuarios.pdf', 'cookly-usuarios.pdf'); });

    // reportes
    $('lista-reportes').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-resolver]');
      if (b && !b.disabled) resolverReporte(b);
    });

    // reportes de comunidad
    $('lista-reportes-comunidad').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-resolver-com]');
      if (b && !b.disabled) resolverReporteComunidad(b);
    });

    // respaldo
    $('btn-respaldo').addEventListener('click', function () {
      var b = $('btn-respaldo');
      b.disabled = true;
      b.textContent = 'Generando…';
      descargar('/administracion/respaldo/descargar', 'cookly-respaldo.json')
        .catch(function (e) { if (e.message !== 'sesion') aviso(e.message, true); })
        .then(function () { b.disabled = false; b.textContent = 'Descargar respaldo'; });
    });
    $('form-restaurar').addEventListener('submit', restaurar);
  }

  // ------------------------------------------------------------------ arranque

  iniciarEventos();
  estado.sesion = leerSesion();
  if (estado.sesion && estado.sesion.token) mostrarPanel(); else mostrarAcceso();
})();
