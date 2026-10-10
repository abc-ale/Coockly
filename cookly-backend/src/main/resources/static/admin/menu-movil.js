/* Cookly · Panel administrativo · Menú hamburguesa y tablas en tarjetas (pantallas pequeñas) */
(function () {
  'use strict';
  // Cada celda recibe el nombre de su columna para mostrarlo en las tarjetas del celular
  function etiquetar(tabla) {
    var cab = [];
    tabla.querySelectorAll('thead th').forEach(function (th) {
      var t = (th.textContent || '').trim();
      cab.push(t === 'Acciones' ? '' : t);
    });
    tabla.querySelectorAll('tbody tr').forEach(function (tr) {
      Array.prototype.forEach.call(tr.children, function (td, i) {
        var t = cab[i] || '';
        if (td.getAttribute('data-label') !== t) td.setAttribute('data-label', t);
      });
    });
  }
  function etiquetarTodas() { document.querySelectorAll('table').forEach(etiquetar); }
  var pendiente = false;
  new MutationObserver(function () {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(function () { pendiente = false; etiquetarTodas(); });
  }).observe(document.body, { childList: true, subtree: true });
  etiquetarTodas();
})();

(function () {
  'use strict';
  var panel = document.getElementById('vista-panel');
  var boton = document.getElementById('btn-menu');
  var velo = document.getElementById('velo');
  var lateral = document.getElementById('lateral');
  if (!panel || !boton || !velo || !lateral) return;

  function abrir() {
    panel.classList.add('menu-abierto');
    velo.hidden = false;
    boton.setAttribute('aria-expanded', 'true');
    boton.setAttribute('aria-label', 'Cerrar menú');
    document.body.classList.add('sin-scroll');
  }

  function cerrar() {
    panel.classList.remove('menu-abierto');
    velo.hidden = true;
    boton.setAttribute('aria-expanded', 'false');
    boton.setAttribute('aria-label', 'Abrir menú');
    document.body.classList.remove('sin-scroll');
  }

  boton.addEventListener('click', function () {
    if (panel.classList.contains('menu-abierto')) cerrar(); else abrir();
  });
  velo.addEventListener('click', cerrar);

  // Al elegir una sección o cerrar sesión, el menú se cierra solo
  lateral.addEventListener('click', function (e) {
    if (e.target.closest('a, button')) cerrar();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cerrar();
  });

  // Si la pantalla se agranda, el menú vuelve a ser la barra lateral fija
  window.addEventListener('resize', function () {
    if (window.innerWidth > 960) cerrar();
  });
})();
