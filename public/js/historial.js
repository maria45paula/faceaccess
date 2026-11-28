const el = id => document.getElementById(id);
    const METODOS = { rostro: 'Reconocimiento facial', qr: 'Código QR', documento: 'Documento' };

    // Llamada a la API; si la sesión venció, vuelve al login
    async function api(url, opciones) {
      const resp = await fetch(url, opciones);
      if (resp.status === 401) { window.location.href = '/login.html'; throw new Error('Sin sesión'); }
      const datos = await resp.json().catch(() => ({}));
      return { ok: resp.ok, datos };
    }

    async function verificarSesion() {
      const r = await api('/api/auth/me');
      el('quien').textContent = r.datos.nombre + ' (' + r.datos.rol + ') ';
    }

    el('btnSalir').addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login.html';
    });

    function filtrosActivos() {
      const q = new URLSearchParams();
      ['desde', 'hasta', 'metodo', 'resultado', 'estudiante'].forEach(id => {   // el id de cada campo = nombre del filtro
        const valor = el(id).value.trim();
        if (valor) q.set(id, valor);
      });
      return q;
    }



    async function cargarHistorial() {
      const filtros = filtrosActivos();
      const r = await api('/api/historial' + (filtros.toString() ? '?' + filtros : ''));
      const cuerpo = el('lista');
      cuerpo.innerHTML = '';

      if (!r.ok) {
        el('total').textContent = r.datos.error || 'No se pudo cargar el historial.';
        return;
      }
      el('total').textContent = r.datos.length + (r.datos.length === 1 ? ' ingreso' : ' ingresos');

      if (!r.datos.length) {
        const celda = cuerpo.insertRow().insertCell();
        celda.colSpan = 5;
        celda.textContent = filtros.toString() ? 'No hay ingresos que coincidan con los filtros.' : 'Todavía no hay ingresos registrados.';
        return;
      }

      r.datos.forEach(i => {
        const fila = cuerpo.insertRow();
        fila.insertCell().textContent = i.fecha_hora;      // textContent evita inyectar HTML
        // Sin nombre: o fue un intento no reconocido, o el estudiante se eliminó después de ingresar
        fila.insertCell().textContent = i.nombre || (i.resultado === 'permitido' ? 'Estudiante eliminado' : 'No identificado');
        fila.insertCell().textContent = i.documento || '—';
        fila.insertCell().textContent = METODOS[i.metodo] || i.metodo;
        const celdaResultado = fila.insertCell();
        celdaResultado.textContent = i.resultado === 'permitido' ? '✔ Permitido' : '✘ Denegado';   // ícono + texto
        celdaResultado.className = i.resultado;
      });
    }

    el('formFiltros').addEventListener('submit', e => {   // submit permite usar también la tecla Enter
      e.preventDefault();
      cargarHistorial();
    });
    el('btnLimpiar').addEventListener('click', () => {
      el('formFiltros').reset();
      cargarHistorial();
    });

    verificarSesion().then(cargarHistorial);
