/* Inicio de sesión moderno · Cookly
   Solo detalles visuales: el acceso real (formularios, API, errores) sigue en admin.js. */
(function () {
  'use strict';
  var raiz = document.getElementById('vista-acceso');
  if (!raiz) return;
  var $ = function (id) { return document.getElementById(id); };
  var quieta = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var chico = window.matchMedia && matchMedia('(max-width: 960px)').matches;

  // ---------------------------------------------------------------- foto desde Cloudinary (con respaldos)
  // 1) versión optimizada  2) original en Cloudinary  3) copia local img/login-frutas.webp
  Array.prototype.forEach.call(raiz.querySelectorAll('img[data-nube]'), function (img) {
    var paso = 0;
    function siguiente() {
      paso++;
      if (paso === 1) img.src = img.getAttribute('data-nube');
      else if (paso === 2) img.src = img.getAttribute('data-local');
    }
    img.addEventListener('error', siguiente);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) siguiente();
  });

  // ---------------------------------------------------------------- saludo según la hora
  var h = new Date().getHours();
  var saludo = h < 6 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  var elSaludo = $('lg-saludo');
  if (elSaludo) elSaludo.textContent = saludo + ', chef';

  // ---------------------------------------------------------------- confeti
  function confeti(x, y) {
    if (quieta) return;
    var colores = ['#FF4D80', '#FFD866', '#BEE3A5', '#FF8A5B', '#FFFFFF', '#B983FF'];
    for (var k = 0; k < 34; k++) {
      var s = document.createElement('i');
      var w = 6 + Math.random() * 8;
      s.className = 'lg-confeti';
      s.style.cssText = 'width:' + w + 'px;height:' + (Math.random() < 0.5 ? w : w * 0.5) + 'px;background:' + colores[k % colores.length] +
        ';border-radius:' + (Math.random() < 0.5 ? '50%' : '3px');
      document.body.appendChild(s);
      var a = Math.random() * Math.PI * 2;
      var v = 90 + Math.random() * 190;
      var anim = s.animate([
        { transform: 'translate(' + x + 'px,' + y + 'px) rotate(0)', opacity: 1 },
        { transform: 'translate(' + (x + Math.cos(a) * v) + 'px,' + (y + Math.sin(a) * v - 90) + 'px) rotate(' + Math.random() * 720 + 'deg)', opacity: 1, offset: 0.55 },
        { transform: 'translate(' + (x + Math.cos(a) * v * 1.2) + 'px,' + (y + Math.sin(a) * v + 220) + 'px) rotate(' + Math.random() * 900 + 'deg)', opacity: 0 }
      ], { duration: 1300 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)' });
      anim.onfinish = (function (n) { return function () { n.remove(); }; })(s);
    }
  }
  function confetiDe(el) {
    var r = el.getBoundingClientRect();
    confeti(r.left + r.width / 2, r.top + r.height / 2);
  }
  var logo = raiz.querySelector('.lg-logo');
  if (logo) logo.addEventListener('click', function () { confetiDe(logo); });

  // ---------------------------------------------------------------- burbujas que suben
  var panel = raiz.querySelector('.lg-panel');
  if (panel && !quieta) {
    for (var k = 0; k < 16; k++) {
      var c = document.createElement('i');
      var z = 3 + Math.random() * 5;
      c.className = 'lg-chispa';
      c.style.cssText = 'left:' + Math.random() * 100 + '%;width:' + z + 'px;height:' + z + 'px;--t:' + (9 + Math.random() * 10) + 's;--dl:' + (-Math.random() * 16) + 's';
      panel.appendChild(c);
    }
  }

  // ---------------------------------------------------------------- movimiento con el mouse
  if (!chico && !quieta) {
    window.addEventListener('mousemove', function (ev) {
      if (raiz.hidden) return;
      raiz.style.setProperty('--nx', (ev.clientX / window.innerWidth - 0.5).toFixed(3));
      raiz.style.setProperty('--ny', (ev.clientY / window.innerHeight - 0.5).toFixed(3));
      raiz.style.setProperty('--mx', ev.clientX + 'px');
      raiz.style.setProperty('--my', ev.clientY + 'px');
    });
  }

  // ---------------------------------------------------------------- contraseña: bolitas y Bloq Mayús
  var clave = $('acceso-contrasena');
  var ing = $('lg-ing'), caps = $('lg-caps');
  var colores = ['#FF4D80', '#FFB02E', '#FFD866', '#7BC96F', '#FF8A5B', '#B983FF', '#4FC3F7', '#F06292'];
  if (clave && ing) {
    clave.addEventListener('input', function () {
      var n = Math.min(clave.value.length, colores.length);
      Array.prototype.forEach.call(ing.querySelectorAll('i'), function (d, i) {
        var on = i < n;
        if (on && !d.classList.contains('on')) { d.classList.add('on'); d.style.background = colores[i]; }
        if (!on) { d.classList.remove('on'); d.style.background = ''; }
      });
    });
  }
  function revisarCaps(ev) {
    if (!caps) return;
    caps.hidden = !(ev && ev.getModifierState && ev.getModifierState('CapsLock'));
  }
  if (clave) {
    clave.addEventListener('keydown', revisarCaps);
    clave.addEventListener('keyup', revisarCaps);
    clave.addEventListener('blur', function () { revisarCaps(null); });
  }

  // ---------------------------------------------------------------- al entrar: mensajes de cocina y confeti
  var form = $('form-acceso'), boton = $('acceso-boton'), caja = raiz.querySelector('.lg-caja');
  var error = $('acceso-error');

  // el formulario tiembla cuando aparece un error
  if (error && caja && 'MutationObserver' in window) {
    new MutationObserver(function () {
      if (error.hidden) return;
      caja.classList.remove('lg-tiembla');
      void caja.offsetWidth;
      caja.classList.add('lg-tiembla');
    }).observe(error, { attributes: true, attributeFilter: ['hidden'] });
  }

  if (form && boton) {
    var pasos = ['Pelando las fresas…', 'Calentando el horno…', 'Sirviendo tu panel…'];
    form.addEventListener('submit', function () {
      // admin.js ya validó y puso "Entrando…": si el botón no quedó bloqueado, no hay nada que animar
      if (!boton.disabled) return;
      var inicio = Date.now();
      var timer = setInterval(function () {
        if (!boton.disabled) {
          clearInterval(timer);
          // si el panel ya se abrió (el acceso quedó oculto), celebramos
          if (raiz.hidden) confeti(window.innerWidth / 2, window.innerHeight * 0.3);
          return;
        }
        var i = Math.min(Math.floor((Date.now() - inicio) / 900), pasos.length - 1);
        if (boton.textContent !== pasos[i]) boton.textContent = pasos[i];
      }, 150);
    });
  }
})();