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
    ant.setAttribute('data-rm', 'ant'); sig.setAttribute('data-rm', 'sig');
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
    a.setAttribute('data-rm', 'mes-ant'); b.setAttribute('data-rm', 'mes-sig');
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

  function tarjetaReportes(r, rep) {
    rep = rep || { recetas: r.reportesPendientes || 0, comunidad: 0 };
    var total = rep.recetas + rep.comunidad;
    var t = h('section', 'rm-b rm-dark');
    t.appendChild(h('div', 'rm-lab', 'Reportes pendientes'));
    t.appendChild(h('div', 'rm-bigf', num.format(total)));
    t.appendChild(h('div', 'rm-sub', total > 0 ? 'Hay reportes por revisar.' : 'Todo al día. Nada por revisar.'));
    [['Recetas', rep.recetas, '#reportes'], ['Comunidad', rep.comunidad, '#reportes-comunidad']].forEach(function (p) {
      var fila = h('a', 'rm-rep' + (p[1] > 0 ? ' rm-rep-on' : '')); fila.href = p[2];
      fila.appendChild(h('span', null, p[0])); fila.appendChild(h('b', null, num.format(p[1])));
      t.appendChild(fila);
    });
    var cta = h('a', 'rm-cta', 'Ver reportes'); cta.href = rep.recetas === 0 && rep.comunidad > 0 ? '#reportes-comunidad' : '#reportes'; t.appendChild(cta);
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
    var g1 = h('div', 'rm-g12'); g1.appendChild(tarjetaUsuarios(r, ultimo.g90)); g1.appendChild(tarjetaUso(r, ultimo.g90));
    var g2 = h('div', 'rm-g12'); g2.appendChild(tarjetaCuentas(r)); g2.appendChild(tarjetaRecetas(r));
    main.appendChild(g1); main.appendChild(g2); main.appendChild(tarjetaVistas(g));
    var lado = h('aside', 'rm-side'); lado.appendChild(calendario(ultimo.g90)); lado.appendChild(tarjetaReportes(r, ultimo.rep));
    cols.appendChild(main); cols.appendChild(lado);
    raiz.appendChild(cols);
  }

  // Un solo manejador de clic para todos los botones (no se pierde aunque se redibuje el Resumen).
  var ultimoToque = 0;
  function manejar(e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-rm]') : null;
    if (!b || b.disabled) return;
    // pointerdown y click llegan juntos: solo se atiende el primero
    var ahora = Date.now();
    if (e.type === 'click' && ahora - ultimoToque < 600) { e.preventDefault(); e.stopPropagation(); return; }
    if (e.type === 'pointerdown') ultimoToque = ahora;
    var k = b.getAttribute('data-rm');
    if (k === 'ant') semana++;
    else if (k === 'sig') { if (semana > 0) semana--; }
    else if (k === 'uso-ant') semanaUso++;
    else if (k === 'uso-sig') { if (semanaUso > 0) semanaUso--; }
    else if (k === 'mes-ant') vistaMes = new Date(vistaMes.getFullYear(), vistaMes.getMonth() - 1, 1);
    else if (k === 'mes-sig') vistaMes = new Date(vistaMes.getFullYear(), vistaMes.getMonth() + 1, 1);
    else return;
    e.preventDefault(); e.stopPropagation();
    if (k.indexOf('uso-') === 0) renderUso(); else render();
  }
  document.addEventListener('pointerdown', manejar, true);
  document.addEventListener('click', manejar, true);


  // =====================================================================  USO DE LA APP
  var semanaUso = 0;
  var ultimoUso = null;

  function ventanaUso(serie) {
    var datos = (serie || []).map(function (d) { return { f: fecha(d.dia), v: Number(d.minutos) || 0, a: Number(d.activos) || 0 }; });
    datos.sort(function (a, b) { return a.f - b.f; });
    var fin = datos.length - semanaUso * 7, ini = Math.max(0, fin - 7);
    return { ventana: datos.slice(ini, Math.max(fin, 0)), hayAnterior: ini > 0, haySiguiente: semanaUso > 0 };
  }
  function selectorUso(v, hayAnt, haySig) {
    var c = h('span', 'rm-chip rm-sem');
    var a = h('button', 'rm-flecha', '‹'); a.type = 'button'; a.disabled = !hayAnt; a.setAttribute('data-rm', 'uso-ant'); a.setAttribute('aria-label', 'Semana anterior');
    var b = h('button', 'rm-flecha', '›'); b.type = 'button'; b.disabled = !haySig; b.setAttribute('data-rm', 'uso-sig'); b.setAttribute('aria-label', 'Semana siguiente');
    c.appendChild(a); c.appendChild(h('span', null, 'Semana ' + etiquetaSemana(v))); c.appendChild(b);
    return c;
  }
  function kpiUso(clase, titulo, nota, chip, valor) {
    var k = h('section', 'rm-k ' + clase);
    k.appendChild(h('div', 'rm-kt', titulo)); k.appendChild(h('div', 'rm-kn', nota));
    var pie = h('div', 'rm-kf'); pie.appendChild(h('span', 'rm-kchip', chip)); pie.appendChild(h('span', 'rm-knum', valor));
    k.appendChild(pie); return k;
  }
  function graficoUsoDias(g) {
    var w = ventanaUso(g.usoPorDia);
    var t = h('section', 'rm-b rm-w rm-full');
    var hd = h('div', 'rm-hd'); var izq = h('div'); izq.appendChild(h('h2', 'rm-t', 'Tiempo de uso por día')); izq.appendChild(h('p', 'rm-subt', 'Un punto por cada día de la semana'));
    hd.appendChild(izq); hd.appendChild(selectorUso(w.ventana, w.hayAnterior, w.haySiguiente)); t.appendChild(hd);
    var ley = h('div', 'rm-ley');
    [['#FF4D82', 'Minutos de uso (izquierda)'], ['#E5A700', 'Personas activas (derecha)']].forEach(function (p) { var sp = h('span'); var i3 = h('i'); i3.style.background = p[0]; sp.appendChild(i3); sp.appendChild(document.createTextNode(p[1])); ley.appendChild(sp); });
    t.appendChild(ley);
    var vals = w.ventana.map(function (d) { return d.v; });
    var pico = Math.max.apply(null, vals.concat([0]));
    var top = pico <= 0 ? 60 : Math.ceil(pico / 60) * 60;
    var X0 = 60, ANCHO = 890, BASE = 210, ALTO = 170;
    var paso = ANCHO / 7;
    var xs = vals.map(function (_, i) { return X0 + paso * (i + 0.5); });
    var ys = vals.map(function (v) { return BASE - v / top * ALTO; });
    var svg = s('svg', { viewBox: '0 0 1000 275', width: '100%', role: 'img', 'aria-label': 'Minutos de uso por día, semana ' + etiquetaSemana(w.ventana) });
    var gr = s('g', { stroke: '#F3D9DC' });
    [BASE - ALTO, BASE - ALTO * 2 / 3, BASE - ALTO / 3].forEach(function (y) { gr.appendChild(s('line', { x1: 60, y1: y, x2: 950, y2: y })); });
    gr.appendChild(s('line', { x1: 60, y1: BASE, x2: 950, y2: BASE, stroke: '#E5C9CE' }));
    svg.appendChild(gr);
    [[BASE - ALTO, top], [BASE - ALTO * 2 / 3, Math.round(top * 2 / 3)], [BASE - ALTO / 3, Math.round(top / 3)], [BASE, 0]].forEach(function (p) { svg.appendChild(s('text', { x: 14, y: p[0] + 4, style: 'font-size:11.5px;fill:#9A8690' }, String(p[1]))); });
    if (xs.length > 1) {
      var defs = s('defs'); var lg = s('linearGradient', { id: 'rmfa', x1: 0, y1: 0, x2: 0, y2: 1 });
      lg.appendChild(s('stop', { offset: 0, 'stop-color': '#FF4D82', 'stop-opacity': '.5' })); lg.appendChild(s('stop', { offset: 1, 'stop-color': '#FFD666', 'stop-opacity': '.12' }));
      defs.appendChild(lg); svg.appendChild(defs);
      var curva = function (i) { // interpolación suave entre puntos
        var t2 = (i - xs[0]) / (xs[xs.length - 1] - xs[0]) * (xs.length - 1); var k = Math.min(xs.length - 2, Math.max(0, Math.floor(t2))); var u = t2 - k; u = u * u * (3 - 2 * u);
        return ys[k] + (ys[k + 1] - ys[k]) * u;
      };
      var rayas = s('g', { fill: 'url(#rmfa)' });
      for (var x = xs[0]; x <= xs[xs.length - 1]; x += 7) { var yy = curva(x); rayas.appendChild(s('rect', { x: x.toFixed(1), y: yy.toFixed(1), width: 3.5, height: Math.max(2, BASE - yy).toFixed(1), rx: 1.7 })); }
      svg.appendChild(rayas);
      var d = 'M' + xs[0].toFixed(1) + ' ' + ys[0].toFixed(1);
      for (var i = 1; i < xs.length; i++) { var cx = (xs[i] - xs[i - 1]) / 2; d += ' C' + (xs[i - 1] + cx).toFixed(1) + ' ' + ys[i - 1].toFixed(1) + ' ' + (xs[i] - cx).toFixed(1) + ' ' + ys[i].toFixed(1) + ' ' + xs[i].toFixed(1) + ' ' + ys[i].toFixed(1); }
      svg.appendChild(s('path', { d: d, fill: 'none', stroke: '#FF4D82', 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
    }
    var acts = w.ventana.map(function (d) { return d.a; });
    var maxA = Math.max.apply(null, acts.concat([1]));
    var topA = Math.max(4, Math.ceil(maxA / 4) * 4);
    var yA = acts.map(function (v) { return BASE - v / topA * ALTO; });
    [[BASE - ALTO, topA], [BASE - ALTO * 2 / 3, Math.round(topA * 2 / 3)], [BASE - ALTO / 3, Math.round(topA / 3)], [BASE, 0]].forEach(function (p) { svg.appendChild(s('text', { x: 958, y: p[0] + 4, style: 'font-size:11.5px;fill:#9A8690' }, String(p[1]))); });
    if (xs.length > 1) {
      var d2 = 'M' + xs[0].toFixed(1) + ' ' + yA[0].toFixed(1);
      for (var j = 1; j < xs.length; j++) { var cx2 = (xs[j] - xs[j - 1]) / 2; d2 += ' C' + (xs[j - 1] + cx2).toFixed(1) + ' ' + yA[j - 1].toFixed(1) + ' ' + (xs[j] - cx2).toFixed(1) + ' ' + yA[j].toFixed(1) + ' ' + xs[j].toFixed(1) + ' ' + yA[j].toFixed(1); }
      svg.appendChild(s('path', { d: d2, fill: 'none', stroke: '#E5A700', 'stroke-width': 3, 'stroke-linecap': 'round' }));
    }
    xs.forEach(function (x, i) { svg.appendChild(s('circle', { cx: x.toFixed(1), cy: yA[i].toFixed(1), r: 4.5, fill: '#fff', stroke: '#E5A700', 'stroke-width': 2.5 })); });
    var iPico = pico > 0 ? vals.indexOf(pico) : -1;
    xs.forEach(function (x, i) { svg.appendChild(s('circle', { cx: x.toFixed(1), cy: ys[i].toFixed(1), r: i === iPico ? 7 : 5, fill: i === iPico ? '#FF4D82' : '#fff', stroke: i === iPico ? '#fff' : '#FF4D82', 'stroke-width': 3 })); });
    xs.forEach(function (x, i) { if (vals[i] > 0 && i !== iPico) svg.appendChild(s('text', { x: x.toFixed(1), y: (ys[i] - 12).toFixed(1), 'text-anchor': 'middle', style: 'font-weight:700;font-size:12.5px' }, num.format(vals[i]))); });
    if (iPico >= 0) {
      var px = xs[iPico], py = ys[iPico];
      var bx = Math.min(Math.max(px - 80, 62), 880);
      svg.appendChild(s('rect', { x: bx, y: Math.max(2, py - 58), width: 160, height: 36, rx: 13, fill: '#2B1020' }));
      svg.appendChild(s('text', { x: bx + 16, y: Math.max(2, py - 58) + 23, style: 'fill:#FFD666;font-size:14px;font-weight:700' }, num.format(pico) + ' min'));
      svg.appendChild(s('text', { x: bx + 84, y: Math.max(2, py - 58) + 23, style: 'fill:#F3D9DC;font-size:12px' }, '· ' + acts[iPico] + (acts[iPico] === 1 ? ' persona' : ' personas')));
      svg.appendChild(s('path', { d: 'M' + (px - 8) + ' ' + (Math.max(2, py - 58) + 36) + ' L' + px + ' ' + (Math.max(2, py - 58) + 44) + ' L' + (px + 8) + ' ' + (Math.max(2, py - 58) + 36) + ' Z', fill: '#2B1020' }));
    }
    xs.forEach(function (x, i) {
      var f = vals[i] <= 0 ? '#F3D9DC' : (i === iPico ? '#FF4D82' : (vals[i] < pico / 3 ? '#BFE4A5' : '#FFD666'));
      svg.appendChild(s('rect', { x: (x - paso * 0.45).toFixed(1), y: 228, width: (paso * 0.9).toFixed(1), height: 8, rx: 4, fill: f }));
      svg.appendChild(s('text', { x: x.toFixed(1), y: 262, 'text-anchor': 'middle', style: 'font-size:13px' + (i === iPico ? ';font-weight:700' : '') }, ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][w.ventana[i].f.getDay()] + ' ' + w.ventana[i].f.getDate()));
    });
    t.appendChild(svg);
    return t;
  }
  function tarjetaHoras(g) {
    var t = h('section', 'rm-b rm-w');
    var hd = h('div', 'rm-hd'); var izq = h('div'); izq.appendChild(h('h2', 'rm-t', 'Horas de mayor uso')); izq.appendChild(h('p', 'rm-subt', 'Sesiones iniciadas por hora')); hd.appendChild(izq); t.appendChild(hd);
    var horas = (g.horasPico || []).map(function (x) { return { hora: Number(x.hora), v: Number(x.valor) || 0 }; });
    var total = horas.reduce(function (a, x) { return a + x.v; }, 0);
    var max = Math.max.apply(null, horas.map(function (x) { return x.v; }).concat([0]));
    if (total === 0) { t.appendChild(h('p', 'rm-vacio', 'Todavía no hay sesiones registradas.')); return t; }
    var top3 = horas.filter(function (x) { return x.v > 0; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 3);
    top3.forEach(function (x) {
      var fila = h('div', 'rm-pr'); fila.appendChild(h('span', 'rm-pi', String(x.hora)));
      var pm = h('div', 'rm-pm'); var pt = h('div', 'rm-pt'); pt.appendChild(h('b', null, x.hora + ':00 h')); pt.appendChild(h('span', null, num.format(x.v) + (x.v === 1 ? ' sesión' : ' sesiones'))); pm.appendChild(pt);
      var trk = h('div', 'rm-trk'); var rel = h('div'); rel.style.width = Math.round(x.v / max * 100) + '%'; rel.style.background = '#FF4D82'; trk.appendChild(rel); pm.appendChild(trk);
      fila.appendChild(pm); fila.appendChild(h('span', 'rm-pct', Math.round(x.v / total * 100) + '%')); t.appendChild(fila);
    });
    var svg = s('svg', { viewBox: '0 0 400 90', width: '100%', role: 'img', 'aria-label': 'Sesiones por hora del día', style: 'margin-top:12px' });
    var tops = top3.map(function (x) { return x.hora; });
    horas.forEach(function (x, i) {
      var alto = x.v > 0 ? Math.max(4, x.v / max * 68) : 2;
      svg.appendChild(s('rect', { x: 6 + i * 16.2, y: 76 - alto, width: 9, height: alto, rx: 4, fill: tops.indexOf(x.hora) >= 0 ? '#FF4D82' : '#FFD666', opacity: x.v > 0 ? 1 : 0.4 }));
    });
    [[0, '0 h'], [6, '6 h'], [12, '12 h'], [18, '18 h'], [23, '23 h']].forEach(function (p) { svg.appendChild(s('text', { x: 4 + p[0] * 16.2, y: 90, style: 'font-size:11px;fill:#9A8690' }, p[1])); });
    t.appendChild(svg);
    return t;
  }
  function tarjetaQuien(g) {
    var t = h('section', 'rm-b rm-w');
    var hd = h('div', 'rm-hd'); var izq = h('div'); izq.appendChild(h('h2', 'rm-t', 'Quién usa más')); izq.appendChild(h('p', 'rm-subt', 'Minutos con la app abierta')); hd.appendChild(izq); t.appendChild(hd);
    var lista = (g.topUsuariosTiempo || []).slice(0, 5);
    if (!lista.length) { t.appendChild(h('p', 'rm-vacio', 'Todavía no hay uso registrado.')); return t; }
    var max = Math.max.apply(null, lista.map(function (x) { return Number(x.valor) || 0; }).concat([1]));
    var colores = ['#FF4D82', '#FFD666', '#BFE4A5', '#F6DADD', '#FFD666'];
    lista.forEach(function (x, i) {
      var nombre = String(x.nombre || '');
      var fila = h('div', 'rm-rk');
      var av = h('span', 'rm-av', nombre.split(/\s+/).map(function (p) { return p.charAt(0); }).join('').slice(0, 2).toUpperCase() || '?'); av.style.background = colores[i % colores.length]; if (i === 0) av.style.color = '#fff';
      fila.appendChild(av);
      var rn = h('div', 'rm-rn'); rn.appendChild(h('b', null, nombre));
      var trk = h('div', 'rm-trk'); var rel = h('div'); rel.style.width = Math.max(3, Math.round((Number(x.valor) || 0) / max * 100)) + '%'; rel.style.background = '#2B1020'; trk.appendChild(rel); rn.appendChild(trk);
      fila.appendChild(rn); fila.appendChild(h('span', 'rm-big2', num.format(Number(x.valor) || 0))); t.appendChild(fila);
    });
    t.appendChild(h('p', 'rm-nota', 'El tiempo se mide con la app abierta, cada 30 segundos.'));
    return t;
  }
  function renderUso() {
    var raiz = document.getElementById('uso-mod');
    if (!raiz || !ultimoUso) return;
    var r = ultimoUso.r, g = ultimoUso.g90 || ultimoUso.g;
    vaciar(raiz);
    var k = h('div', 'rm-kpis');
    k.appendChild(kpiUso('rm-y', 'En línea ahora', 'Usaron la app hace menos de 2 min', 'Ahora', num.format(r.enLineaAhora)));
    k.appendChild(kpiUso('rm-g', 'Activos hoy', num.format(r.activos7d) + ' usuarios en los últimos 7 días', 'Usuarios únicos', num.format(r.activosHoy)));
    k.appendChild(kpiUso('rm-p', 'Sesiones', 'Promedio de ' + fmt1(r.minutosPorSesion) + ' min por sesión', 'Desde el inicio', num.format(r.sesionesTotal)));
    k.appendChild(kpiUso('rm-h', 'Tiempo total', minutosATexto(r.minutosUso7d) + ' en los últimos 7 días', 'App abierta', fmt1(r.minutosUsoTotal / 60) + ' h'));
    raiz.appendChild(k);
    raiz.appendChild(graficoUsoDias(g));
    var dos = h('div', 'rm-dos'); dos.appendChild(tarjetaHoras(ultimoUso.g)); dos.appendChild(tarjetaQuien(ultimoUso.g)); raiz.appendChild(dos);
  }
  window.CooklyUso = {
    pintar: function (r, g, g90) {
      try {
        ultimoUso = { r: r, g: g, g90: g90 || g };
        renderUso();
        var sec = document.querySelector('[data-seccion="uso"]'); if (sec) sec.classList.add('rm-on');
      } catch (e) {
        var s3 = document.querySelector('[data-seccion="uso"]'); if (s3) s3.classList.remove('rm-on');
        if (window.console) console.error('Uso moderno:', e);
      }
    }
  };

  // Mientras llegan los datos se muestra un esqueleto (y no el Resumen anterior).
  function esqueleto(id, seccion, cajas) {
    var raiz = document.getElementById(id), sec = document.querySelector('[data-seccion="' + seccion + '"]');
    if (!raiz || !sec) return;
    var g = h('div', 'rm-sk-g');
    cajas.forEach(function (c) { var b = h('div', 'rm-sk ' + c); g.appendChild(b); });
    raiz.appendChild(g); sec.classList.add('rm-on');
  }
  esqueleto('resumen-mod', 'resumen', ['rm-sk-y', 'rm-sk-p', 'rm-sk-g2', 'rm-sk-h']);
  esqueleto('uso-mod', 'uso', ['rm-sk-y', 'rm-sk-g2', 'rm-sk-p', 'rm-sk-h']);

  window.CooklyFallo = function (seccion) {
    var sec = document.querySelector('[data-seccion="' + seccion + '"]');
    if (sec) sec.classList.remove('rm-on');
  };

  window.CooklyResumen = {
    pintar: function (r, g, dias, rep, g90) {
      try {
        ultimo = { r: r, g: g, rep: rep, g90: g90 || g };
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