const IngresoModel = require('../models/ingresoModel');

const UMBRAL = 0.6;

function descriptorValido(descriptor) {
  return Array.isArray(descriptor) && descriptor.length === 128 &&
    descriptor.every(n => typeof n === 'number' && Number.isFinite(n));
}

function distancia(a, b) {
  let suma = 0;
  for (let i = 0; i < a.length; i++) {
    const diferencia = a[i] - b[i];
    suma += diferencia * diferencia;
  }
  return Math.sqrt(suma);
}

async function registrarIntento(res, estudiante, metodo) {
  const permitido = estudiante !== null;
  const resultado = permitido ? 'permitido' : 'denegado';
  try {
    await IngresoModel.guardarIntento(
      permitido ? estudiante.id : null, metodo, resultado
    );
    res.json({ resultado, nombre: permitido ? estudiante.nombre : null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo guardar el intento. Intente de nuevo' });
  }
}

async function verificarRostro(req, res) {
  const { descriptor } = req.body || {};
  if (!descriptorValido(descriptor)) {
    return res.status(400).json({ error: 'No se recibió un rostro válido' });
  }

  try {
    const estudiantes = await IngresoModel.listarRostrosActivos();
    let mejor = null;
    let mejorDistancia = Infinity;

    for (const estudiante of estudiantes) {
      let descriptorGuardado;
      try {
        descriptorGuardado = JSON.parse(estudiante.descriptor);
      } catch (_) {
        continue;
      }
      if (!descriptorValido(descriptorGuardado)) continue;
      const valor = distancia(descriptor, descriptorGuardado);
      if (valor < mejorDistancia) {
        mejorDistancia = valor;
        mejor = estudiante;
      }
    }

    const reconocido = mejor !== null && mejorDistancia < UMBRAL;
    const estudiante = reconocido ? mejor : null;
    console.log('Verificación:', reconocido ? 'permitido' : 'denegado',
      '| distancia:', mejorDistancia.toFixed(3));
    await registrarIntento(res, estudiante, 'rostro');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function verificarQR(req, res) {
  const { codigo } = req.body || {};
  if (typeof codigo !== 'string' || !codigo.trim() || codigo.length > 100) {
    return res.status(400).json({ error: 'No se recibió un código QR válido' });
  }
  try {
    const estudiante = await IngresoModel.buscarPorQR(codigo.trim());
    await registrarIntento(res, estudiante, 'qr');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function verificarDocumento(req, res) {
  const { documento } = req.body || {};
  if (typeof documento !== 'string' || !documento.trim() ||
      documento.trim().length > 20) {
    return res.status(400).json({ error: 'No se recibió un número de documento válido' });
  }
  try {
    const estudiante = await IngresoModel.buscarPorDocumento(documento.trim());
    await registrarIntento(res, estudiante, 'documento');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

module.exports = { verificarRostro, verificarQR, verificarDocumento };
