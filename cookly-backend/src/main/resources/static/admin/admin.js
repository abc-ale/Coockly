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
    dias: 7,
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
    'reportes-comunidad': { titulo: 'Reportes de comunidad', sub: 'Publicaciones y comentarios señalados desde Comunidad.' },
    comentarios: { titulo: 'Comentarios',          sub: 'Lo que escribe la comunidad. Elimina lo que no corresponda.' },
    resenas:  { titulo: 'Reseñas',              sub: 'Calificaciones y opiniones de las recetas. Elimina lo que no corresponda.' },
    recetas:  { titulo: 'Recetas',               sub: 'Todas las recetas publicadas, con su autor.' },
    historial: { titulo: 'Historial de acciones', sub: 'Qué hicieron los administradores y cuándo.' },
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
        else if (k === 'style') nodo.style.cssText = v;
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

  // Menú lateral por grupos (no depende de otros archivos)
  function agruparMenu() {
    var nav = document.querySelector('.navegacion');
    if (!nav || nav.querySelector('.grp')) return;
    [['resumen', 'General'], ['reportes-comunidad', 'Moderación'], ['comentarios', 'Contenido'], ['historial', 'Sistema']].forEach(function (g, i) {
      var a = nav.querySelector('a[data-nav="' + g[0] + '"]');
      if (!a) return;
      var p = el('p', { clase: 'grp', texto: g[1] });
      p.style.cssText = 'margin:' + (i ? '14px' : '0') + ' 0 4px 14px;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#B58C9B;';
      nav.insertBefore(p, a);
    });
  }

  function mostrarPanel() {
    agruparMenu();
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
    $('selector-rango').hidden = s !== 'uso';
    document.title = SECCIONES[s].titulo + ' · Cookly';
    // Todas las pantallas esperan a sus datos y aparecen completas de una sola vez (sin ver la tabla vacía).
    document.body.classList.add('rm-espera');
    var marca = (estado.marcaEspera = (estado.marcaEspera || 0) + 1);
    setTimeout(function () { if (estado.marcaEspera === marca) document.body.classList.remove('rm-espera'); }, 8000);
    cargarSeccion(s);
  }

  // Las peticiones extra del Resumen/Uso salen a la vez que las principales (una sola espera).
  function precargar(s) {
    var contar = function (ruta) { return json(ruta).then(function (l) { return Array.isArray(l) ? l.length : 0; }).catch(function () { return 0; }); };
    // Las gráficas de 90 días se guardan 60 s: al pasar de Resumen a Uso (o al revés) ya están listas.
    var c = estado.cache90;
    if (!c || Date.now() - c.t > 60000) {
      c = estado.cache90 = { t: Date.now(), p: json('/administracion/graficas?dias=90').catch(function () { estado.cache90 = null; return null; }) };
    }
    estado.pre = {
      rec: Promise.resolve(0),
      com: s === 'resumen' ? contar('/administracion/reportes-comunidad') : Promise.resolve(0),
      largas: c.p
    };
  }

  function cargarSeccion(s) {
    var tarea;
    if (s === 'resumen' || s === 'uso') precargar(s);
    if (s === 'resumen') tarea = Promise.all([cargarResumen(), cargarGraficas()]).then(pintarResumen);
    else if (s === 'uso') tarea = Promise.all([cargarResumen(), cargarGraficas()]).then(pintarUso);
    else if (s === 'usuarios') tarea = cargarUsuarios();
    else if (s === 'reportes-comunidad') tarea = cargarReportesComunidad();
    else if (s === 'respaldo') tarea = cargarRespaldo();
    else if (LISTAS[s]) tarea = cargarLista(s);
    if (!tarea) document.body.classList.remove('rm-espera');
    else if (s !== 'resumen' && s !== 'uso') {
      var fin = function () { if (estado.seccionActual === s) document.body.classList.remove('rm-espera'); };
      tarea.then(fin, fin);
    }
    if (tarea) tarea.catch(function (e) { if (window.CooklyFallo && (s === 'resumen' || s === 'uso')) window.CooklyFallo(s); if (e.message !== 'sesion') aviso(e.message, true); });
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
      ? el('span', { clase: 'cifra-nota' }, [el('a', { href: '#reportes-comunidad', texto: 'Revisar ahora' })])
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
    if (window.CooklyResumen) {
      Promise.all([estado.pre.rec, estado.pre.com, estado.pre.largas]).then(function (c) {
        window.CooklyResumen.pintar(r, g, estado.dias, { recetas: c[0], comunidad: c[1] }, c[2]);
      }).catch(function () { if (window.CooklyFallo) window.CooklyFallo('resumen'); });
    }
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
          {
            type: 'bar', label: 'Minutos de uso',
            data: dias.map(function (d) { return Number(d.minutos); }),
            backgroundColor: color('--rosa-marca'), hoverBackgroundColor: color('--ciruela'),
            borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 }, borderSkipped: false,
            maxBarThickness: 26
          }
        ]
      },
      options: {
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0, maxTicksLimit: 5 }, title: { display: true, text: 'Minutos' } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function (items) { return 'Día ' + items[0].label; },
              label: function (item) { return item.parsed.y + ' min de uso'; },
              afterLabel: function (item) {
                var activos = Number(dias[item.dataIndex].activos);
                return activos + (activos === 1 ? ' persona activa' : ' personas activas');
              }
            }
          }
        }
      }
    });

    // Las 3 horas con más sesiones se pintan en rosa y se listan debajo del gráfico.
    var topHoras = g.horasPico.filter(function (h) { return Number(h.valor) > 0; })
      .sort(function (x, y) { return Number(y.valor) - Number(x.valor); }).slice(0, 3);
    var horasTop = topHoras.map(function (h) { return String(h.hora); });
    var lienzoHoras = $('g-horas').parentNode;
    var resumenHoras = $('resumen-horas');
    if (!resumenHoras) {
      resumenHoras = el('p', { id: 'resumen-horas', clase: 'nota' });
      lienzoHoras.parentNode.insertBefore(resumenHoras, lienzoHoras.nextSibling);
    }
    resumenHoras.textContent = topHoras.length
      ? 'Se usa más a las ' + topHoras.map(function (h) { return h.hora + ':00 h (' + numero.format(h.valor) + ' sesiones)'; }).join(', ')
      : 'Todavía no hay sesiones registradas.';

    crearGrafico('g-horas', {
      type: 'bar',
      data: {
        labels: g.horasPico.map(function (h) { return h.hora + ' h'; }),
        datasets: [{ label: 'Sesiones iniciadas', data: g.horasPico.map(function (h) { return Number(h.valor); }),
          backgroundColor: g.horasPico.map(function (h) { return horasTop.indexOf(String(h.hora)) >= 0 ? color('--rosa-marca') : color('--durazno'); }),
          borderRadius: 4, maxBarThickness: 22 }]
      },
      options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 8 } } }, plugins: { legend: { display: false } } }
    });

    dibujarRanking('g-top-usuarios', 'vacio-top-usuarios', g.topUsuariosTiempo, 'Minutos de uso', color('--ciruela'));
    if (window.CooklyUso) {
      // Se pinta ya con lo que hay y, cuando llegan los 90 días, se completa (sin esperar la petición larga).
      window.CooklyUso.pintar(r, g, null);
      estado.pre.largas.then(function (g90) {
        if (g90 && estado.seccionActual === 'uso' && estado.graficas === g) window.CooklyUso.pintar(r, g, g90);
      }).catch(function () {});
    }
  }

  // ------------------------------------------------------------------ gráficas

  function color(variable) { return getComputedStyle(document.documentElement).getPropertyValue(variable).trim(); }
  function movimientoReducido() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function etiquetaDia(iso) { return iso.slice(8, 10) + '/' + iso.slice(5, 7); }

  // Chart.js (209 kB) solo se descarga la primera vez que hace falta una gráfica.
  var cargaChart = null;
  function cargarChart() {
    if (window.Chart) return Promise.resolve();
    if (!cargaChart) {
      cargaChart = new Promise(function (ok, mal) {
        var s = document.createElement('script');
        s.src = 'vendor/chart.umd.js';
        s.onload = ok;
        s.onerror = function () { cargaChart = null; mal(new Error('No se pudo cargar las gráficas.')); };
        document.head.appendChild(s);
      });
    }
    return cargaChart;
  }

  function crearGrafico(id, config) {
    if (!window.Chart) {
      cargarChart().then(function () { crearGrafico(id, config); }).catch(function () {});
      return;
    }
    if (graficos[id]) graficos[id].destroy();
    var horizontal = config.options && config.options.indexAxis === 'y';
    var base = {
      responsive: true,
      maintainAspectRatio: false,
      animation: movimientoReducido() ? false : { duration: 450, easing: 'easeOutQuart' },
      font: { family: '"DM Sans", system-ui, sans-serif', size: 12 },
      color: color('--apagado'),
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: color('--ciruela'), titleColor: '#FFF8F6', bodyColor: '#F3D9DC',
          titleFont: { weight: '700', size: 13 }, bodyFont: { size: 12.5 },
          padding: 12, cornerRadius: 14, boxPadding: 6, usePointStyle: true, caretSize: 6
        }
      },
      scales: {}
    };
    var opciones = Object.assign({}, base, config.options || {});
    opciones.plugins = Object.assign({}, base.plugins, (config.options || {}).plugins || {});
    opciones.plugins.tooltip = Object.assign({}, base.plugins.tooltip, ((config.options || {}).plugins || {}).tooltip || {});
    opciones.scales = Object.assign({}, (config.options || {}).scales || {});
    var circular = config.type === 'doughnut' || config.type === 'pie' || config.type === 'polarArea';
    if (!circular) { ['x', 'y'].forEach(function (k) { if (!opciones.scales[k]) opciones.scales[k] = {}; }); }
    Object.keys(opciones.scales).forEach(function (k) {
      var ejeConfig = opciones.scales[k];
      var esCategoria = (k === 'x' && !horizontal) || (k === 'y' && horizontal);
      ejeConfig.grid = Object.assign({ color: color('--borde'), display: !esCategoria, drawTicks: false }, ejeConfig.grid || {});
      ejeConfig.border = Object.assign({ display: false }, ejeConfig.border || {});
      ejeConfig.ticks = Object.assign({ color: color('--apagado'), padding: 8 }, esCategoria ? { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } : {}, ejeConfig.ticks || {});
    });
    graficos[id] = new Chart($(id), { type: config.type, data: config.data, options: opciones });
  }

  function dibujarBarras(id, serie, nombre, colorBarra) {
    crearGrafico(id, {
      type: 'bar',
      data: {
        labels: serie.map(function (d) { return etiquetaDia(d.dia); }),
        datasets: [{ label: nombre, data: serie.map(function (d) { return Number(d.valor); }), backgroundColor: colorBarra, borderRadius: 4, maxBarThickness: 34 }]
      },
      options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 10 } } } }
    });
  }

  function dibujarRanking(id, idVacio, filas, nombre, colorBarra) {
    var vacio = !filas || filas.length === 0;
    $(id).parentNode.hidden = vacio;
    $(idVacio).hidden = !vacio;
    if (!vacio) filas = filas.slice(0, 8);
    if (vacio) { if (graficos[id]) { graficos[id].destroy(); delete graficos[id]; } return; }
    crearGrafico(id, {
      type: 'bar',
      data: {
        labels: filas.map(function (f) { return f.nombre.length > 26 ? f.nombre.slice(0, 25) + '…' : f.nombre; }),
        datasets: [{ label: nombre, data: filas.map(function (f) { return Number(f.valor); }), backgroundColor: colorBarra, borderRadius: 4, maxBarThickness: 22 }]
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
      cuerpo.appendChild(el('tr', null, [el('td', { clase: 'sin-resultados', colspan: '8', texto: 'No hay usuarios que coincidan con la búsqueda.' })]));
    }
    var maxSeg = Math.max.apply(null, [1].concat(estado.usuarios.map(function (u) { return Number(u.segundosUso) || 0; })));
    var COL_AV = ['#FF4D82', '#FFD666', '#BFE4A5', '#F6DADD'];
    visibles.forEach(function (u) {
      var esYo = estado.sesion && u.correo.toLowerCase() === (estado.sesion.correo || '').toLowerCase();
      var esAdmin = u.rol === 'ADMINISTRADOR';
      var idTxt = /^\d+$/.test(String(u.id)) ? '#U' + String(u.id).padStart(3, '0') : '#' + String(u.id).slice(0, 5).toUpperCase();
      var cAv = COL_AV[(String(u.nombre || '?').charCodeAt(0) + String(u.id).length) % COL_AV.length];
      var pct = u.segundosUso > 0 ? Math.max(3, Math.round((Number(u.segundosUso) / maxSeg) * 100)) : 0;
      var barra = el('div', { clase: 'us-bar' }, [el('div', { style: 'width:' + pct + '%' })]);
      var menu = el('div', { clase: 'us-rm', hidden: true }, [
        el('button', { type: 'button', 'data-accion': 'rol', 'data-id': u.id, 'data-admin': esAdmin ? '1' : '0', disabled: esYo, texto: esAdmin ? 'Quitar admin' : 'Hacer admin' }),
        el('button', { type: 'button', clase: u.activo ? 'peligro' : '', 'data-accion': 'activo', 'data-id': u.id, 'data-activo': u.activo ? '1' : '0', disabled: esYo, texto: u.activo ? 'Desactivar' : 'Activar' })
      ]);
      var puntos = el('button', { type: 'button', clase: 'us-dots', 'aria-label': 'Acciones de ' + u.nombre, 'aria-haspopup': 'true', texto: '⋯' });
      var av = el('span', { clase: 'us-av', texto: String(u.nombre || '?').charAt(0).toUpperCase() });
      av.style.background = cAv; av.style.color = cAv === '#FF4D82' ? '#fff' : '#2B1020';
      cuerpo.appendChild(el('tr', null, [
        el('td', { clase: 'us-id', texto: idTxt }),
        el('td', null, [el('div', { clase: 'us-p' }, [av,
          el('div', null, [el('b', null, [document.createTextNode(u.nombre)].concat(esYo ? [el('em', { clase: 'us-yo', texto: 'Tú' })] : [])), el('span', { texto: u.correo })])])]),
        el('td', null, [el('span', { clase: 'us-pill ' + (esAdmin ? 'a' : 'u'), texto: esAdmin ? 'Administrador' : 'Usuario' })]),
        el('td', null, [el('span', { clase: 'us-pill ' + (u.activo ? 'ok' : 'no'), texto: u.activo ? 'Activo' : 'Inactivo' })]),
        el('td', null, [el('div', { clase: 'us-uso' }, [el('b', { texto: minutosATexto(u.segundosUso / 60) }), el('span', { texto: numero.format(u.sesiones) + (u.sesiones === 1 ? ' sesión' : ' sesiones') + ' · ' + (u.ultimoAcceso || 'Sin uso registrado') })]), barra]),
        el('td', { texto: (u.creadoEn || '').slice(0, 10) }),
        el('td', { texto: numero.format(u.recetas) }),
        el('td', { clase: 'us-ac' }, [puntos, menu])
      ]));
    });

    // recuadros de resumen (de toda la lista, sin filtros)
    var todos = estado.usuarios, hace7 = Date.now() - 7 * 86400000;
    var nuevos = todos.filter(function (u) { var t = Date.parse(u.creadoEn || ''); return !isNaN(t) && t >= hace7; }).length;
    var nAdm = todos.filter(function (u) { return u.rol === 'ADMINISTRADOR'; }).length;
    var nAct = todos.filter(function (u) { return u.activo; }).length;
    var tiles = $('u-tiles');
    vaciar(tiles);
    [['#FFD666', 'Usuarios', todos.length, '+' + nuevos + ' esta semana'], ['#BFE4A5', 'Activos', nAct, 'de ' + todos.length + ' cuentas'],
     ['#F6DADD', 'Administradores', nAdm, 'con acceso total'], ['#FF4D82', 'Inactivos', todos.length - nAct, 'cuentas desactivadas']].forEach(function (t) {
      var d = el('div', { clase: 'us-tile' }, [el('span', { texto: t[1] }), el('b', { texto: numero.format(t[2]) }), el('small', { texto: t[3] })]);
      d.style.background = t[0];
      tiles.appendChild(d);
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

      var nPost = lista.filter(function (r) { return r.tipo === 'POST'; }).length;
      var colP = el('div', { clase: 'rc-gp' }), colC = el('div', { clase: 'rc-gc' });
      cont.appendChild(el('div', { clase: 'rc-cols' }, [
        el('section', { clase: 'rc-colp' }, [el('h2', { clase: 'rc-ch' }, ['Publicaciones ', el('i', { texto: String(nPost) })]), colP]),
        el('section', { clase: 'rc-colc' }, [el('h2', { clase: 'rc-ch' }, ['Comentarios ', el('i', { texto: String(lista.length - nPost) })]), colC])
      ]));
      if (nPost === 0) colP.appendChild(el('p', { clase: 'rc-nada', texto: 'No hay publicaciones reportadas.' }));
      if (lista.length - nPost === 0) colC.appendChild(el('p', { clase: 'rc-nada', texto: 'No hay comentarios reportados.' }));

      var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      var COLORES = ['#FFD666', '#BFE4A5', '#F6DADD', '#FFB7CB', '#CDE6F5'];
      function fechaBonita(s) {
        var m = /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s || '');
        return m ? Number(m[3]) + ' ' + MESES[Number(m[2]) - 1] + ' ' + m[1] + ', ' + m[4] + ':' + m[5] : (s || '—');
      }
      function claseMotivo(mot) {
        mot = (mot || '').toLowerCase();
        if (/spam/.test(mot)) return 'y';
        if (/falsa|peligros/.test(mot)) return 'g';
        if (/ofens|acoso|odio|insult/.test(mot)) return 'p';
        return 'r';
      }

      lista.forEach(function (r) {
        var esPost = r.tipo === 'POST';
        var que = esPost ? 'publicación' : 'comentario';
        var existe = r.contenidoExiste !== false;
        var autor = r.autor || 'Persona desconocida';
        var suma = 0; for (var i = 0; i < autor.length; i++) suma += autor.charCodeAt(i);

        var cab = el('div', { clase: 'rc-h' }, [
          el('div', { clase: 'rc-who' }, [el('span', { clase: 'rc-av', style: 'background:' + COLORES[suma % COLORES.length], texto: autor.charAt(0).toUpperCase() }), el('b', { texto: autor })]),
          el('span', { clase: 'rc-pill ' + claseMotivo(r.motivo), texto: r.motivo || 'Sin motivo' })
        ]);
        var dos = el('div', { clase: 'rc-dos' }, [
          el('div', null, [el('small', { texto: 'Tipo' }), el('b', { texto: esPost ? 'Publicación' : 'Comentario' })]),
          el('div', null, [el('small', { texto: 'Reportado' }), el('b', { texto: fechaBonita(r.creadoEn) })])
        ]);
        var partes = [cab, dos,
          el('h3', { texto: (esPost ? 'Publicación' : 'Comentario') + ' de ' + autor }),
          el('p', { clase: 'rc-por', texto: 'Reportado por ' + (r.reportadoPor || 'un usuario') })];

        if (!existe) {
          partes.push(el('p', { clase: 'rc-txt', texto: '(Este contenido ya fue eliminado.)' }));
        } else {
          if (r.contenido) partes.push(el('p', { clase: 'rc-txt', texto: '“' + r.contenido + '”' }));
          if (r.imagenUrl && /^https:\/\//.test(r.imagenUrl)) {
            var foto = document.createElement('img');
            foto.src = r.imagenUrl;
            foto.alt = 'Foto de la publicación reportada';
            foto.loading = 'lazy';
            var enlace = el('a', { clase: 'rc-im', href: r.imagenUrl, target: '_blank', rel: 'noopener noreferrer', title: 'Abrir la foto en grande' });
            enlace.appendChild(foto);
            partes.push(enlace);
          }
        }

        partes.push(el('div', { clase: 'rc-bt' }, [
          el('button', { type: 'button', 'data-resolver-com': 'DESCARTADO', 'data-id': r.id, texto: 'Descartar' }),
          el('button', { type: 'button', clase: 'e', 'data-resolver-com': 'ELIMINAR', 'data-id': r.id, 'data-que': que, disabled: !existe, texto: 'Eliminar' }),
          el('button', { type: 'button', clase: 'd', 'data-resolver-com': 'REVISADO', 'data-id': r.id, texto: 'Revisado' })
        ]));

        (esPost ? colP : colC).appendChild(el('article', { clase: 'rc-card' }, partes));
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
    resenas: { ruta: '/administracion/resenas', cont: 'lista-resenas', buscar: 'rs-buscar', vacio: 'No hay reseñas.',
      cols: [['Fecha', 'fecha'], ['Autor', 'autor'], ['Receta', 'recetaNombre'], ['Estrellas', 'estrellas'], ['Opinión', 'contenido']],
      pregunta: '¿Eliminar esta reseña?' },
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
    if (nombre === 'historial' && filas.length) { pintarHistorial(cont, filas); return; }
    if (nombre === 'resenas' && filas.length) { pintarResenas(cont, filas); return; }
    if (nombre === 'comentarios' && filas.length) { pintarComentarios(cont, filas); return; }
    if (nombre === 'recetas' && filas.length) { pintarRecetas(cont, filas); return; }
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


  // ------------------------------------------------------------------ comentarios (sentimiento, gráfica y tarjetas)

  function pintarComentarios(cont, filas) {
    var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    var COLU = ['#FF4D82', '#FFD666', '#BFE4A5', '#F6DADD'];
    var POR_PAGINA = 12, SEMANAS = 6, SVGNS = 'http://www.w3.org/2000/svg';
    var TIPOS = {
      pos: { nombre: 'Positivos', uno: 'Positivo', a: '#C9EBB0', b: '#7FC463' },
      neu: { nombre: 'Neutros', uno: 'Neutro', a: '#FFE59A', b: '#F2B71F' },
      neg: { nombre: 'Negativos', uno: 'Negativo', a: '#FF9DBA', b: '#FF4D82' }
    };
    var ORDEN = ['pos', 'neu', 'neg'];
    var hoy0 = new Date(); hoy0 = new Date(hoy0.getFullYear(), hoy0.getMonth(), hoy0.getDate());
    function suma(s) { var n = 0; for (var i = 0; i < s.length; i++) n += s.charCodeAt(i); return n; }
    function sv(tag, attrs, texto) {
      var n = document.createElementNS(SVGNS, tag);
      Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (texto !== undefined) n.textContent = texto;
      return n;
    }
    function parteFecha(s) {
      var m = /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s || '');
      if (!m) return { texto: s || '—', sub: '', dias: 9999 };
      var dias = Math.round((hoy0 - new Date(+m[1], +m[2] - 1, +m[3])) / 86400000);
      var rel = dias <= 0 ? 'Hoy' : dias === 1 ? 'Ayer' : 'Hace ' + dias + ' días';
      return { texto: (+m[3]) + ' ' + MESES[+m[2] - 1] + ' ' + m[1], sub: rel + ' · ' + m[4] + ':' + m[5], dias: Math.max(0, dias) };
    }

    // ---- clasificación por palabras (positivo, neutro, negativo)
    var P_INI = ['gust', 'buen', 'delici', 'excelen', 'genial', 'encant', 'perfect', 'espectacul', 'increib', 'lind', 'bonit', 'felicit', 'gracias', 'facil', 'fresc', 'crujient', 'jugos', 'suav', 'sabros', 'recomend', 'repetir', 'estupend', 'fantast', 'maravill', 'riquis', 'amazing', 'awesome', 'excellent', 'wonderful', 'tasty', 'delicious'];
    var P_EXA = ['bien', 'top', 'amo', 'rico', 'rica', 'ricos', 'ricas', 'mejor', 'good', 'great', 'nice', 'love', 'yummy', 'bravo', 'si'];
    var N_INI = ['horribl', 'asco', 'pesim', 'terribl', 'salad', 'quem', 'insipid', 'desabrid', 'amarg', 'dificil', 'confus', 'perd', 'decepcion', 'aburrid', 'awful', 'disgust', 'incomest', 'agri', 'duro'];
    var N_EXA = ['mal', 'mala', 'malo', 'malos', 'malas', 'feo', 'fea', 'peor', 'sec', 'seco', 'seca', 'crudo', 'cruda', 'bad', 'worst', 'error', 'falta', 'faltan'];
    var NEGADORES = ['no', 'nunca', 'tampoco', 'ni', 'nada', 'jamas'];
    function empieza(t, lista) { for (var i = 0; i < lista.length; i++) if (t.indexOf(lista[i]) === 0) return true; return false; }
    function clasificar(texto) {
      var crudo = String(texto || '');
      var t = crudo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      var puntos = 0;
      t.split(/[,.;:!?¡¿\n]+/).forEach(function (frase) {
      var palabras = frase.split(/[^a-z0-9ñ]+/).filter(Boolean);
      palabras.forEach(function (w, i) {
        var v = 0;
        if (P_EXA.indexOf(w) >= 0 && w !== 'si' || empieza(w, P_INI)) v = 1;
        else if (N_EXA.indexOf(w) >= 0 || empieza(w, N_INI)) v = -1;
        if (!v) return;
        for (var j = Math.max(0, i - 3); j < i; j++) if (NEGADORES.indexOf(palabras[j]) >= 0) { v = -v; break; }
        puntos += v;
      });
      });
      if (/[👍❤😍😋🥰😊👏]/.test(crudo)) puntos += 1;
      if (/[👎😡🤢😤😞😠]/.test(crudo)) puntos -= 1;
      return puntos > 0 ? 'pos' : puntos < 0 ? 'neg' : 'neu';
    }

    var datos = filas.map(function (f) {
      var txt = String(f.contenido || '').trim();
      return { f: f, aut: String(f.autor || 'Usuario'), rec: String(f.recetaNombre || 'Receta'), txt: txt, fe: parteFecha(f.fecha), s: clasificar(txt) };
    });
    var total = datos.length;
    var cuenta = { pos: 0, neu: 0, neg: 0 };
    datos.forEach(function (d) { cuenta[d.s]++; });
    function pct(n) { return total ? Math.round(n * 100 / total) : 0; }

    // ---- semanas (las últimas 6, de 7 días cada una)
    var sem = [];
    for (var k = 0; k < SEMANAS; k++) {
      var ini = new Date(hoy0.getFullYear(), hoy0.getMonth(), hoy0.getDate() - (SEMANAS - k) * 7 + 1);
      sem.push({ etiqueta: ini.getDate() + ' ' + MESES[ini.getMonth()], pos: 0, neu: 0, neg: 0 });
    }
    datos.forEach(function (d) {
      var i = SEMANAS - 1 - Math.floor(d.fe.dias / 7);
      if (i >= 0 && i < SEMANAS && d.fe.dias < 9999) sem[i][d.s]++;
    });
    function pctPos(desde, hasta) {
      var p = 0, t = 0;
      for (var i = desde; i < hasta; i++) { p += sem[i].pos; t += sem[i].pos + sem[i].neu + sem[i].neg; }
      return t ? { p: Math.round(p * 100 / t), t: t } : null;
    }
    var recientes = pctPos(3, 6), previas = pctPos(0, 3);

    // ---- dibujo
    function gradientes(defs, pre) {
      ORDEN.forEach(function (t) {
        var g = sv('linearGradient', { id: pre + 'a' + t, x1: '0', y1: '0', x2: '0', y2: '1' });
        g.appendChild(sv('stop', { offset: '0', 'stop-color': TIPOS[t].b, 'stop-opacity': '.55' }));
        g.appendChild(sv('stop', { offset: '1', 'stop-color': TIPOS[t].a, 'stop-opacity': '0' }));
        defs.appendChild(g);
        var l = sv('linearGradient', { id: pre + 'l' + t, x1: '0', y1: '0', x2: '1', y2: '0' });
        l.appendChild(sv('stop', { offset: '0', 'stop-color': TIPOS[t].a }));
        l.appendChild(sv('stop', { offset: '1', 'stop-color': TIPOS[t].b }));
        defs.appendChild(l);
        var d = sv('linearGradient', { id: pre + 'd' + t, x1: '0', y1: '0', x2: '1', y2: '1' });
        d.appendChild(sv('stop', { offset: '0', 'stop-color': TIPOS[t].a }));
        d.appendChild(sv('stop', { offset: '1', 'stop-color': TIPOS[t].b }));
        defs.appendChild(d);
      });
    }
    var FUENTE = "'DM Sans', Arial, sans-serif";
    function grafica(pre, conHover) {
      var X0 = 74, PASO = 100, Y0 = 214, ALTO = 190;
      var mayor = 0; sem.forEach(function (w) { mayor = Math.max(mayor, w.pos, w.neu, w.neg); });
      var tope = Math.max(5, Math.ceil(mayor / 5) * 5), PU = ALTO / tope;
      var svg = sv('svg', { viewBox: '0 0 660 262', role: 'img', 'aria-label': 'Comentarios positivos, neutros y negativos por semana' });
      var defs = sv('defs'); gradientes(defs, pre); svg.appendChild(defs);
      for (var v = 0; v <= tope; v += tope / 5) {
        var y = Y0 - v * PU;
        var ln = sv('line', { x1: '52', x2: '640', y1: String(y), y2: String(y), stroke: v === 0 ? '#E3CDD2' : '#F3E3E6', 'stroke-width': '1' });
        if (v) ln.setAttribute('stroke-dasharray', '3 5');
        svg.appendChild(ln);
        svg.appendChild(sv('text', { x: '40', y: String(y + 4), 'text-anchor': 'end', 'font-size': '11.5', fill: '#7A6670', 'font-family': FUENTE }, String(v)));
      }
      function puntos(t) { return sem.map(function (w, i) { return [X0 + i * PASO, Y0 - w[t] * PU]; }); }
      function suave(p) {
        var d = 'M' + p[0][0].toFixed(1) + ',' + p[0][1].toFixed(1);
        for (var i = 0; i < p.length - 1; i++) {
          var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p[i + 1], t = 0.18;
          var c1 = [p1[0] + (p2[0] - p0[0]) * t, Math.min(Y0, p1[1] + (p2[1] - p0[1]) * t)];
          var c2 = [p2[0] - (p3[0] - p1[0]) * t, Math.min(Y0, p2[1] - (p3[1] - p1[1]) * t)];
          d += ' C' + c1[0].toFixed(1) + ',' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ',' + c2[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
        }
        return d;
      }
      var capas = ['pos', 'neg', 'neu'];
      capas.forEach(function (t) {
        var p = puntos(t);
        svg.appendChild(sv('path', { d: suave(p) + ' L' + p[p.length - 1][0] + ',' + Y0 + ' L' + p[0][0] + ',' + Y0 + ' Z', fill: 'url(#' + pre + 'a' + t + ')' }));
      });
      capas.forEach(function (t) { svg.appendChild(sv('path', { d: suave(puntos(t)), fill: 'none', stroke: 'url(#' + pre + 'l' + t + ')', 'stroke-width': '3', 'stroke-linecap': 'round' })); });
      capas.forEach(function (t) {
        puntos(t).forEach(function (p) { svg.appendChild(sv('circle', { cx: String(p[0]), cy: String(p[1]), r: '5', fill: TIPOS[t].b, stroke: '#fff', 'stroke-width': '2.5' })); });
      });
      // pico de negativos
      var iMax = -1, vMax = 0;
      sem.forEach(function (w, i) { if (w.neg > vMax) { vMax = w.neg; iMax = i; } });
      if (iMax >= 0 && vMax >= 2) {
        var px = X0 + iMax * PASO, py = Y0 - vMax * PU, txt = 'Pico: ' + vMax + ' negativos';
        svg.appendChild(sv('line', { x1: String(px), x2: String(px), y1: String(py - 8), y2: String(py - 30), stroke: '#2B1020', 'stroke-width': '1.5' }));
        svg.appendChild(sv('rect', { x: String(px - 62), y: String(py - 58), width: '124', height: '28', rx: '14', fill: '#2B1020' }));
        svg.appendChild(sv('text', { x: String(px), y: String(py - 40), 'text-anchor': 'middle', 'font-size': '12', 'font-weight': '700', fill: '#fff', 'font-family': FUENTE }, txt));
      }
      sem.forEach(function (w, i) {
        svg.appendChild(sv('text', { x: String(X0 + i * PASO), y: String(Y0 + 24), 'text-anchor': 'middle', 'font-size': '11.5', fill: '#7A6670', 'font-family': FUENTE }, w.etiqueta));
      });
      if (conHover) {
        sem.forEach(function (w, i) {
          var x = X0 + i * PASO, tx = i < SEMANAS - 2 ? x + 14 : x - 146;
          var g = sv('g', { 'class': 'cm-hv' });
          g.appendChild(sv('rect', { x: String(x - PASO / 2), y: '14', width: String(PASO), height: String(Y0 - 14 + 30), fill: 'transparent' }));
          g.appendChild(sv('line', { 'class': 'cm-gl', x1: String(x), x2: String(x), y1: '18', y2: String(Y0), stroke: '#2B1020', 'stroke-opacity': '.25', 'stroke-dasharray': '3 4' }));
          var tp = sv('g', { 'class': 'cm-tp' });
          tp.appendChild(sv('rect', { x: String(tx), y: '26', width: '132', height: '86', rx: '14', fill: '#2B1020' }));
          tp.appendChild(sv('text', { x: String(tx + 14), y: '46', 'font-size': '12', 'font-weight': '700', fill: '#fff', 'font-family': FUENTE }, 'Semana del ' + w.etiqueta));
          ORDEN.forEach(function (t, j) {
            tp.appendChild(sv('circle', { cx: String(tx + 18), cy: String(61 + j * 18), r: '4', fill: TIPOS[t].b }));
            tp.appendChild(sv('text', { x: String(tx + 30), y: String(65 + j * 18), 'font-size': '12', fill: '#F3D9DC', 'font-family': FUENTE }, w[t] + ' ' + TIPOS[t].nombre.toLowerCase()));
          });
          g.appendChild(tp); svg.appendChild(g);
        });
      }
      return svg;
    }
    function dona(pre, tam, grosor, centro, conTexto) {
      var r = (tam - grosor) / 2 - 4, c = 2 * Math.PI * r, ang = 0, hueco = 8, m = tam / 2;
      var svg = sv('svg', { viewBox: '0 0 ' + tam + ' ' + tam, width: String(tam), height: String(tam) });
      var defs = sv('defs'); gradientes(defs, pre); svg.appendChild(defs);
      var g = sv('g', { transform: 'rotate(-90 ' + m + ' ' + m + ')' });
      g.appendChild(sv('circle', { cx: String(m), cy: String(m), r: String(r), fill: 'none', stroke: conTexto ? '#fff' : '#F6E4E7', 'stroke-width': String(grosor) }));
      ORDEN.forEach(function (t) {
        if (!cuenta[t]) return;
        var L = c * cuenta[t] / total, d = Math.max(L - hueco, 0.1);
        g.appendChild(sv('circle', { cx: String(m), cy: String(m), r: String(r), fill: 'none', stroke: 'url(#' + pre + 'd' + t + ')', 'stroke-width': String(grosor), 'stroke-linecap': 'round', 'stroke-dasharray': d.toFixed(1) + ' ' + (c - d).toFixed(1), 'stroke-dashoffset': (-(ang + hueco / 2)).toFixed(1) }));
        ang += L;
      });
      svg.appendChild(g);
      return svg;
    }

    // ---- tarjeta de resumen
    var porc = pct(cuenta.pos);
    var donaPanel = el('div', { clase: 'cm-pd' }, [el('div', null, [el('b', { texto: porc + ' %' }), el('small', { texto: 'positivos' })])]);
    donaPanel.insertBefore(dona('cp', 150, 20, null, true), donaPanel.firstChild);
    var leyenda = el('div', { clase: 'cm-lg2' }, ORDEN.map(function (t) {
      var i = el('i'); i.style.background = 'linear-gradient(135deg,' + TIPOS[t].a + ',' + TIPOS[t].b + ')';
      return el('div', { clase: 'r' }, [i, el('span', { texto: TIPOS[t].nombre }), el('b', { texto: String(cuenta[t]) }), el('small', { texto: pct(cuenta[t]) + ' %' })]);
    }));
    var leyendaGraf = el('div', { clase: 'cm-lgh' }, ORDEN.map(function (t) {
      var i = el('i'); i.style.background = 'linear-gradient(90deg,' + TIPOS[t].a + ',' + TIPOS[t].b + ')';
      return el('span', null, [i, document.createTextNode(TIPOS[t].nombre)]);
    }));
    var filasTabla = sem.map(function (w) {
      var t = w.pos + w.neu + w.neg;
      return el('tr', null, [el('td', { texto: w.etiqueta }), el('td', { texto: String(w.pos) }), el('td', { texto: String(w.neu) }), el('td', { texto: String(w.neg) }), el('td', { texto: String(t) })]);
    });
    var cambio = null;
    if (recientes && previas) {
      var dif = recientes.p - previas.p;
      cambio = el('span', { clase: 'cm-dl' + (dif < 0 ? ' baja' : ''), texto: (dif >= 0 ? '▲ ' : '▼ ') + Math.abs(dif) + ' pts positivos' });
    }
    var menu = el('div', { clase: 'cm-ddm', hidden: true }, [
      el('button', { type: 'button', 'data-bajar': 'png' }, [el('b', { texto: 'Imagen (PNG)' }), el('small', { texto: 'La gráfica con los porcentajes de positivos, neutros y negativos' })]),
      el('button', { type: 'button', 'data-bajar': 'pdf' }, [el('b', { texto: 'Informe (PDF)' }), el('small', { texto: 'Gráfica, porcentajes y detalle por semana' })]),
      el('button', { type: 'button', 'data-bajar': 'csv' }, [el('b', { texto: 'Datos (Excel)' }), el('small', { texto: 'Cantidades y % por semana en una hoja' })])
    ]);
    var botonBajar = el('button', { type: 'button', clase: 'cm-ddb', 'aria-haspopup': 'true', 'aria-expanded': 'false' }, [document.createTextNode('⤓ Descargar ▾')]);
    var graf = grafica('cg', true);
    graf.setAttribute('class', 'cm-ch');
    cont.appendChild(el('section', { clase: 'cm-pc' }, [
      el('div', { clase: 'cm-pl' }, [el('div', null, [el('h2', { texto: 'Sentimiento' }), el('p', { texto: 'Cómo se sienten los comentarios' })]), el('div', { clase: 'cm-plb' }, [donaPanel, leyenda])]),
      el('div', { clase: 'cm-pr' }, [
        el('div', { clase: 'cm-prh' }, [el('div', null, [el('h2', { texto: 'Comentarios por semana' }), el('p', { clase: 'sub', texto: 'Positivos, neutros y negativos · últimas 6 semanas' })]),
          el('div', { clase: 'cm-acc' }, [cambio, el('div', { clase: 'cm-dd' }, [botonBajar, menu])])]),
        leyendaGraf, graf
      ]),
      el('details', { clase: 'cm-tbl' }, [el('summary', { texto: 'Ver como tabla' }),
        el('table', null, [el('thead', null, [el('tr', null, ['Semana', 'Positivos', 'Neutros', 'Negativos', 'Total'].map(function (x) { return el('th', { texto: x }); }))]), el('tbody', null, filasTabla)])])
    ]));

    // ---- descargas (todo se genera en el navegador)
    function exportarSvg() {
      var W = 1040, H = 470;
      var raiz = sv('svg', { xmlns: SVGNS, viewBox: '0 0 ' + W + ' ' + H, width: String(W), height: String(H) });
      raiz.appendChild(sv('rect', { width: String(W), height: String(H), fill: '#FFFFFF' }));
      raiz.appendChild(sv('text', { x: '36', y: '52', 'font-size': '26', 'font-weight': '700', fill: '#2B1020', 'font-family': FUENTE }, 'Sentimiento de los comentarios'));
      raiz.appendChild(sv('text', { x: '36', y: '76', 'font-size': '14', fill: '#7A6670', 'font-family': FUENTE }, 'Cookly · ' + total + ' comentarios · ' + hoy0.getDate() + ' ' + MESES[hoy0.getMonth()] + ' ' + hoy0.getFullYear()));
      var d = dona('ce', 170, 22, null, false); d.setAttribute('x', '40'); d.setAttribute('y', '110'); raiz.appendChild(d);
      raiz.appendChild(sv('text', { x: '125', y: '204', 'text-anchor': 'middle', 'font-size': '34', 'font-weight': '700', fill: '#2B1020', 'font-family': FUENTE }, porc + ' %'));
      raiz.appendChild(sv('text', { x: '125', y: '226', 'text-anchor': 'middle', 'font-size': '13', fill: '#7A6670', 'font-family': FUENTE }, 'positivos'));
      ORDEN.forEach(function (t, i) {
        var y = 330 + i * 40;
        raiz.appendChild(sv('circle', { cx: '52', cy: String(y - 5), r: '7', fill: TIPOS[t].b }));
        raiz.appendChild(sv('text', { x: '70', y: String(y), 'font-size': '16', 'font-weight': '700', fill: '#2B1020', 'font-family': FUENTE }, TIPOS[t].nombre));
        raiz.appendChild(sv('text', { x: '240', y: String(y), 'text-anchor': 'end', 'font-size': '16', fill: '#2B1020', 'font-family': FUENTE }, cuenta[t] + ' · ' + pct(cuenta[t]) + ' %'));
      });
      var g = grafica('cx', false);
      g.setAttribute('x', '300'); g.setAttribute('y', '100'); g.setAttribute('width', '700'); g.setAttribute('height', '278');
      raiz.appendChild(g);
      var lx = 330;
      ORDEN.forEach(function (t) {
        raiz.appendChild(sv('rect', { x: String(lx), y: '398', width: '22', height: '6', rx: '3', fill: TIPOS[t].b }));
        raiz.appendChild(sv('text', { x: String(lx + 30), y: '405', 'font-size': '13', 'font-weight': '700', fill: '#5C4651', 'font-family': FUENTE }, TIPOS[t].nombre));
        lx += 130;
      });
      return raiz;
    }
    function bajar(blob, nombre) {
      var a = el('a', { href: URL.createObjectURL(blob), download: nombre });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }
    function bajarPng() {
      var xml = new XMLSerializer().serializeToString(exportarSvg());
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = 2080; c.height = 940;
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { if (b) bajar(b, 'cookly-sentimiento-comentarios.png'); else aviso('No se pudo crear la imagen.', true); }, 'image/png');
      };
      img.onerror = function () { aviso('No se pudo crear la imagen.', true); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    }
    function bajarCsv() {
      var L = [['Resumen', 'Cantidad', 'Porcentaje']];
      ORDEN.forEach(function (t) { L.push([TIPOS[t].nombre, cuenta[t], pct(cuenta[t]) + ' %']); });
      L.push(['Total', total, '100 %'], [], ['Semana (inicio)', 'Positivos', 'Neutros', 'Negativos', 'Total', '% positivos', '% neutros', '% negativos']);
      sem.forEach(function (w) {
        var t = w.pos + w.neu + w.neg, p = function (n) { return t ? Math.round(n * 100 / t) + ' %' : '0 %'; };
        L.push([w.etiqueta, w.pos, w.neu, w.neg, t, p(w.pos), p(w.neu), p(w.neg)]);
      });
      var csv = L.map(function (f) { return f.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
      bajar(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), 'cookly-sentimiento-comentarios.csv');
    }
    function bajarPdf() {
      var svgTxt = new XMLSerializer().serializeToString(exportarSvg());
      var filasHtml = sem.map(function (w) { var t = w.pos + w.neu + w.neg; return '<tr><td>' + w.etiqueta + '</td><td>' + w.pos + '</td><td>' + w.neu + '</td><td>' + w.neg + '</td><td>' + t + '</td></tr>'; }).join('');
      var html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Sentimiento de los comentarios</title><style>body{font-family:Arial,sans-serif;color:#2B1020;margin:28px}h1{font-size:22px}svg{width:100%;height:auto}table{border-collapse:collapse;width:100%;margin-top:18px}th,td{border:1px solid #E8D4D8;padding:7px 10px;text-align:left;font-size:13px}th{background:#FFF4F6}</style></head><body><h1>Informe de sentimiento · Comentarios</h1>' + svgTxt +
        '<table><thead><tr><th>Tipo</th><th>Cantidad</th><th>Porcentaje</th></tr></thead><tbody>' + ORDEN.map(function (t) { return '<tr><td>' + TIPOS[t].nombre + '</td><td>' + cuenta[t] + '</td><td>' + pct(cuenta[t]) + ' %</td></tr>'; }).join('') + '</tbody></table>' +
        '<table><thead><tr><th>Semana (inicio)</th><th>Positivos</th><th>Neutros</th><th>Negativos</th><th>Total</th></tr></thead><tbody>' + filasHtml + '</tbody></table></body></html>';
      var url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      var w = window.open(url, '_blank');
      if (!w) { aviso('Permite las ventanas emergentes para generar el PDF.', true); return; }
      w.addEventListener('load', function () { w.focus(); w.print(); });
    }
    botonBajar.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      botonBajar.setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
    });
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-bajar]');
      if (!b) return;
      menu.hidden = true; botonBajar.setAttribute('aria-expanded', 'false');
      var q = b.getAttribute('data-bajar');
      if (q === 'png') bajarPng(); else if (q === 'pdf') bajarPdf(); else bajarCsv();
    });
    if (!pintarComentarios.cierre) {
      pintarComentarios.cierre = true;
      document.addEventListener('click', function (e) {
        if (e.target.closest('.cm-dd')) return;
        document.querySelectorAll('.cm-ddm').forEach(function (m) { m.hidden = true; });
      });
    }

    // ---- pestañas y tarjetas
    var ICONOS = {
      pos: 'M8 14.5s1.5 2.2 4 2.2 4-2.2 4-2.2',
      neg: 'M8 16.5s1.5-2.2 4-2.2 4 2.2 4 2.2',
      neu: 'M8.5 15.5h7'
    };
    function cara(t) {
      var s = sv('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      s.appendChild(sv('circle', { cx: '12', cy: '12', r: '9' }));
      s.appendChild(sv('path', { d: ICONOS[t] }));
      s.appendChild(sv('path', { d: 'M9 9.5h.01M15 9.5h.01' }));
      return s;
    }
    function papelera() {
      var s = sv('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      s.appendChild(sv('path', { d: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3' }));
      return s;
    }
    function tenedor() {
      var s = sv('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      s.appendChild(sv('path', { d: 'M6 3h12M7 3v4a5 5 0 0 0 10 0V3M12 12v9' }));
      return s;
    }
    var estado = { tipo: '', pagina: 1 };
    var tabs = el('div', { clase: 'cm-tabs' });
    var muro = el('div', { clase: 'cm-wall' }), pie = el('span'), pager = el('div', { clase: 'rs-pg cm-pg' });
    cont.appendChild(tabs); cont.appendChild(muro); cont.appendChild(el('div', { clase: 'cm-pie' }, [pie, pager]));

    function pintarTabs() {
      vaciar(tabs);
      [['', 'Todos', total, null], ['pos', 'Positivos', cuenta.pos, 'pos'], ['neg', 'Negativos', cuenta.neg, 'neg'], ['neu', 'Neutros', cuenta.neu, 'neu']].forEach(function (t) {
        var b = el('button', { type: 'button', clase: 'cm-tab ' + (t[3] || '') + (estado.tipo === t[0] ? ' on' : ''), 'data-tipo': t[0] });
        if (t[3]) b.appendChild(cara(t[3]));
        b.appendChild(document.createTextNode(t[1] + ' '));
        b.appendChild(el('b', { texto: String(t[2]) }));
        tabs.appendChild(b);
      });
    }
    function refrescar() {
      var lista = datos.filter(function (d) { return !estado.tipo || d.s === estado.tipo; });
      var paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
      if (estado.pagina > paginas) estado.pagina = paginas;
      var ini = (estado.pagina - 1) * POR_PAGINA, vis = lista.slice(ini, ini + POR_PAGINA);
      pintarTabs();
      vaciar(muro);
      if (!vis.length) muro.appendChild(el('p', { clase: 'cm-nada', texto: 'No hay comentarios de este tipo.' }));
      vis.forEach(function (d) {
        var cu = COLU[suma(d.aut) % COLU.length];
        var av = el('span', { clase: 'cm-av', texto: d.aut.charAt(0).toUpperCase() });
        av.style.background = cu; av.style.color = cu === '#FF4D82' ? '#fff' : '#2B1020';
        var mood = el('span', { clase: 'cm-mood', title: TIPOS[d.s].uno }, [cara(d.s)]);
        var del = el('button', { type: 'button', clase: 'cm-x', 'data-id': d.f.id, title: 'Eliminar', 'aria-label': 'Eliminar comentario de ' + d.aut }, [papelera()]);
        var rc = el('span', { clase: 'cm-rc' }, [tenedor(), document.createTextNode(d.rec)]);
        muro.appendChild(el('article', { clase: 'cm-card ' + d.s }, [
          el('div', { clase: 'cm-hd' }, [av, el('div', null, [el('b', { texto: d.aut }), el('small', { texto: d.fe.sub || d.fe.texto })]), mood, del]),
          el('p', { clase: 'cm-t', texto: d.txt || 'Sin texto' }), rc
        ]));
      });
      pie.textContent = lista.length ? 'Mostrando ' + (ini + 1) + '–' + (ini + vis.length) + ' de ' + lista.length + ' comentarios' : '0 comentarios';
      vaciar(pager);
      if (paginas > 1) {
        var mk = function (txt, p, on, off) { return el('button', { type: 'button', clase: on ? 'on' : null, 'data-pg': p, disabled: off, 'aria-label': 'Página ' + p, texto: txt }); };
        pager.appendChild(mk('‹', estado.pagina - 1, false, estado.pagina === 1));
        for (var p = 1; p <= paginas; p++) pager.appendChild(mk(String(p), p, p === estado.pagina, false));
        pager.appendChild(mk('›', estado.pagina + 1, false, estado.pagina === paginas));
      }
    }
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tipo]');
      if (!b) return;
      estado.tipo = estado.tipo === b.getAttribute('data-tipo') ? '' : b.getAttribute('data-tipo');
      estado.pagina = 1; refrescar();
    });
    pager.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pg]');
      if (!b || b.disabled) return;
      estado.pagina = Number(b.getAttribute('data-pg')); refrescar();
    });
    refrescar();
  }

  // ------------------------------------------------------------------ recetas (tarjetas con la foto de Cloudinary)

  function pintarRecetas(cont, filas) {
    var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    var COLU = ['#FF4D82', '#FFD666', '#BFE4A5', '#F6DADD'];
    var FONDOS = ['#FFD666', '#BFE4A5', '#F6DADD', '#FF9DBA'];
    var POR_PAGINA = 12, SVGNS = 'http://www.w3.org/2000/svg';
    function suma(s) { var n = 0; for (var i = 0; i < s.length; i++) n += s.charCodeAt(i); return n; }
    function sv(tag, attrs) {
      var n = document.createElementNS(SVGNS, tag);
      Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      return n;
    }
    function icono(d, relleno) {
      var s = sv('svg', relleno ? { viewBox: '0 0 24 24', fill: 'currentColor' } : { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      s.appendChild(sv('path', { d: d }));
      return s;
    }
    var D_CUBIERTO = 'M6 3h12M7 3v4a5 5 0 0 0 10 0V3M12 12v9';
    var D_CHAT = 'M4 5h16v11H9l-5 4z';
    var D_CORAZON = 'M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z';
    var D_BASURA = 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3';
    // Misma optimización que usa la app: Cloudinary entrega la foto liviana (ancho 500, calidad 80).
    function optimizar(url) {
      if (!url) return '';
      url = String(url);
      if (url.indexOf('res.cloudinary.com') < 0 || !/\/upload\/v\d+\//.test(url)) return url;
      return url.replace('/upload/', '/upload/w_500,q_80/');
    }
    function fechaCorta(s) {
      var m = /(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
      return m ? (+m[3]) + ' ' + MESES[+m[2] - 1] + ' ' + m[1] : (s || '—');
    }

    var datos = filas.map(function (f, i) {
      return { f: f, id: f.id, nom: String(f.nombre || 'Receta'), aut: String(f.autor || 'Usuario'), fe: fechaCorta(f.fecha),
        c: Number(f.comentarios) || 0, fav: Number(f.favoritos) || 0, url: optimizar(f.imagenUrl || f.imagen || f.url), fondo: FONDOS[i % FONDOS.length] };
    });
    var totC = 0, totF = 0, sinInter = 0, conFoto = 0;
    datos.forEach(function (d) { totC += d.c; totF += d.fav; if (!d.c && !d.fav) sinInter++; if (d.url) conFoto++; });

    function tile(etiqueta, valor, sub, color, claro) {
      var t = el('div', { clase: 'us-tile' }, [el('span', { texto: etiqueta }), el('b', { texto: numero.format(valor) }), el('small', { texto: sub })]);
      t.style.background = color;
      if (claro) { t.style.color = '#fff'; t.querySelector('small').style.color = 'rgba(255,255,255,.85)'; }
      return t;
    }
    cont.appendChild(el('div', { clase: 'us-tiles' }, [
      tile('Recetas', datos.length, 'publicadas', '#FFD666'),
      tile('Comentarios', totC, 'en todas las recetas', '#BFE4A5'),
      tile('Favoritos', totF, 'guardados por usuarios', '#F6DADD'),
      tile('Sin interacción', sinInter, 'sin comentarios ni favoritos', '#FF4D82', true)
    ]));

    // Aviso de diagnóstico: dice por qué no se ven las fotos (servidor sin imagenUrl o navegador que las bloquea).
    var aviso2 = el('div', { clase: 'rc-aviso', hidden: true });
    cont.appendChild(aviso2);
    var fallos = 0;
    function avisar(texto) { aviso2.textContent = texto; aviso2.hidden = false; }
    if (!conFoto) avisar('El servidor todavía no envía las fotos de las recetas (campo imagenUrl). Falta actualizar el backend en Render.');
    var muro = el('div', { clase: 'rc-wall' }), pie = el('span'), pager = el('div', { clase: 'rs-pg rc-pg' });
    cont.appendChild(el('div', { clase: 'rc-card' }, [muro, el('div', { clase: 'rc-pie' }, [pie, pager])]));
    var estado = { pagina: 1 };

    function portada(d) {
      var p = el('div', { clase: 'rc-cov' }, [icono(D_CUBIERTO), el('span', { clase: 'rc-id', texto: '#R' + String(d.id).padStart(3, '0') })]);
      p.style.background = 'linear-gradient(135deg,' + d.fondo + ',#fff)';
      if (d.url) {
        var img = el('img', { src: d.url, alt: d.nom, loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
        img.addEventListener('load', function () { p.classList.add('con-foto'); });
        img.addEventListener('error', function () {
          img.remove(); fallos++;
          if (fallos >= 1) avisar('El servidor envió las fotos, pero el navegador no pudo cargarlas. Revisa que img-src permita https://res.cloudinary.com en ConfiguracionSeguridad.java, o que la URL de la foto exista.');
        });
        p.insertBefore(img, p.firstChild);
      }
      return p;
    }
    function refrescar() {
      var paginas = Math.max(1, Math.ceil(datos.length / POR_PAGINA));
      if (estado.pagina > paginas) estado.pagina = paginas;
      var ini = (estado.pagina - 1) * POR_PAGINA, vis = datos.slice(ini, ini + POR_PAGINA);
      vaciar(muro);
      vis.forEach(function (d) {
        var cu = COLU[suma(d.aut) % COLU.length];
        var av = el('span', { clase: 'rc-av', texto: d.aut.charAt(0).toUpperCase() });
        av.style.background = cu; av.style.color = cu === '#FF4D82' ? '#fff' : '#2B1020';
        var pc = el('span', { clase: 'rc-sp' + (d.c ? '' : ' cero'), title: 'Comentarios' }, [icono(D_CHAT), document.createTextNode(String(d.c))]);
        var pf = el('span', { clase: 'rc-sp fav' + (d.fav ? '' : ' cero'), title: 'Favoritos' }, [icono(D_CORAZON, true), document.createTextNode(String(d.fav))]);
        var del = el('button', { type: 'button', clase: 'rc-x', 'data-id': d.id, title: 'Eliminar', 'aria-label': 'Eliminar ' + d.nom }, [icono(D_BASURA)]);
        muro.appendChild(el('article', { clase: 'rc-item' }, [
          portada(d),
          el('div', { clase: 'rc-body' }, [
            el('h3', { texto: d.nom }),
            el('div', { clase: 'rc-au' }, [av, el('span', { clase: 'rc-an', texto: d.aut }), el('small', { texto: d.fe })]),
            el('div', { clase: 'rc-st' }, [pc, pf, del])
          ])
        ]));
      });
      pie.textContent = 'Mostrando ' + (ini + 1) + '–' + (ini + vis.length) + ' de ' + datos.length + ' recetas';
      vaciar(pager);
      if (paginas > 1) {
        var mk = function (txt, p, on, off) { return el('button', { type: 'button', clase: on ? 'on' : null, 'data-pg': p, disabled: off, 'aria-label': 'Página ' + p, texto: txt }); };
        pager.appendChild(mk('‹', estado.pagina - 1, false, estado.pagina === 1));
        for (var p = 1; p <= paginas; p++) pager.appendChild(mk(String(p), p, p === estado.pagina, false));
        pager.appendChild(mk('›', estado.pagina + 1, false, estado.pagina === paginas));
      }
    }
    pager.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pg]');
      if (!b || b.disabled) return;
      estado.pagina = Number(b.getAttribute('data-pg')); refrescar();
    });
    refrescar();
  }

  // ------------------------------------------------------------------ nueva receta (formulario con foto a Cloudinary)

  function abrirNuevaReceta() {
    if (document.getElementById('nr-fondo')) return;
    var foto = null, enviando = false, urlVista = null, valorMin = null;
    var SVGNS = 'http://www.w3.org/2000/svg';
    function icono(d) {
      var s = document.createElementNS(SVGNS, 'svg');
      s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
      s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
      s.setAttribute('aria-hidden', 'true');
      var p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); s.appendChild(p);
      return s;
    }
    var D_CAMARA = 'M4 8h3l2-3h6l2 3h3v11H4zM12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z';
    var UNIDADES = ['', 'g', 'kg', 'ml', 'l', 'taza', 'cucharada', 'cucharadita', 'unidad', 'pizca'];
    function bloque(num, titulo, ayuda, hijos) {
      return el('section', { clase: 'nr-bloque' }, [
        el('div', { clase: 'nr-bt' }, [el('span', { clase: 'nr-num', texto: String(num) }), el('div', null, [el('h3', { texto: titulo }), ayuda ? el('p', { texto: ayuda }) : null])])
      ].concat(hijos));
    }

    // 1. Nombre
    var nombre = el('input', { type: 'text', id: 'nr-nombre', maxlength: '120', placeholder: 'Ej. Lomo saltado', autocomplete: 'off', 'aria-required': 'true' });

    // 2. Foto
    var archivo = el('input', { type: 'file', accept: 'image/*', clase: 'nr-archivo', 'aria-label': 'Elegir foto de la receta' });
    var caja = el('div', { clase: 'nr-caja' }), textoFoto = el('div', { clase: 'nr-ft' }), zona = el('div', { clase: 'nr-zona' }, [caja, textoFoto]);
    var bElegir = el('button', { type: 'button', clase: 'nr-btn', texto: 'Elegir foto' });
    var bQuitar = el('button', { type: 'button', clase: 'nr-btn suave', texto: 'Quitar', hidden: true });
    function pintarFoto() {
      vaciar(caja); vaciar(textoFoto);
      if (urlVista) { URL.revokeObjectURL(urlVista); urlVista = null; }
      if (foto) {
        urlVista = URL.createObjectURL(foto);
        caja.appendChild(el('img', { alt: 'Vista previa de la foto', src: urlVista }));
        textoFoto.appendChild(el('b', { texto: foto.name.length > 34 ? foto.name.slice(0, 31) + '…' : foto.name }));
        textoFoto.appendChild(el('small', { texto: 'Foto lista. Puedes cambiarla.' }));
      } else {
        caja.appendChild(icono(D_CAMARA));
        textoFoto.appendChild(el('b', { texto: 'Agrega una foto' }));
        textoFoto.appendChild(el('small', { texto: 'O arrástrala aquí · JPG o PNG · máx. 8 MB' }));
      }
      bElegir.textContent = foto ? 'Cambiar foto' : 'Elegir foto';
      bQuitar.hidden = !foto;
    }
    function tomarFoto(f) {
      if (!f) return;
      if (!/^image\//.test(f.type)) { aviso('Elige un archivo de imagen (JPG o PNG).', true); return; }
      if (f.size > 8 * 1024 * 1024) { aviso('La foto pesa más de 8 MB. Elige una más liviana.', true); return; }
      foto = f; pintarFoto();
    }
    archivo.addEventListener('change', function () { tomarFoto(archivo.files && archivo.files[0]); archivo.value = ''; });
    bElegir.addEventListener('click', function () { archivo.click(); });
    bQuitar.addEventListener('click', function () { foto = null; pintarFoto(); });
    ['dragenter', 'dragover'].forEach(function (n) { zona.addEventListener(n, function (e) { e.preventDefault(); zona.classList.add('arrastrando'); }); });
    ['dragleave', 'drop'].forEach(function (n) { zona.addEventListener(n, function (e) { e.preventDefault(); zona.classList.remove('arrastrando'); }); });
    zona.addEventListener('drop', function (e) { tomarFoto(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
    pintarFoto();

    // 3. Tiempo
    var minutos = el('input', { type: 'number', min: '1', max: '1440', placeholder: 'Minutos', 'aria-label': 'Minutos de preparación', hidden: true });
    var chips = el('div', { clase: 'nr-chips', role: 'group', 'aria-label': 'Tiempo de preparación' });
    [['15 min', 15], ['30 min', 30], ['45 min', 45], ['1 hora', 60], ['Otro', 0]].forEach(function (par) {
      var b = el('button', { type: 'button', clase: 'nr-chip', texto: par[0], 'aria-pressed': 'false' });
      b.addEventListener('click', function () {
        var ya = b.classList.contains('on');
        Array.prototype.forEach.call(chips.children, function (c) { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
        minutos.hidden = true;
        if (ya) { valorMin = null; minutos.value = ''; return; }
        b.classList.add('on'); b.setAttribute('aria-pressed', 'true');
        if (par[1]) { valorMin = par[1]; minutos.value = ''; } else { valorMin = null; minutos.hidden = false; minutos.focus(); }
      });
      chips.appendChild(b);
    });

    // 4. Ingredientes
    var ingredientes = el('div', { clase: 'nr-filas' });
    function filaIngrediente() {
      var uni = el('select', { 'aria-label': 'Unidad' }, UNIDADES.map(function (u) { return el('option', { value: u, texto: u || 'Unidad' }); }));
      var f = el('div', { clase: 'nr-fila ing' }, [
        el('input', { type: 'text', placeholder: 'Ej. Carne de res', 'aria-label': 'Ingrediente', maxlength: '80' }),
        el('input', { type: 'number', step: 'any', min: '0', placeholder: '0', 'aria-label': 'Cantidad', inputmode: 'decimal' }),
        uni,
        el('button', { type: 'button', clase: 'nr-quitar', title: 'Quitar ingrediente', 'aria-label': 'Quitar ingrediente', texto: '×' })
      ]);
      f.lastChild.addEventListener('click', function () { if (ingredientes.children.length > 1) { f.remove(); actualizar(); } else { f.querySelector('input').value = ''; } });
      f.firstChild.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (f === ingredientes.lastChild) agregarIng(); else f.nextSibling.firstChild.focus(); } });
      ingredientes.appendChild(f);
    }
    function agregarIng() { filaIngrediente(); actualizar(); ingredientes.lastChild.querySelector('input').focus(); }

    // 5. Pasos
    var pasos = el('div', { clase: 'nr-filas' });
    function filaPaso() {
      var f = el('div', { clase: 'nr-fila paso' }, [
        el('span', { clase: 'nr-n', texto: '' }),
        el('textarea', { rows: '2', placeholder: 'Escribe qué hay que hacer', 'aria-label': 'Paso', maxlength: '1000' }),
        el('button', { type: 'button', clase: 'nr-quitar', title: 'Quitar paso', 'aria-label': 'Quitar paso', texto: '×' })
      ]);
      f.lastChild.addEventListener('click', function () { if (pasos.children.length > 1) { f.remove(); actualizar(); } else { f.querySelector('textarea').value = ''; } });
      pasos.appendChild(f);
    }
    function agregarPaso() { filaPaso(); actualizar(); pasos.lastChild.querySelector('textarea').focus(); }

    // Descripción (opcional, plegada)
    var descripcion = el('textarea', { rows: '3', maxlength: '2000', placeholder: 'Cuenta en una o dos frases de qué trata', 'aria-label': 'Descripción' });
    var opcional = el('details', { clase: 'nr-opc' }, [el('summary', { texto: '+ Agregar una descripción (opcional)' }), descripcion]);

    function leerIngredientes() {
      var l = [];
      Array.prototype.forEach.call(ingredientes.children, function (f) {
        var i = f.querySelectorAll('input'), n = i[0].value.trim();
        if (n) l.push({ nombre: n, cantidad: i[1].value === '' ? null : Number(i[1].value), unidad: f.querySelector('select').value || null });
      });
      return l;
    }
    function leerPasos() {
      var l = [];
      Array.prototype.forEach.call(pasos.children, function (f) {
        var t = f.querySelector('textarea').value.trim();
        if (t) l.push({ orden: l.length + 1, instruccion: t });
      });
      return l;
    }

    var estadoTxt = el('p', { clase: 'nr-estado', 'aria-live': 'polite' });
    function actualizar() {
      Array.prototype.forEach.call(pasos.children, function (f, i) { f.firstChild.textContent = String(i + 1); });
      var falta = [];
      if (!nombre.value.trim()) falta.push('el nombre');
      if (!leerIngredientes().length) falta.push('un ingrediente');
      if (!leerPasos().length) falta.push('un paso');
      estadoTxt.className = 'nr-estado' + (falta.length ? '' : ' ok');
      estadoTxt.textContent = falta.length ? 'Falta: ' + falta.join(', ') : '✓ Todo listo para guardar';
    }
    filaIngrediente(); filaIngrediente(); filaPaso();

    var error = el('p', { clase: 'nr-error', hidden: true, role: 'alert' });
    var quien = (estado.sesion && estado.sesion.nombre) || 'Administrador';
    var guardar = el('button', { type: 'submit', clase: 'nr-guardar', texto: 'Guardar receta' });
    var cancelar = el('button', { type: 'button', clase: 'nr-cancelar', texto: 'Cancelar' });
    var masIng = el('button', { type: 'button', clase: 'nr-mas', texto: '+ Agregar otro ingrediente' });
    var masPaso = el('button', { type: 'button', clase: 'nr-mas', texto: '+ Agregar otro paso' });
    masIng.addEventListener('click', agregarIng);
    masPaso.addEventListener('click', agregarPaso);

    var form = el('form', { clase: 'nr-modal', novalidate: true, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'nr-titulo' }, [
      el('div', { clase: 'nr-cab' }, [
        el('div', null, [el('h2', { id: 'nr-titulo', texto: 'Nueva receta' }), el('p', { texto: 'Publicas como ' + quien + '. Lo marcado con * es obligatorio.' })]),
        el('button', { type: 'button', clase: 'nr-x', 'aria-label': 'Cerrar', texto: '×' })
      ]),
      el('div', { clase: 'nr-cuerpo' }, [
        bloque(1, 'Nombre *', null, [nombre]),
        bloque(2, 'Foto', 'Se ve en la tarjeta de la receta.', [zona, el('div', { clase: 'nr-acc' }, [bElegir, bQuitar]), archivo]),
        bloque(3, 'Tiempo de preparación', null, [chips, minutos]),
        bloque(4, 'Ingredientes *', 'Escribe uno por fila.', [
          el('div', { clase: 'nr-cols', 'aria-hidden': 'true' }, [el('span', { texto: 'Ingrediente' }), el('span', { texto: 'Cantidad' }), el('span', { texto: 'Unidad' }), el('span')]),
          ingredientes, masIng]),
        bloque(5, 'Pasos *', 'Cuenta cómo prepararla, paso a paso.', [pasos, masPaso]),
        opcional,
        error
      ]),
      el('div', { clase: 'nr-pie' }, [estadoTxt, el('div', { clase: 'nr-bts' }, [cancelar, guardar])])
    ]);
    var fondo = el('div', { clase: 'nr-fondo', id: 'nr-fondo' }, [form]);
    function cerrar() { if (enviando) return; document.removeEventListener('keydown', tecla); if (urlVista) URL.revokeObjectURL(urlVista); fondo.remove(); document.body.classList.remove('nr-abierto'); }
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    fondo.addEventListener('mousedown', function (e) { if (e.target === fondo) cerrar(); });
    form.querySelector('.nr-x').addEventListener('click', cerrar);
    cancelar.addEventListener('click', cerrar);
    form.addEventListener('input', function () { if (!enviando) error.hidden = true; actualizar(); });
    document.addEventListener('keydown', tecla);
    document.body.classList.add('nr-abierto');
    document.body.appendChild(fondo);
    actualizar();
    nombre.focus();

    function fallo(t, campo) { error.textContent = t; error.hidden = false; if (campo) campo.focus(); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (enviando) return;
      error.hidden = true;
      var nom = nombre.value.trim();
      if (!nom) { fallo('Escribe el nombre de la receta.', nombre); return; }
      var ings = leerIngredientes(), pas = leerPasos();
      if (!ings.length) { fallo('Agrega al menos un ingrediente.', ingredientes.querySelector('input')); return; }
      if (!pas.length) { fallo('Agrega al menos un paso.', pasos.querySelector('textarea')); return; }
      var min = minutos.hidden ? valorMin : (minutos.value ? Number(minutos.value) : null);
      var cuerpo = { nombre: nom, descripcion: descripcion.value.trim() || null, minutosPreparacion: min, ingredientes: ings, pasos: pas };
      enviando = true; guardar.disabled = true; cancelar.disabled = true; guardar.textContent = 'Guardando…';
      var recetaId = null;
      json('/recetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
        .then(function (r) {
          recetaId = r.id;
          if (!foto) return null;
          guardar.textContent = 'Subiendo foto…';
          return json('/imagenes/firma').then(function (f) {
            var datos = new FormData();
            datos.append('file', foto); datos.append('api_key', f.apiKey); datos.append('timestamp', String(f.timestamp));
            datos.append('signature', f.firma); datos.append('folder', f.carpeta);
            return fetch('https://api.cloudinary.com/v1_1/' + f.cloudName + '/image/upload', { method: 'POST', body: datos })
              .then(function (x) { return x.json().then(function (c) { if (!x.ok) throw new Error((c && c.error && c.error.message) || 'No se pudo subir la foto'); return c; }); })
              .then(function (c) {
                return json('/imagenes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recetaId: recetaId, url: c.secure_url, identificadorPublico: c.public_id }) });
              });
          });
        })
        .then(function () { enviando = false; cerrar(); aviso('Receta creada.'); return cargarLista('recetas'); })
        .catch(function (ex) {
          enviando = false; guardar.disabled = false; cancelar.disabled = false; guardar.textContent = 'Guardar receta';
          if (ex.message === 'sesion') return;
          if (recetaId) {
            fallo('La receta se creó, pero la foto falló: ' + ex.message + '. Puedes agregarle la foto desde la app.');
            cargarLista('recetas').catch(function () {});
            guardar.textContent = 'Cerrar'; guardar.type = 'button'; guardar.onclick = function () { cerrar(); };
          } else fallo(ex.message);
        });
    });
  }

  // ------------------------------------------------------------------ historial de acciones (tarjeta con buscador, filtros y paginas)

  function pintarHistorial(cont, filas) {
    var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    var COLORES = ['#FF4D82', '#FFD666', '#BFE4A5', '#F6DADD', '#CDE6F5'];
    var POR_PAGINA = 10;
    var ahora = new Date(), hoy0 = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    function parteFecha(s) {
      var m = /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s || '');
      if (!m) return { texto: s || '—', sub: '', dias: 9999 };
      var d = new Date(+m[1], +m[2] - 1, +m[3]);
      var dias = Math.round((hoy0 - d) / 86400000);
      var rel = dias <= 0 ? 'Hoy' : dias === 1 ? 'Ayer' : 'Hace ' + dias + ' días';
      return { texto: (+m[3]) + ' ' + MESES[+m[2] - 1] + ' ' + m[1], sub: rel + ' · ' + m[4] + ':' + m[5], dias: dias };
    }
    function bonita(a) {
      var s = String(a || '').replace(/_/g, ' ').toLowerCase().trim();
      return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Acción';
    }
    function claseAccion(a) {
      a = String(a || '').toLowerCase();
      if (/elimin|borr/.test(a)) return 'r';
      if (/revis|descart|respald|descarg|restaur/.test(a)) return 'g';
      if (/rol|desactiv|activ|cambi|bloque/.test(a)) return 'y';
      return 'p';
    }

    var datos = filas.map(function (f) {
      var fe = parteFecha(f.fecha);
      return { f: f, fe: fe, accion: bonita(f.accion), clase: claseAccion(f.accion), adm: String(f.admin || 'Administrador'),
               buscar: (String(f.admin || '') + ' ' + bonita(f.accion) + ' ' + String(f.detalle || '')).toLowerCase() };
    });
    var acciones = [];
    datos.forEach(function (d) { if (acciones.indexOf(d.accion) < 0) acciones.push(d.accion); });
    var estado = { q: '', accion: '', rango: '', pagina: 1 };

    var buscador = el('input', { type: 'search', placeholder: 'Buscar acción o administrador', 'aria-label': 'Buscar en el historial' });
    var selAccion = el('select', { 'aria-label': 'Filtrar por acción' }, [el('option', { value: '', texto: 'Todas las acciones' })].concat(acciones.map(function (a) { return el('option', { value: a, texto: a }); })));
    var selFecha = el('select', { 'aria-label': 'Filtrar por fecha' }, [
      el('option', { value: '', texto: 'Todas las fechas' }), el('option', { value: '0', texto: 'Hoy' }),
      el('option', { value: '7', texto: 'Últimos 7 días' }), el('option', { value: '30', texto: 'Últimos 30 días' })]);
    var cuenta = el('div', { clase: 'ht-cuenta' });
    var cuerpo = el('tbody');
    var pie = el('span');
    var pager = el('div', { clase: 'ht-pg' });

    function th(txt) { return el('th', { texto: txt }); }
    var tabla = el('table', { clase: 'ht' }, [el('thead', null, [el('tr', null, [th('Administrador'), th('Acción'), th('Detalle'), th('Fecha')])]), cuerpo]);

    cont.appendChild(el('div', { clase: 'ht-card' }, [
      el('div', { clase: 'ht-bar' }, [el('div', { clase: 'ht-izq' }, [el('div', { clase: 'ht-c ht-cb' }, [buscador]), el('div', { clase: 'ht-c ht-cs' }, [selAccion]), el('div', { clase: 'ht-c ht-cs' }, [selFecha])]), cuenta]),
      el('div', { clase: 'ht-scroll' }, [tabla]),
      el('div', { clase: 'ht-pie' }, [pie, pager])
    ]));

    function refrescar() {
      var q = estado.q;
      var lista = datos.filter(function (d) {
        if (q && d.buscar.indexOf(q) < 0) return false;
        if (estado.accion && d.accion !== estado.accion) return false;
        if (estado.rango !== '' && d.fe.dias > Number(estado.rango)) return false;
        return true;
      });
      var paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
      if (estado.pagina > paginas) estado.pagina = paginas;
      var ini = (estado.pagina - 1) * POR_PAGINA, vis = lista.slice(ini, ini + POR_PAGINA);

      vaciar(cuerpo);
      if (!vis.length) cuerpo.appendChild(el('tr', null, [el('td', { colspan: '4', clase: 'ht-nada', texto: 'No hay acciones con ese filtro.' })]));
      vis.forEach(function (d) {
        var suma = 0; for (var i = 0; i < d.adm.length; i++) suma += d.adm.charCodeAt(i);
        var col = COLORES[suma % COLORES.length];
        cuerpo.appendChild(el('tr', null, [
          el('td', null, [el('div', { clase: 'ht-adm' }, [el('span', { clase: 'ht-av', style: 'background:' + col + ';color:' + (col === '#FF4D82' ? '#fff' : '#2B1020'), texto: d.adm.charAt(0).toUpperCase() }),
            el('div', null, [el('b', { texto: d.adm }), el('small', { texto: 'Administrador' })])])]),
          el('td', null, [el('span', { clase: 'ht-ac ' + d.clase }, [el('i'), d.accion])]),
          el('td', { clase: 'ht-det', texto: d.f.detalle || '' }),
          el('td', { clase: 'ht-fe' }, [el('b', { texto: d.fe.texto }), el('small', { texto: d.fe.sub })])
        ]));
      });

      cuenta.textContent = lista.length ? 'Mostrando ' + (ini + 1) + '–' + (ini + vis.length) + ' de ' + lista.length + ' acciones' : '0 acciones';
      pie.textContent = 'Se muestran todas las acciones registradas.';
      vaciar(pager);
      if (paginas > 1) {
        var mk = function (txt, p, on, off) {
          return el('button', { type: 'button', clase: on ? 'on' : null, 'data-pg': p, disabled: off, 'aria-label': 'Página ' + p, texto: txt });
        };
        pager.appendChild(mk('‹', estado.pagina - 1, false, estado.pagina === 1));
        for (var p = 1; p <= paginas; p++) pager.appendChild(mk(String(p), p, p === estado.pagina, false));
        pager.appendChild(mk('›', estado.pagina + 1, false, estado.pagina === paginas));
      }
    }

    buscador.addEventListener('input', function () { estado.q = buscador.value.trim().toLowerCase(); estado.pagina = 1; refrescar(); });
    selAccion.addEventListener('change', function () { estado.accion = selAccion.value; estado.pagina = 1; refrescar(); });
    selFecha.addEventListener('change', function () { estado.rango = selFecha.value; estado.pagina = 1; refrescar(); });
    pager.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pg]');
      if (!b || b.disabled) return;
      estado.pagina = Number(b.getAttribute('data-pg')); refrescar();
    });
    refrescar();
  }


  // ------------------------------------------------------------------ reseñas (resumen, tarjeta con estrellas y paginas)

  function pintarResenas(cont, filas) {
    var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    var COLA = ['#FFE9B8', '#FFB7CB', '#D7EEC6', '#FFD666', '#CDE6F5'];
    var COLU = ['#FF4D82', '#FFD666', '#BFE4A5', '#F6DADD', '#CDE6F5'];
    var POR_PAGINA = 10;
    var hoy0 = new Date(); hoy0 = new Date(hoy0.getFullYear(), hoy0.getMonth(), hoy0.getDate());
    function suma(s) { var n = 0; for (var i = 0; i < s.length; i++) n += s.charCodeAt(i); return n; }
    function parteFecha(s) {
      var m = /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s || '');
      if (!m) return { texto: s || '—', sub: '' };
      var dias = Math.round((hoy0 - new Date(+m[1], +m[2] - 1, +m[3])) / 86400000);
      var rel = dias <= 0 ? 'Hoy' : dias === 1 ? 'Ayer' : 'Hace ' + dias + ' días';
      return { texto: (+m[3]) + ' ' + MESES[+m[2] - 1] + ' ' + m[1], sub: rel + ' · ' + m[4] + ':' + m[5] };
    }
    function estrellas(n) {
      var caja = el('span', { clase: 'rs-est' });
      for (var i = 1; i <= 5; i++) {
        var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('viewBox', '0 0 24 24');
        var pth = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pth.setAttribute('d', 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z');
        pth.setAttribute('fill', i <= n ? '#FFB400' : '#EBDDE0');
        s.appendChild(pth); caja.appendChild(s);
      }
      caja.appendChild(el('em', { texto: String(n) }));
      return caja;
    }

    var datos = filas.map(function (f) {
      return { f: f, n: Math.max(0, Math.min(5, Math.round(Number(f.estrellas) || 0))), fe: parteFecha(f.fecha),
               rec: String(f.recetaNombre || 'Receta'), aut: String(f.autor || 'Usuario'), op: String(f.contenido || '').trim() };
    });
    var total = datos.length, conOp = datos.filter(function (d) { return d.op; }).length;
    var prom = datos.reduce(function (a, d) { return a + d.n; }, 0) / total;

    function tile(color, valor, sub, etiqueta) {
      var t = el('div', { clase: 'rs-tile', style: 'background:' + color }, [el('div', null, [el('b', { texto: valor }), el('small', { texto: sub })]), el('span', { texto: etiqueta })]);
      return t;
    }
    cont.appendChild(el('div', { clase: 'rs-tiles' }, [
      tile('#FFD666', (Math.round(prom * 100) / 100).toString().replace('.', ','), 'de 5 estrellas', 'Puntuación promedio'),
      tile('#BFE4A5', String(total), 'en esta lista', 'Reseñas'),
      tile('#F6DADD', String(conOp), 'de ' + total, 'Con opinión escrita')
    ]));

    var selEst = el('select', { 'aria-label': 'Filtrar por estrellas' }, [el('option', { value: '', texto: 'Todas las estrellas' })].concat([5, 4, 3, 2, 1].map(function (n) { return el('option', { value: String(n), texto: n + (n === 1 ? ' estrella' : ' estrellas') }); })));
    var cuenta = el('div', { clase: 'rs-cuenta' }), cuerpo = el('tbody'), pie = el('span'), pager = el('div', { clase: 'rs-pg' });
    function th(x) { return el('th', { texto: x }); }
    cont.appendChild(el('div', { clase: 'rs-card' }, [
      el('div', { clase: 'rs-bar' }, [el('div', { clase: 'rs-c' }, [selEst]), cuenta]),
      el('div', { clase: 'rs-scroll' }, [el('table', { clase: 'rs' }, [
        el('colgroup', null, [el('col', { style: 'width:24%' }), el('col', { style: 'width:17%' }), el('col', { style: 'width:16%' }), el('col'), el('col', { style: 'width:170px' }), el('col', { style: 'width:130px' })]),
        el('thead', null, [el('tr', null, [th('Receta'), th('Autor'), th('Estrellas'), th('Opinión'), th('Fecha'), th('')])]), cuerpo])]),
      el('div', { clase: 'rs-pie' }, [pie, pager])
    ]));

    var estado = { est: '', pagina: 1 };
    function refrescar() {
      var lista = datos.filter(function (d) { return !estado.est || d.n === Number(estado.est); });
      var paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
      if (estado.pagina > paginas) estado.pagina = paginas;
      var ini = (estado.pagina - 1) * POR_PAGINA, vis = lista.slice(ini, ini + POR_PAGINA);
      vaciar(cuerpo);
      if (!vis.length) cuerpo.appendChild(el('tr', null, [el('td', { colspan: '6', clase: 'rs-nada', texto: 'No hay reseñas con ese filtro.' })]));
      vis.forEach(function (d) {
        var cu = COLU[suma(d.aut) % COLU.length];
        cuerpo.appendChild(el('tr', null, [
          el('td', null, [el('div', { clase: 'rs-rec' }, [el('b', { texto: d.rec })])]),
          el('td', null, [el('div', { clase: 'rs-aut' }, [el('span', { clase: 'rs-av', style: 'background:' + cu + ';color:' + (cu === '#FF4D82' ? '#fff' : '#2B1020'), texto: d.aut.charAt(0).toUpperCase() }), el('b', { texto: d.aut })])]),
          el('td', null, [estrellas(d.n)]),
          el('td', { clase: 'rs-op' + (d.op ? '' : ' no'), texto: d.op || 'Sin opinión escrita' }),
          el('td', { clase: 'rs-fe' }, [el('b', { texto: d.fe.texto }), el('small', { texto: d.fe.sub })]),
          el('td', { clase: 'rs-ac' }, [el('button', { type: 'button', clase: 'rs-del', 'data-id': d.f.id, texto: 'Eliminar' })])
        ]));
      });
      cuenta.textContent = lista.length ? 'Mostrando ' + (ini + 1) + '–' + (ini + vis.length) + ' de ' + lista.length + ' reseñas' : '0 reseñas';
      pie.textContent = 'Ordenadas de la más reciente a la más antigua.';
      vaciar(pager);
      if (paginas > 1) {
        var mk = function (txt, p, on, off) { return el('button', { type: 'button', clase: on ? 'on' : null, 'data-pg': p, disabled: off, 'aria-label': 'Página ' + p, texto: txt }); };
        pager.appendChild(mk('‹', estado.pagina - 1, false, estado.pagina === 1));
        for (var p = 1; p <= paginas; p++) pager.appendChild(mk(String(p), p, p === estado.pagina, false));
        pager.appendChild(mk('›', estado.pagina + 1, false, estado.pagina === paginas));
      }
    }
    selEst.addEventListener('change', function () { estado.est = selEst.value; estado.pagina = 1; refrescar(); });
    pager.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pg]');
      if (!b || b.disabled) return;
      estado.pagina = Number(b.getAttribute('data-pg')); refrescar();
    });
    refrescar();
  }

  function iniciarListas() {
    var nueva = $('btn-nueva-receta');
    if (nueva) nueva.addEventListener('click', abrirNuevaReceta);
    ['comentarios', 'resenas', 'recetas'].forEach(function (nombre) {
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
      var pt = e.target.closest('.us-dots');
      if (pt) {
        var m = pt.parentNode.querySelector('.us-rm'), abrir = m.hidden;
        cerrarMenusUsuarios();
        m.hidden = !abrir;
        return;
      }
      var b = e.target.closest('button[data-accion]');
      if (b && !b.disabled) { cerrarMenusUsuarios(); accionUsuario(b); }
    });
    function cerrarMenusUsuarios() {
      document.querySelectorAll('#tabla-usuarios .us-rm').forEach(function (m) { m.hidden = true; });
      var mm = $('us-menu'); if (mm) mm.hidden = true;
      var bd = $('btn-descargar'); if (bd) bd.setAttribute('aria-expanded', 'false');
    }
    $('btn-descargar').addEventListener('click', function (e) {
      e.stopPropagation();
      var mm = $('us-menu'), abrir = mm.hidden;
      cerrarMenusUsuarios();
      mm.hidden = !abrir;
      this.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.us-ac, .us-dwn')) cerrarMenusUsuarios(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenusUsuarios(); });
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