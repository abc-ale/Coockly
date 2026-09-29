const formulario = document.getElementById('formulario');
const mensaje = document.getElementById('mensaje');
const token = new URLSearchParams(window.location.search).get('token');

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const nuevaContrasena =
    document.getElementById('nuevaContrasena').value;

  const confirmacion =
    document.getElementById('confirmacion').value;

  if (!token) {
    mensaje.textContent = 'El enlace no contiene un token válido.';
    return;
  }

  if (nuevaContrasena !== confirmacion) {
    mensaje.textContent = 'Las contraseñas no coinciden.';
    return;
  }

  if (nuevaContrasena.length < 10) {
    mensaje.textContent =
      'La contraseña debe tener al menos 10 caracteres.';
    return;
  }

  mensaje.textContent = 'Actualizando contraseña...';

  try {
    const respuesta = await fetch(
      '/api/v1/autenticacion/restablecer-con-token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          nuevaContrasena
        })
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || 'No se pudo actualizar la contraseña.');
    }

    formulario.reset();
    mensaje.textContent =
      'Contraseña actualizada correctamente. Ya puedes iniciar sesión.';
  } catch (error) {
    mensaje.textContent = error.message;
  }
});