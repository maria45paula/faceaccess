const router = require('express').Router();
const db = require('../db');

// Distancia máxima para aceptar un rostro. Más bajo = más estricto; más alto = deja pasar a más gente.
// 0.6 es el valor típico de face-api; ajústenlo probando con ustedes mismos.
const UMBRAL = 0.6;

// Distancia euclidiana entre dos descriptores de 128 números
function distancia(a, b) {
  let suma = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    suma += d * d;
  }
  return Math.sqrt(suma);
}

function descriptorValido(d) {
  if (!Array.isArray(d) || d.length !== 128) {
    return false;
  }

  for (var i = 0; i < d.length; i++) {
    if (typeof d[i] !== 'number' || !Number.isFinite(d[i])) {
      return false;
    }
  }

  return true;
}

router.post('/verificar', async function (req, res) {
  var datos = req.body || {};
  var descriptor = datos.descriptor;  
  if (!descriptorValido(descriptor)) {
    return res.status(400).json({ error: 'No se recibió un rostro válido' });
  }

  try {
    // Solo estudiantes activos que tengan descriptor guardado
    const [filas] = await db.query(
      `SELECT e.id, e.nombre, r.descriptor
       FROM rostros r JOIN estudiantes e ON e.id = r.estudiante_id
       WHERE r.descriptor IS NOT NULL AND e.activo = TRUE`);

    // Se busca el rostro registrado más parecido
    let mejor = null;
    let mejorDistancia = Infinity;
    for (var i = 0; i < filas.length; i++) {
      var fila = filas[i];
      var guardado;
      try {
        guardado = JSON.parse(fila.descriptor);
      } catch (e) {
        continue;
      }
      if (!descriptorValido(guardado)) {
        continue;
      }
      var distanciaActual = distancia(descriptor, guardado);
      if (distanciaActual < mejorDistancia) {
        mejorDistancia = distanciaActual;
        mejor = fila;
      }
    }

    const permitido = mejor !== null && mejorDistancia < UMBRAL;
    const resultado = permitido ? 'permitido' : 'denegado';
    const estudianteId = permitido ? mejor.id : null;   // NULL si no se reconoció

    // Sirve para ajustar el umbral mientras prueban
    console.log('Verificación:', resultado, '| distancia:', mejorDistancia.toFixed(3));

    // SCRUM-18: guardar el intento (también los denegados)
    try {
      await db.query(
        'INSERT INTO ingresos (estudiante_id, metodo, resultado) VALUES (?, ?, ?)',
        [estudianteId, 'rostro', resultado]);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'No se pudo guardar el intento. Intente de nuevo' });
    }

    res.json({ resultado, nombre: permitido ? mejor.nombre : null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

async function responderIntento(res, estudiante, metodo) {
  const permitido = estudiante !== null;
  const resultado = permitido ? 'permitido' : 'denegado';
  try {
    await db.query(
      'INSERT INTO ingresos (estudiante_id, metodo, resultado) VALUES (?, ?, ?)',
      [permitido ? estudiante.id : null, metodo, resultado]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'No se pudo guardar el intento. Intente de nuevo' });
  }
  res.json({ resultado, nombre: permitido ? estudiante.nombre : null });
}
router.post('/qr', async function (req, res) {
  var datos = req.body || {};
  var codigo = datos.codigo;

  if (typeof codigo !== 'string' || !codigo.trim() || codigo.length > 100) {
    return res.status(400).json({ error: 'No se recibió un código QR válido' });
  }
  try {
    const [filas] = await db.query(
      'SELECT id, nombre FROM estudiantes WHERE codigo_qr = ? AND activo = TRUE', [codigo.trim()]);
    await responderIntento(res, filas[0] || null, 'qr');
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});
  
  
router.post('/documento', async function (req, res) {
  var datos = req.body || {};
  var documento = datos.documento;
  // la columna "documento" es VARCHAR(20)
  if (typeof documento !== 'string' || !documento.trim() || documento.trim().length > 20) {
    return res.status(400).json({ error: 'No se recibió un número de documento válido' });
  }
  try {
    const [filas] = await db.query(
      'SELECT id, nombre FROM estudiantes WHERE documento = ? AND activo = TRUE', [documento.trim()]);
    await responderIntento(res, filas[0] || null, 'documento');
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
