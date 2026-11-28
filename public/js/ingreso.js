const el = id => document.getElementById(id);
    const video = el('video');
    const btn = el('btnVerificar');
    const btnQR = el('btnQR');
    const btnDoc = el('btnDocumento');
    const inputDoc = el('documento');
    const TIEMPO_MAXIMO_BUSQUEDA = 10000;
    const TIEMPO_MAXIMO_QR = 15000;
    const META_RAPIDEZ = 3000;
    let modelosListos = false;
    let camaraLista = false;
    let ocupado = false;

    const dormir = ms => new Promise(r => setTimeout(r, ms));

    const hayVoz = 'speechSynthesis' in window;
    if (!hayVoz) el('etiquetaVoz').hidden = true;

    function hablar(texto) {
      if (!hayVoz || !el('chkVoz').checked || !texto) return;
      try {
        const sintetizador = window.speechSynthesis;
        if (sintetizador.speaking || sintetizador.pending) sintetizador.cancel();
        const mensaje = new SpeechSynthesisUtterance(texto.replace(/\(a\)|…/g, ''));
        mensaje.lang = 'es-CO';
        const voces = sintetizador.getVoices();
        const voz = voces.find(v => v.lang.replace('_', '-').toLowerCase() === 'es-co') ||
                    voces.find(v => v.lang.toLowerCase().startsWith('es'));
        if (voz) mensaje.voice = voz;
        sintetizador.speak(mensaje);
      } catch (e) {
        console.error('No se pudo reproducir la voz:', e);
      }
    }

    el('chkVoz').addEventListener('change', () => {
      if (!el('chkVoz').checked) window.speechSynthesis.cancel();
      else hablar('Mensajes de voz activados');
    });

    function mostrar(tipo, titulo, detalle) {
      el('resultado').className = 'resultado ' + tipo;
      el('icono').textContent = tipo === 'ok' ? '✔' : tipo === 'error' ? '✘' : '…';
      el('titulo').textContent = titulo;
      el('detalle').textContent = detalle || '';
      hablar(detalle ? titulo + '. ' + detalle : titulo);
    }

    function actualizarBotones() {
      btn.disabled = ocupado || !(modelosListos && camaraLista);
      btnQR.disabled = ocupado || !camaraLista;
      btnDoc.disabled = ocupado;
    }

    async function ejecutar(accion) {
      ocupado = true;
      actualizarBotones();
      try {
        await accion();
      } finally {
        ocupado = false;
        actualizarBotones();
      }
    }

    async function abrirCamara() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        camaraLista = true;
      } catch (e) {
        mostrar('error', 'No se pudo acceder a la cámara',
          'Revise los permisos del navegador. Si no es posible, use el ingreso alternativo.');
      }
    }

    async function cargarModelos() {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        modelosListos = true;
      } catch (e) {
        mostrar('error', 'No se pudo cargar el reconocimiento facial', 'Recargue la página.');
      }
    }

    function mostrarAcceso(datos, textoDenegado) {
      if (datos.resultado === 'permitido') {
        mostrar('ok', 'Acceso permitido', 'Bienvenido(a), ' + datos.nombre);
      } else {
        mostrar('error', 'Acceso denegado', textoDenegado);
      }
    }

    async function enviar(url, cuerpo, textoDenegado) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cuerpo)
        });
        const datos = await resp.json();

        if (!resp.ok) {
          mostrar('error', 'No se pudo completar', datos.error + '. Intente de nuevo.');
          return false;
        }

        mostrarAcceso(datos, textoDenegado);
        return true;
      } catch (e) {
        mostrar('error', 'No se pudo conectar con el servidor', 'Revise la conexión e intente de nuevo.');
        return false;
      }
    }

    async function verificarRostro() {
      el('tiempo').textContent = '';
      mostrar('info', 'Buscando su rostro…', 'Mire a la cámara.');

      const inicioBusqueda = performance.now();
      let deteccion = null;
      let inicioIntento = 0;

      while (performance.now() - inicioBusqueda < TIEMPO_MAXIMO_BUSQUEDA) {
        inicioIntento = performance.now();
        deteccion = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (deteccion) break;
        await dormir(500);
      }

      if (!deteccion) {
        mostrar('error', 'No se detectó su rostro', 'Acérquese o mejore la luz y pulse «Verificar identidad» de nuevo.');
        return;
      }

      mostrar('info', 'Verificando…', '');
      const ok = await enviar('/api/ingreso/verificar',
        { descriptor: Array.from(deteccion.descriptor) },
        'No se reconoció su rostro. Intente de nuevo o use el ingreso alternativo.');

      if (ok) {
        const tiempo = Math.round(performance.now() - inicioIntento);
        console.log('Tiempo de verificación (ms):', tiempo);
        el('tiempo').textContent = 'Tiempo de verificación: ' + tiempo + ' ms' +
          (tiempo > META_RAPIDEZ ? ' (superó la meta de 3 s)' : '');
      }
    }

    async function escanearQR() {
      if (typeof jsQR === 'undefined') {
        mostrar('error', 'No se pudo cargar el lector de QR', 'Recargue la página.');
        return;
      }

      el('tiempo').textContent = '';
      mostrar('info', 'Escaneando código QR…', 'Muestre su código QR frente a la cámara.');

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const inicio = performance.now();
      let codigo = null;

      while (performance.now() - inicio < TIEMPO_MAXIMO_QR) {
        if (video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const imagen = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const lectura = jsQR(imagen.data, imagen.width, imagen.height, { inversionAttempts: 'dontInvert' });
          if (lectura && lectura.data) {
            codigo = lectura.data;
            break;
          }
        }
        await dormir(250);
      }

      if (!codigo) {
        mostrar('error', 'No se detectó ningún código QR', 'Acerque el código a la cámara y pulse «Escanear código QR» de nuevo.');
        return;
      }

      mostrar('info', 'Verificando…', '');
      await enviar('/api/ingreso/qr', { codigo },
        'Código QR no válido. Intente de nuevo o use otro método.');
    }

    async function verificarDocumento() {
      const documento = inputDoc.value.trim();
      if (!documento) {
        mostrar('error', 'Falta el documento', 'Escriba su número de documento y pulse «Ingresar con documento».');
        inputDoc.focus();
        return;
      }

      el('tiempo').textContent = '';
      mostrar('info', 'Verificando…', '');
      await enviar('/api/ingreso/documento', { documento },
        'Documento no registrado. Revise el número e intente de nuevo.');
    }

    btn.addEventListener('click', () => ejecutar(verificarRostro));

    el('formDocumento').addEventListener('submit', e => {
      e.preventDefault();
      ejecutar(verificarDocumento);
    });

    btnQR.addEventListener('click', () => ejecutar(escanearQR));

    mostrar('info', 'Cargando…', 'Preparando la cámara y el reconocimiento facial.');
    actualizarBotones();

    Promise.all([abrirCamara(), cargarModelos()]).then(() => {
      actualizarBotones();
      if (modelosListos && camaraLista) {
        mostrar('info', 'Listo', 'Ubíquese frente a la cámara y pulse «Verificar identidad».');
      }
    });
