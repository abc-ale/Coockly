(function () {
  "use strict";

  var ENDPOINT_VALIDAR =
    "/api/v1/autenticacion/validar-token-recuperacion";
  var ENDPOINT_RESTABLECER =
    "/api/v1/autenticacion/restablecer-con-token";
  var MIN = 10;
  var MAX = 72;

  var loadingView = document.getElementById("view-loading");
  var formView = document.getElementById("view-form");
  var successView = document.getElementById("view-success");
  var invalidView = document.getElementById("view-invalid");
  var invalidText = document.getElementById("invalid-text");

  var form = document.getElementById("reset-form");
  var passwordInput = document.getElementById("password");
  var confirmInput = document.getElementById("confirm-password");
  var submitButton = document.getElementById("submit-button");
  var message = document.getElementById("message");
  var timer = document.getElementById("timer");
  var timerBanner = document.getElementById("timer-banner");

  var parametros = new URLSearchParams(window.location.search);
  var recoveryToken = parametros.get("token");
  // Si el enlace se pidió desde el panel web, al terminar se vuelve al panel y no a la app.
  var desdePanel = parametros.get("origen") === "panel";

  function usarPanel() {
    var enlaceExito = document.getElementById("enlace-exito");
    var textoExito = document.getElementById("exito-texto");
    var enlaceNuevo = document.getElementById("enlace-nuevo");
    var enlaceLogin = document.getElementById("enlace-login");

    enlaceExito.setAttribute("href", "/admin/");
    enlaceExito.textContent = "Ir al panel";
    textoExito.textContent =
      "Ya puedes entrar al panel administrativo con tu contraseña nueva.";
    enlaceNuevo.setAttribute("href", "/admin/#recuperar");
    enlaceLogin.setAttribute("href", "/admin/");
    enlaceLogin.textContent = "Volver al panel";
  }

  if (desdePanel) usarPanel();
  var timerId = null;
  var enviando = false;

  function mostrarVista(vista) {
    [loadingView, formView, successView, invalidView].forEach(function (elemento) {
      elemento.classList.add("hidden");
    });
    vista.classList.remove("hidden");
  }

  function mostrarMensaje(texto) {
    message.textContent = texto;
    message.className = "message visible";
  }

  function limpiarTemporizador() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function mostrarEnlaceNoDisponible(texto) {
    limpiarTemporizador();

    if (texto) {
      invalidText.textContent = texto;
    }

    mostrarVista(invalidView);
  }

  function leerExpiracion(token) {
    try {
      var partes = token.split(".");
      if (partes.length !== 3) return null;

      var payload = partes[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      while (payload.length % 4) {
        payload += "=";
      }

      var datos = JSON.parse(window.atob(payload));
      return typeof datos.exp === "number" ? datos.exp : null;
    } catch (error) {
      return null;
    }
  }

  function respuestaJson(respuesta) {
    return respuesta.text().then(function (texto) {
      var datos = {};

      try {
        datos = texto ? JSON.parse(texto) : {};
      } catch (error) {
        datos = {};
      }

      if (!respuesta.ok) {
        var errorRespuesta = new Error(
          datos.mensaje ||
          datos.message ||
          "No se pudo completar la solicitud."
        );
        errorRespuesta.status = respuesta.status;
        throw errorRespuesta;
      }

      return datos;
    });
  }

  function actualizarTemporizador(expiracion) {
    var segundos = Math.ceil((expiracion * 1000 - Date.now()) / 1000);

    if (segundos <= 0) {
      limpiarTemporizador();
      mostrarEnlaceNoDisponible();
      return false;
    }

    var minutos = Math.floor(segundos / 60);
    var resto = segundos % 60;

    timer.textContent =
      String(minutos).padStart(2, "0") +
      ":" +
      String(resto).padStart(2, "0");

    timerBanner.classList.toggle("urgent", segundos <= 60);
    return true;
  }

  function iniciarTemporizador(expiracion) {
    limpiarTemporizador();

    if (actualizarTemporizador(expiracion)) {
      timerId = window.setInterval(function () {
        actualizarTemporizador(expiracion);
      }, 1000);
    }
  }

  function verificarEnlace(expiracion) {
    fetch(ENDPOINT_VALIDAR, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ token: recoveryToken })
    })
      .then(respuestaJson)
      .then(function (datos) {
        if (datos.valido !== true) {
          mostrarEnlaceNoDisponible();
          return;
        }

        // Cuenta de administrador: al terminar se vuelve al panel web, nunca a la app.
        if (datos.panel === true) usarPanel();

        mostrarVista(formView);
        iniciarTemporizador(expiracion);
      })
      .catch(function () {
        // Si la red falla, dejamos intentar el cambio; el servidor
        // volverá a validar el token al guardar la contraseña.
        mostrarVista(formView);
        iniciarTemporizador(expiracion);
        mostrarMensaje(
          "No pudimos comprobar el enlace ahora. Revisa tu conexión e inténtalo."
        );
      });
  }

  document.querySelectorAll(".eye").forEach(function (boton) {
    boton.addEventListener("click", function () {
      var input = document.getElementById(boton.dataset.target);
      var visible = input.type === "password";

      input.type = visible ? "text" : "password";
      boton.classList.toggle("is-visible", visible);
      boton.setAttribute(
        "aria-label",
        visible ? "Ocultar contraseña" : "Mostrar contraseña"
      );
      boton.setAttribute("aria-pressed", visible ? "true" : "false");
    });
  });

  form.addEventListener("submit", function (evento) {
    evento.preventDefault();

    if (enviando) return;

    var nueva = passwordInput.value;
    var confirmacion = confirmInput.value;

    if (nueva.length < MIN) {
      mostrarMensaje("La contraseña debe tener al menos 10 caracteres.");
      return;
    }

    if (nueva.length > MAX) {
      mostrarMensaje("La contraseña no puede superar los 72 caracteres.");
      return;
    }

    if (!/[A-Za-z]/.test(nueva) || !/[0-9]/.test(nueva)) {
      mostrarMensaje("Incluye al menos una letra y un número.");
      return;
    }

    if (nueva !== confirmacion) {
      mostrarMensaje("Las contraseñas no coinciden.");
      return;
    }

    enviando = true;
    submitButton.disabled = true;
    submitButton.classList.add("loading");
    submitButton.textContent = "Guardando...";
    message.className = "message";

    fetch(ENDPOINT_RESTABLECER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        token: recoveryToken,
        nuevaContrasena: nueva
      })
    })
      .then(respuestaJson)
      .then(function () {
        limpiarTemporizador();
        passwordInput.value = "";
        confirmInput.value = "";
        mostrarVista(successView);
      })
      .catch(function (error) {
        if (error.status === 400 || error.status === 401) {
          mostrarEnlaceNoDisponible(error.message);
          return;
        }

        mostrarMensaje(
          error instanceof TypeError
            ? "No hay conexión con el servidor. Inténtalo otra vez."
            : error.message
        );

        enviando = false;
        submitButton.disabled = false;
        submitButton.classList.remove("loading");
        submitButton.textContent = "Cambiar contraseña";
      });
  });

  // Quita el token de la barra de direcciones después de leerlo.
  try {
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  } catch (error) {
    // Algunos navegadores pueden bloquear replaceState; el flujo sigue funcionando.
  }

  var expiracion = recoveryToken ? leerExpiracion(recoveryToken) : null;

  if (!recoveryToken || !expiracion || expiracion * 1000 <= Date.now()) {
    mostrarEnlaceNoDisponible();
  } else {
    verificarEnlace(expiracion);
  }
})();