/* Cookly · Panel administrativo · Menú hamburguesa (pantallas pequeñas) */
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
