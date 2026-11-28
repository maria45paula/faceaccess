const db = require('../config/db');

async function listar() {
  const [filas] = await db.query(
    `SELECT e.id, e.nombre, e.documento, e.fecha_registro,
            (r.id IS NOT NULL) AS tiene_foto
     FROM estudiantes e
     LEFT JOIN rostros r ON r.estudiante_id = e.id
     ORDER BY e.id DESC`
  );
  return filas;
}

async function obtenerFoto(id) {
  const [filas] = await db.query(
    'SELECT foto_ruta FROM rostros WHERE estudiante_id = ?', [id]
  );
  return filas[0]?.foto_ruta || null;
}

async function obtenerQR(id) {
  const [filas] = await db.query(
    'SELECT codigo_qr FROM estudiantes WHERE id = ?', [id]
  );
  return filas[0]?.codigo_qr || null;
}

async function registrar(datos, guardarFoto) {
  const conexion = await db.getConnection();
  let archivoCreado = null;

  try {
    await conexion.beginTransaction();

    const [resultado] = await conexion.query(
      'INSERT INTO estudiantes (nombre, documento, codigo_qr) VALUES (?, ?, ?)',
      [datos.nombre.trim(), datos.documento.trim(), 'QR-' + datos.documento.trim()]
    );

    const id = resultado.insertId;
    await conexion.query(
      'INSERT INTO autorizaciones (estudiante_id, aceptada) VALUES (?, TRUE)', [id]
    );

    archivoCreado = guardarFoto(id);
    await conexion.query(
      'INSERT INTO rostros (estudiante_id, foto_ruta, descriptor) VALUES (?, ?, ?)',
      [id, archivoCreado.rutaRelativa, JSON.stringify(datos.descriptor)]
    );

    await conexion.commit();
    return id;
  } catch (error) {
    await conexion.rollback();
    error.archivoCreado = archivoCreado;
    throw error;
  } finally {
    conexion.release();
  }
}

async function actualizar(id, nombre, documento) {
  const [resultado] = await db.query(
    'UPDATE estudiantes SET nombre = ?, documento = ? WHERE id = ?',
    [nombre.trim(), documento.trim(), id]
  );
  return resultado.affectedRows;
}

async function eliminar(id) {
  const rutaFoto = await obtenerFoto(id);
  const [resultado] = await db.query('DELETE FROM estudiantes WHERE id = ?', [id]);
  return { eliminados: resultado.affectedRows, rutaFoto };
}

module.exports = { listar, obtenerFoto, obtenerQR, registrar, actualizar, eliminar };
