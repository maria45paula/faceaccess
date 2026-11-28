let editandoId = null;     // null = registrando, número = editando ese estudiante
    let fotoBase64 = null;
    let descriptorFacial = null;   // los 128 números del rostro, calculados al tomar la foto
    let modelosListos = false;

    const el = id => document.getElementById(id);
    const video = el('video');

    function avisar(texto, tipo) {
      el('mensaje').textContent = texto;
      el('mensaje').className = tipo || '';
    }

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

    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => { video.srcObject = stream; })
      .catch(() => avisar('No se pudo acceder a la cámara. Revise los permisos del navegador.', 'error'));

    // Modelos de reconocimiento facial (se cargan una sola vez)
    async function cargarModelos() {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        modelosListos = true;
      } catch (e) {
        avisar('No se pudieron cargar los modelos de reconocimiento facial.', 'error');
      }
    }

    el('btnFoto').addEventListener('click', async () => {
      if (!video.videoWidth) { avisar('La cámara no está lista todavía.', 'error'); return; }
      if (!modelosListos) { avisar('Cargando el reconocimiento facial, intente en unos segundos.', 'error'); return; }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);

      // Se busca un rostro en la foto capturada y se calcula su descriptor
      avisar('Analizando la foto…', '');
      const r = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!r) {   // no se detectó ningún rostro: se pide repetir la foto
        fotoBase64 = null;
        descriptorFacial = null;
        el('vista').classList.add('oculto');
        avisar('No se detectó un rostro. Acérquese, mire a la cámara y mejore la luz.', 'error');
        return;
      }

      descriptorFacial = Array.from(r.descriptor);   // Float32Array -> arreglo normal para enviarlo en JSON
      fotoBase64 = canvas.toDataURL('image/jpeg', 0.8);
      el('vista').src = fotoBase64;
      el('vista').classList.remove('oculto');
      avisar('Rostro detectado. Si la foto no se ve bien, puede tomarla de nuevo.', 'ok');
    });

    async function cargarLista() {
      const r = await api('/api/estudiantes');
      const cuerpo = el('lista');
      cuerpo.innerHTML = '';
      if (!r.datos.length) {
        const fila = cuerpo.insertRow();
        const celda = fila.insertCell();
        celda.colSpan = 4;
        celda.textContent = 'Todavía no hay estudiantes registrados.';
        return;
      }
      r.datos.forEach(e => {
        const fila = cuerpo.insertRow();

        const celdaFoto = fila.insertCell();
        if (e.tiene_foto) {
          const img = document.createElement('img');
          img.src = '/api/estudiantes/' + e.id + '/foto';
          img.alt = 'Foto de ' + e.nombre;
          celdaFoto.appendChild(img);
        }
        fila.insertCell().textContent = e.nombre;       // textContent evita inyectar HTML
        fila.insertCell().textContent = e.documento;

        const celdaAcc = fila.insertCell();
        celdaAcc.className = 'acc';
        const bQR = document.createElement('button');
        bQR.textContent = 'Ver QR';
        bQR.addEventListener('click', () => verQR(e));
        const bEditar = document.createElement('button');
        bEditar.textContent = 'Editar';
        bEditar.addEventListener('click', () => iniciarEdicion(e));
        const bEliminar = document.createElement('button');
        bEliminar.textContent = 'Eliminar';
        bEliminar.className = 'peligro';
        bEliminar.addEventListener('click', () => eliminar(e));
        celdaAcc.append(bEditar, bQR, bEliminar);      });
    }

    el('btnGuardar').addEventListener('click', async () => {
      const nombre = el('nombre').value.trim();
      const documento = el('documento').value.trim();

      if (editandoId) {
        const r = await api('/api/estudiantes/' + editandoId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, documento })
        });
        if (!r.ok) { avisar(r.datos.error, 'error'); return; }
        avisar('Estudiante actualizado correctamente.', 'ok');
      } else {
        const r = await api('/api/estudiantes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre, documento,
            autorizacion: el('autorizacion').checked,
            foto: fotoBase64,
            descriptor: descriptorFacial
          })
        });
        if (!r.ok) { avisar(r.datos.error, 'error'); return; }
        avisar('Estudiante registrado correctamente.', 'ok');
      }
      limpiarFormulario(true);
      cargarLista();
    });

    function iniciarEdicion(e) {
      editandoId = e.id;
      el('nombre').value = e.nombre;
      el('documento').value = e.documento;
      el('tituloForm').textContent = 'Editar estudiante';
      el('btnGuardar').textContent = 'Actualizar estudiante';
      el('btnCancelar').classList.remove('oculto');
      document.querySelector('.solo-registro').classList.add('oculto');
      avisar('', '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    el('btnCancelar').addEventListener('click', () => limpiarFormulario(false));

    function limpiarFormulario(conservarMensaje) {
      editandoId = null;
      fotoBase64 = null;
      descriptorFacial = null;
      el('nombre').value = '';
      el('documento').value = '';
      el('autorizacion').checked = false;
      el('vista').classList.add('oculto');
      el('tituloForm').textContent = 'Registrar estudiante';
      el('btnGuardar').textContent = 'Guardar estudiante';
      el('btnCancelar').classList.add('oculto');
      document.querySelector('.solo-registro').classList.remove('oculto');
      if (!conservarMensaje) avisar('', '');
    }

    async function eliminar(e) {
      if (!confirm('¿Eliminar a ' + e.nombre + '? Se borrarán también su foto y su autorización.')) return;
      const r = await api('/api/estudiantes/' + e.id, { method: 'DELETE' });
      if (!r.ok) { avisar(r.datos.error, 'error'); return; }
      avisar('Estudiante eliminado.', 'ok');
      cargarLista();
    }

    function verQR(e) {
      const url = '/api/estudiantes/' + e.id + '/qr';
      el('tituloQR').textContent = 'Código QR de ' + e.nombre;
      el('imgQR').src = url;
      el('imgQR').alt = 'Código QR de ' + e.nombre;
      el('descargarQR').href = url;
      el('descargarQR').download = 'qr-' + e.documento.replace(/[^\w-]/g, '_') + '.png';
      el('dlgQR').showModal();
    }
    el('btnCerrarQR').addEventListener('click', () => el('dlgQR').close());


    cargarModelos();
    verificarSesion().then(cargarLista);
