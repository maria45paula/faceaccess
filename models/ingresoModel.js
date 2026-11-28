const db = require('../config/database');

async function listarRostrosActivos() {
  const [filas] = await db.query(
    `SELECT e.id, e.nombre, r.descriptor
     FROM rostros r JOIN estudiantes e ON e.id = r.estudiante_id
     WHERE r.descriptor IS NOT NULL AND e.activo = TRUE`
  );
  return filas;
}

async function buscarPorQR(codigo) {
  const [filas] = await db.query(
    'SELECT id, nombre FROM estudiantes WHERE codigo_qr = ? AND activo = TRUE',
    [codigo]
  );
  return filas[0] || null;
}

async function buscarPorDocumento(documento) {
  const [filas] = await db.query(
    'SELECT id, nombre FROM estudiantes WHERE documento = ? AND activo = TRUE',
    [documento]
  );
  return filas[0] || null;
}

async function guardarIntento(estudianteId, metodo, resultado) {
  await db.query(
    'INSERT INTO ingresos (estudiante_id, metodo, resultado) VALUES (?, ?, ?)',
    [estudianteId, metodo, resultado]
  );
}

module.exports = { listarRostrosActivos, buscarPorQR, buscarPorDocumento, guardarIntento };
