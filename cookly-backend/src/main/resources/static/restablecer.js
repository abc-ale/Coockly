(function () {
  "use strict";
  var ENDPOINT = "/api/v1/autenticacion/restablecer-con-token"; // ruta completa del backend
  var MIN = 10; // el backend exige @Size(min = 10, max = 72)

  var form = document.getElementById("reset-form");
  var passwordInput = document.getElementById("password");
  var confirmInput = document.getElementById("confirm-password");
  var submitButton = document.getElementById("submit-button");
  var message = document.getElementById("message");
  var strengthText = document.getElementById("strength-text");
  var strengthBars = document.querySelectorAll(".strength-bars span");
  var formView = document.getElementById("form-view");
  var successView = document.getElementById("success-view");
  var recoveryToken = new URLSearchParams(window.location.search).get("token");

  function showMessage(text, type) {
    message.textContent = text;
    message.className = "message visible " + type;
  }

  function strength(p) {
    var s = 0;
    if (p.length >= MIN) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p) || p.length >= 14) s++;
    return s;
  }

  function updateStrength() {
    var p = passwordInput.value;
    var score = p ? Math.max(1, strength(p)) : 0;
    var colors = ["#EADDE0", "#E45B5B", "#F2A33B", "#83B85B", "#3F8F43"];
    var labels = ["", "Contraseña muy débil", "Contraseña débil", "Contraseña aceptable", "Contraseña segura"];
    strengthBars.forEach(function (bar, i) {
      bar.style.background = i < score ? colors[score] : colors[0];
    });
    strengthText.textContent = labels[score];
  }
  passwordInput.addEventListener("input", updateStrength);

  document.querySelectorAll(".password-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = document.getElementById(btn.dataset.target);
      var visible = input.type === "text";
      input.type = visible ? "password" : "text";
      btn.classList.toggle("is-visible", !visible);
      btn.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
    });
  });

  if (!recoveryToken) {
    submitButton.disabled = true;
    showMessage("Este enlace no contiene un token válido. Pide uno nuevo desde la app.", "error");
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var password = passwordInput.value;

    if (!recoveryToken) return showMessage("El enlace de recuperación no es válido.", "error");
    if (password.length < MIN) return showMessage("La contraseña debe tener al menos " + MIN + " caracteres.", "error");
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
      return showMessage("Incluye al menos una letra y un número.", "error");
    if (password !== confirmInput.value) return showMessage("Las contraseñas no coinciden.", "error");

    submitButton.disabled = true;
    submitButton.textContent = "Guardando...";
    message.className = "message";

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: recoveryToken, nuevaContrasena: password })
    })
      .then(function (r) {
        return r.text().then(function (t) {
          var data = {};
          try { data = t ? JSON.parse(t) : {}; } catch (e) {}
          if (!r.ok) throw new Error(data.mensaje || data.message || "El enlace no es válido o ya venció.");
        });
      })
      .then(function () {
        passwordInput.value = "";
        confirmInput.value = "";
        formView.classList.add("hidden");
        successView.classList.remove("hidden");
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch(function (err) {
        showMessage(err instanceof TypeError
          ? "No hay conexión con el servidor. Inténtalo otra vez."
          : err.message, "error");
        submitButton.disabled = false;
        submitButton.textContent = "Guardar contraseña";
      });
  });
})();
