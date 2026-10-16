/* Cookly · Panel administrativo · Resumen estilo mockup
   Lo llama admin.js al terminar de cargar los datos: window.CooklyResumen.pintar(resumen, graficas, dias).
   Todo texto se inserta con textContent. Si algo falla, el Resumen anterior sigue funcionando. */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var LETRAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // getDay(): 0 = domingo
  var num = new Intl.NumberFormat('es-PE');

  var ultimo = null;      // { r, g }
  var semana = 0;         // 0 = la más reciente, 1 = la anterior...
  var vistaMes = null;    // primer día del mes del calendario

  function h(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined && texto !== null) n.textContent = texto;
    return n;
  }
  function s(tag, attrs, texto) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (texto !== undefined) n.textContent = texto;
    return n;
  }
  function vaciar(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function fecha(iso) { var p = String(iso).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function minutosATexto(min) {
    var m = Math.round(min || 0);
    if (m < 60) return m + ' min';
    var hh = Math.floor(m / 60), rr = m % 60;
    return hh + ' h ' + (rr < 10 ? '0' : '') + rr + ' min';
  }
  function bytesATexto(b) {
    if (b < 1024 * 1024) return num.format(Math.round(b / 1024)) + ' KB';
    return num.format(Math.round(b / (1024 * 1024) * 10) / 10) + ' MB';
  }
  function fmt1(n) { return num.format(Math.round(n * 10) / 10); }

  // ---- ventana de 7 días
  function ventana(serie, campo) {
    var datos = (serie || []).map(function (d) { return { f: fecha(d.dia), v: Number(d[campo]) || 0 }; });
    datos.sort(function (a, b) { return a.f - b.f; });
    var fin = datos.length - semana * 7;
    var ini = Math.max(0, fin - 7);
    return { todo: datos, ventana: datos.slice(ini, Math.max(fin, 0)), hayAnterior: ini > 0, haySiguiente: semana > 0 };
  }
  function etiquetaSemana(v) {
    if (!v.length) return 'Sin datos';
    var a = v[0].f, b = v[v.length - 1].f;
    if (a.getMonth() === b.getMonth()) return a.getDate() + '–' + b.getDate() + ' ' + MESES_CORTO[b.getMonth()];
    return a.getDate() + ' ' + MESES_CORTO[a.getMonth()] + '–' + b.getDate() + ' ' + MESES_CORTO[b.getMonth()];
  }
  function selectorSemana(v, hayAnt, haySig) {
    var cont = h('span', 'rm-chip rm-sem');
    var ant = h('button', 'rm-flecha', '‹'); ant.type = 'button'; ant.disabled = !hayAnt; ant.setAttribute('aria-label', 'Semana anterior');
    var sig = h('button', 'rm-flecha', '›'); sig.type = 'button'; sig.disabled = !haySig; sig.setAttribute('aria-label', 'Semana siguiente');
    ant.addEventListener('click', function () { semana++; render(); });
    sig.addEventListener('click', function () { if (semana > 0) semana--; render(); });
    cont.appendChild(ant); cont.appendChild(h('span', null, 'Semana ' + etiquetaSemana(v))); cont.appendChild(sig);
    return cont;
  }
  function stat(valor, etiqueta) { var d = h('div'); d.appendChild(h('b', null, valor)); d.appendChild(document.createTextNode(etiqueta)); return d; }
  function tarjeta(clase, titulo, derecha) {
    var t = h('section', 'rm-b ' + clase);
    var hd = h('div', 'rm-hd'); hd.appendChild(h('h2', 'rm-t', titulo)); if (derecha) hd.appendChild(derecha);
    t.appendChild(hd);
    return t;
  }

  // ---- tarjeta: usuarios nuevos por día (barras)
  function tarjetaUsuarios(r, g) {
    var w = ventana(g.usuariosPorDia, 'valor');
    var t = tarjeta('rm-y rm-s5', 'Usuarios nuevos por día', selectorSemana(w.ventana, w.hayAnterior, w.haySiguiente));
    var st = h('div', 'rm-stats');
    st.appendChild(stat(num.format(r.usuariosTotal), 'usuarios'));
    st.appendChild(stat('+' + num.format(r.usuariosNuevos7d), 'esta semana'));
    st.appendChild(stat(num.format(r.activosHoy), 'activos hoy'));
    t.appendChild(st);
    var svg = s('svg', { viewBox: '0 0 330 150', width: '100%', role: 'img', 'aria-label': 'Usuarios nuevos por día, semana ' + etiquetaSemana(w.ventana) });
    svg.appendChild(s('line', { x1: 8, y1: 104, x2: 322, y2: 104, stroke: '#2B1020', opacity: '.25' }));
    var maxv = Math.max(1, Math.max.apply(null, w.ventana.map(function (d) { return d.v; }).concat([1])));
    w.ventana.forEach(function (d, i) {
      var x = 15 + i * 45.3, alto = d.v > 0 ? Math.max(8, d.v / maxv * 80) : 4;
      var barra = s('rect', { x: x, y: 104 - alto, width: 26, height: alto, rx: d.v > 0 ? 8 : 2, fill: '#2B1020' });
      if (d.v === 0) barra.setAttribute('opacity', '.3');
      svg.appendChild(barra);
      var tv = s('text', { x: x + 13, y: 104 - alto - 6, 'text-anchor': 'middle', style: 'font-weight:700;font-size:13px' }, String(d.v));
      svg.appendChild(tv);
      svg.appendChild(s('text', { x: x + 13, y: 122, 'text-anchor': 'middle', style: 'font-size:11.5px' }, LETRAS[d.f.getDay()] + ' ' + d.f.getDate()));
    });
    svg.appendChild(s('text', { x: 8, y: 144, style: 'font-size:11.5px' }, 'Cada barra = personas registradas ese día'));
    t.appendChild(svg);
    return t;
  }

  // ---- tarjeta: tiempo de uso por día (línea)
  function tarjetaUso(r, g) {
    var w = ventana(g.usoPorDia, 'minutos');
    var t = tarjeta('rm-p rm-s7', 'Tiempo de uso por día', selectorSemana(w.ventana, w.hayAnterior, w.haySiguiente));
    var st = h('div', 'rm-stats');
    st.appendChild(stat(fmt1(r.minutosPorSesion) + ' min', 'por sesión'));
    st.appendChild(stat(minutosATexto(r.minutosUso7d), 'últimos 7 días'));
    st.appendChild(stat(num.format(r.sesionesTotal), 'sesiones'));
    t.appendChild(st);

    var vals = w.ventana.map(function (d) { return d.v; });
    var pico = Math.max.apply(null, vals.concat([0]));
    var top = pico <= 0 ? 60 : Math.ceil(pico / 60) * 60;
    var svg = s('svg', { viewBox: '0 0 380 160', width: '100%', role: 'img', 'aria-label': 'Minutos de uso por día, semana ' + etiquetaSemana(w.ventana) });
    var rej = s('g', { stroke: '#2B1020', opacity: '.14' });
    [120, 75, 30].forEach(function (y) { rej.appendChild(s('line', { x1: 40, y1: y, x2: 374, y2: y })); });
    svg.appendChild(rej);
    svg.appendChild(s('text', { x: 8, y: 124 }, '0'));
    svg.appendChild(s('text', { x: 8, y: 79 }, String(Math.round(top / 2))));
    svg.appendChild(s('text', { x: 8, y: 34 }, String(top)));
    var pts = vals.map(function (v, i) { return { x: 60 + i * 48, y: 120 - v / top * 90, v: v }; });
    if (pts.length > 1) {
      var d = 'M' + pts[0].x + ' ' + pts[0].y.toFixed(2);
      for (var i = 1; i < pts.length; i++) {
        d += ' C' + (pts[i - 1].x + 24) + ' ' + pts[i - 1].y.toFixed(2) + ' ' + (pts[i].x - 24) + ' ' + pts[i].y.toFixed(2) + ' ' + pts[i].x + ' ' + pts[i].y.toFixed(2);
      }
      svg.appendChild(s('path', { d: d + ' L' + pts[pts.length - 1].x + ' 120 L' + pts[0].x + ' 120 Z', fill: '#fff', opacity: '.6' }));
      svg.appendChild(s('path', { d: d, fill: 'none', stroke: '#FF4D82', 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
    }
    var iPico = pico > 0 ? vals.indexOf(pico) : -1;
    if (iPico >= 0) svg.appendChild(s('line', { x1: pts[iPico].x, y1: pts[iPico].y, x2: pts[iPico].x, y2: 120, stroke: '#2B1020', 'stroke-width': 1.5, 'stroke-dasharray': '3 4' }));
    var puntos = s('g', { fill: '#fff', stroke: '#FF4D82', 'stroke-width': 3 });
    pts.forEach(function (p, i) { puntos.appendChild(s('circle', { cx: p.x, cy: p.y.toFixed(2), r: i === iPico ? 6 : 4 })); });
    svg.appendChild(puntos);
    var etiquetas = s('g', { style: 'font-weight:700;font-size:11.5px', 'text-anchor': 'middle' });
    pts.forEach(function (p, i) { if (p.v > 0) etiquetas.appendChild(s('text', { x: p.x, y: (p.y - 9).toFixed(2) }, i === iPico ? num.format(p.v) + ' min' : num.format(p.v))); });
    svg.appendChild(etiquetas);
    var dias = s('g', { 'text-anchor': 'middle', style: 'font-size:11.5px' });
    w.ventana.forEach(function (dd, i) { dias.appendChild(s('text', { x: 60 + i * 48, y: 144 }, LETRAS[dd.f.getDay()] + ' ' + dd.f.getDate())); });
    svg.appendChild(dias);
    t.appendChild(svg);
    return t;
  }

  // ---- tarjeta: cuentas por estado
  function tarjetaCuentas(r) {
    var total = (r.usuariosActivos || 0) + (r.usuariosInactivos || 0);
    var chip = h('span', 'rm-chip', 'Total ' + num.format(total));
    var t = tarjeta('rm-g rm-s5', 'Cuentas por estado', chip);
    var fila = h('div', 'rm-fila');
    var svg = s('svg', { viewBox: '0 0 120 120', width: 120, height: 120, role: 'img', 'aria-label': num.format(r.usuariosActivos) + ' cuentas activas y ' + num.format(r.usuariosInactivos) + ' inactivas' });
    var C = 2 * Math.PI * 42;
    svg.appendChild(s('circle', { cx: 60, cy: 60, r: 42, fill: 'none', stroke: '#fff', 'stroke-opacity': '.55', 'stroke-width': 20 }));
    if (total > 0 && r.usuariosActivos > 0) {
      var frac = r.usuariosActivos / total;
      svg.appendChild(s('circle', { cx: 60, cy: 60, r: 42, fill: 'none', stroke: '#2B1020', 'stroke-width': 20, 'stroke-dasharray': (C * frac).toFixed(1) + ' ' + C.toFixed(1), transform: 'rotate(-90 60 60)' }));
    }
    svg.appendChild(s('text', { x: 60, y: 66, 'text-anchor': 'middle', style: "font-family:'Fredoka',sans-serif;font-size:24px;font-weight:600" }, num.format(total)));
    fila.appendChild(svg);
    var st = h('div', 'rm-stats rm-col');
    st.appendChild(stat(num.format(r.usuariosActivos), 'activas'));
    st.appendChild(stat(num.format(r.usuariosInactivos), 'inactivas'));
    fila.appendChild(st);
    t.appendChild(fila);
    return t;
  }

  // ---- tarjeta: recetas
  function tarjetaRecetas(r) {
    var chip = h('span', 'rm-chip rm-chip-b', '+' + num.format(r.recetasNuevas30d) + ' en 30 días');
    var t = tarjeta('rm-h rm-s7', 'Recetas', chip);
    var st = h('div', 'rm-stats');
    st.appendChild(stat(num.format(r.recetasTotal), 'publicadas'));
    st.appendChild(stat(num.format(r.resenasTotal), 'reseñas' + (r.resenasTotal ? ' · prom. ' + num.format(r.puntuacionPromedio) : '')));
    t.appendChild(st);
    var mini = h('div', 'rm-mini');
    [[num.format(r.comentariosTotal), 'Comentarios'], [num.format(r.favoritosTotal), 'Favoritos'], [num.format(r.imagenesTotal), 'Imágenes'], [bytesATexto(r.baseDatosBytes), 'Base de datos']].forEach(function (p) {
      var d = h('div'); d.appendChild(h('b', null, p[0])); d.appendChild(document.createTextNode(p[1])); mini.appendChild(d);
    });
    t.appendChild(mini);
    return t;
  }

  // ---- tarjeta: recetas más vistas
  function tarjetaVistas(g) {
    var ver = h('a', 'rm-ver', 'Ver todas'); ver.href = '#recetas';
    var t = tarjeta('rm-w rm-s12', 'Recetas más vistas', ver);
    var lista = (g.topRecetasVistas || []).slice(0, 5);
    if (!lista.length) { t.appendChild(h('p', 'rm-vacio', 'Todavía no hay vistas registradas.')); return t; }
    var colores = ['#FFD666', '#BFE4A5', '#F6DADD'];
    lista.forEach(function (x, i) {
      var fila = h('div', 'rm-row' + (i === 0 ? ' rm-top' : ''));
      var nombre = String(x.nombre || '');
      var av = h('span', 'rm-av', (nombre.charAt(0) || '?').toUpperCase()); av.style.background = colores[i % colores.length];
      fila.appendChild(av);
      fila.appendChild(h('div', 'rm-n', nombre));
      fila.appendChild(h('span', 'rm-pv', num.format(x.valor) + (Number(x.valor) === 1 ? ' vista' : ' vistas')));
      t.appendChild(fila);
    });
    return t;
  }

  // ---- calendario
  function diasActivos(g) {
    var set = {};
    function marca(serie, campo) {
      (serie || []).forEach(function (d) { if ((Number(d[campo]) || 0) > 0) set[String(d.dia).slice(0, 10)] = true; });
    }
    marca(g.usuariosPorDia, 'valor'); marca(g.usoPorDia, 'minutos'); marca(g.recetasPorDia, 'valor');
    return set;
  }
  function calendario(g) {
    var hoy = new Date();
    if (!vistaMes) vistaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    var activos = diasActivos(g);
    var t = h('section', 'rm-b rm-w rm-cal');
    var hd = h('div', 'rm-hd'); hd.appendChild(h('h2', 'rm-t', MESES[vistaMes.getMonth()] + ' ' + vistaMes.getFullYear()));
    var fl = h('div', 'rm-flechas');
    var a = h('button', 'rm-ar', '‹'); a.type = 'button'; a.setAttribute('aria-label', 'Mes anterior');
    var b = h('button', 'rm-ar', '›'); b.type = 'button'; b.setAttribute('aria-label', 'Mes siguiente');
    a.addEventListener('click', function () { vistaMes = new Date(vistaMes.getFullYear(), vistaMes.getMonth() - 1, 1); render(); });
    b.addEventListener('click', function () { vistaMes = new Date(vistaMes.getFullYear(), vistaMes.getMonth() + 1, 1); render(); });
    fl.appendChild(a); fl.appendChild(b); hd.appendChild(fl); t.appendChild(hd);
    var cal = h('div', 'rm-calg');
    ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(function (l) { cal.appendChild(h('span', 'rm-wd', l)); });
    var primero = (new Date(vistaMes.getFullYear(), vistaMes.getMonth(), 1).getDay() + 6) % 7;
    var total = new Date(vistaMes.getFullYear(), vistaMes.getMonth() + 1, 0).getDate();
    for (var i = 0; i < primero; i++) cal.appendChild(h('span', 'rm-d'));
    for (var d = 1; d <= total; d++) {
      var iso = vistaMes.getFullYear() + '-' + ('0' + (vistaMes.getMonth() + 1)).slice(-2) + '-' + ('0' + d).slice(-2);
      var esHoy = d === hoy.getDate() && vistaMes.getMonth() === hoy.getMonth() && vistaMes.getFullYear() === hoy.getFullYear();
      cal.appendChild(h('span', 'rm-d' + (esHoy ? ' rm-hoy' : (activos[iso] ? ' rm-act' : '')), String(d)));
    }
    t.appendChild(cal);
    var leg = h('div', 'rm-leg');
    [['#FF4D82', 'Hoy'], ['#FFD666', 'Día con actividad']].forEach(function (p) {
      var sp = h('span'); var i2 = h('i'); i2.style.background = p[0]; sp.appendChild(i2); sp.appendChild(document.createTextNode(p[1])); leg.appendChild(sp);
    });
    t.appendChild(leg);
    return t;
  }

  function tarjetaReportes(r) {
    var t = h('section', 'rm-b rm-dark');
    t.appendChild(h('div', 'rm-lab', 'Reportes pendientes'));
    t.appendChild(h('div', 'rm-bigf', num.format(r.reportesPendientes)));
    t.appendChild(h('div', 'rm-sub', r.reportesPendientes > 0 ? 'Hay reportes por revisar.' : 'Todo al día. Nada por revisar.'));
    var cta = h('a', 'rm-cta', 'Ver reportes'); cta.href = '#reportes'; t.appendChild(cta);
    return t;
  }

  function saludo() {
    var hora = new Date().getHours();
    var nombre = ((document.getElementById('admin-nombre') || {}).textContent || '').trim().split(/\s+/)[0] || '';
    var base = hora < 12 ? 'Buenos días' : (hora < 19 ? 'Buenas tardes' : 'Buenas noches');
    return nombre ? base + ', ' + nombre : base;
  }

  function render() {
    var raiz = document.getElementById('resumen-mod');
    if (!raiz || !ultimo) return;
    var r = ultimo.r, g = ultimo.g;
    vaciar(raiz);
    var cols = h('div', 'rm-cols');
    var main = h('div', 'rm-main');
    var g1 = h('div', 'rm-g12'); g1.appendChild(tarjetaUsuarios(r, g)); g1.appendChild(tarjetaUso(r, g));
    var g2 = h('div', 'rm-g12'); g2.appendChild(tarjetaCuentas(r)); g2.appendChild(tarjetaRecetas(r));
    main.appendChild(g1); main.appendChild(g2); main.appendChild(tarjetaVistas(g));
    var lado = h('aside', 'rm-side'); lado.appendChild(calendario(g)); lado.appendChild(tarjetaReportes(r));
    cols.appendChild(main); cols.appendChild(lado);
    raiz.appendChild(cols);
  }

  window.CooklyResumen = {
    pintar: function (r, g) {
      try {
        ultimo = { r: r, g: g };
        semana = 0;
        var sec = document.querySelector('[data-seccion="resumen"]');
        render();
        if (sec) sec.classList.add('rm-on');
        var t = document.getElementById('titulo-seccion'), st = document.getElementById('subtitulo-seccion');
        if (t) t.textContent = saludo();
        if (st) st.textContent = 'Así va Cookly en este momento.';
      } catch (e) {
        var s2 = document.querySelector('[data-seccion="resumen"]');
        if (s2) s2.classList.remove('rm-on'); // si algo falla, vuelve el Resumen anterior
        if (window.console) console.error('Resumen moderno:', e);
      }
    }
  };
})();