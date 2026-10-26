/* Cookly · Panel administrativo · Diseño moderno
   - Agrupa el menú lateral (General, Moderación, Comunidad, Contenido, Sistema).
   - Deja marcado "7 días" como rango inicial (las gráficas muestran cada día de la semana).
   - Agrega un calendario al Resumen.
   Todo el texto se inserta con textContent. Si algo no existe en la página, simplemente no hace nada. */
(function () {
  'use strict';

  function el(etiqueta, clase, texto) {
    var n = document.createElement(etiqueta);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  // ---- menú con grupos
  var grupos = { resumen: 'General', 'reportes-comunidad': 'Moderación', comentarios: 'Contenido', historial: 'Sistema' };
  var nav = document.querySelector('.navegacion');
  if (nav && !nav.querySelector('.grp')) {
    Object.keys(grupos).forEach(function (k) {
      var a = nav.querySelector('a[data-nav="' + k + '"]');
      if (a) nav.insertBefore(el('p', 'grp', grupos[k]), a);
    });
  }

  // ---- rango inicial: 7 días (admin.js ya arranca con 7)
  var selector = document.getElementById('selector-rango');
  if (selector) {
    Array.prototype.forEach.call(selector.querySelectorAll('button[data-dias]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-dias') === '7' ? 'true' : 'false');
    });
  }

  // ---- calendario
  var rejilla = document.querySelector('[data-seccion="resumen"] .rejilla');
  if (!rejilla) return;

  var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  var hoy = new Date();
  var vista = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  var tarjeta = el('article', 'tarjeta calendario');
  var cab = el('div', 'cal-cab');
  var titulo = el('h2', null, '');
  var flechas = el('div', 'cal-flechas');
  var ant = el('button', null, '‹'); ant.type = 'button'; ant.setAttribute('aria-label', 'Mes anterior');
  var sig = el('button', null, '›'); sig.type = 'button'; sig.setAttribute('aria-label', 'Mes siguiente');
  flechas.appendChild(ant); flechas.appendChild(sig);
  cab.appendChild(titulo); cab.appendChild(flechas);
  var cuadro = el('div', 'cal-rejilla');
  var leyenda = el('div', 'cal-leyenda');
  var l1 = el('span'); l1.appendChild(el('i')); l1.firstChild.style.background = '#FF4D80'; l1.appendChild(document.createTextNode('Hoy'));
  var l2 = el('span'); l2.appendChild(el('i')); l2.firstChild.style.background = '#FFD866'; l2.appendChild(document.createTextNode('Últimos 7 días'));
  leyenda.appendChild(l1); leyenda.appendChild(l2);
  tarjeta.appendChild(cab); tarjeta.appendChild(cuadro); tarjeta.appendChild(leyenda);
  rejilla.appendChild(tarjeta);

  function mismoDia(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

  function pintar() {
    titulo.textContent = MESES[vista.getMonth()] + ' ' + vista.getFullYear();
    while (cuadro.firstChild) cuadro.removeChild(cuadro.firstChild);
    SEMANA.forEach(function (s) { cuadro.appendChild(el('span', 'sem', s)); });
    var primero = (new Date(vista.getFullYear(), vista.getMonth(), 1).getDay() + 6) % 7; // lunes = 0
    var total = new Date(vista.getFullYear(), vista.getMonth() + 1, 0).getDate();
    for (var i = 0; i < primero; i++) cuadro.appendChild(el('span', 'dia', ''));
    var inicio7 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6);
    for (var d = 1; d <= total; d++) {
      var f = new Date(vista.getFullYear(), vista.getMonth(), d);
      var clase = 'dia';
      if (mismoDia(f, hoy)) clase += ' hoy';
      else if (f >= inicio7 && f <= hoy) clase += ' reciente';
      cuadro.appendChild(el('span', clase, String(d)));
    }
  }

  ant.addEventListener('click', function () { vista = new Date(vista.getFullYear(), vista.getMonth() - 1, 1); pintar(); });
  sig.addEventListener('click', function () { vista = new Date(vista.getFullYear(), vista.getMonth() + 1, 1); pintar(); });
  pintar();
})();