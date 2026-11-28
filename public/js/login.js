const mensaje = document.getElementById('mensaje');

    async function iniciarSesion() {
      mensaje.textContent = '';
      const usuario = document.getElementById('usuario').value.trim();
      const contrasena = document.getElementById('contrasena').value;

      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contrasena })
      });
      const datos = await resp.json();

      if (resp.ok) {
        window.location.href = '/panel.html';     // éxito: entra al panel
      } else {
        mensaje.textContent = datos.error;        // fallo: muestra el mensaje del servidor
      }
    }

    document.getElementById('entrar').addEventListener('click', iniciarSesion);
    document.getElementById('contrasena').addEventListener('keydown', e => {
      if (e.key === 'Enter') iniciarSesion();
    });
