const db = require('../config/db');

async function consultar(filtros) {
  const condiciones = [];
  const parametros = [];

  if (filtros.desde) {
    condiciones.push('i.fecha_hora >= ?');
    parametros.push(filtros.desde + ' 00:00:00');
  }
  if (filtros.hasta) {
    condiciones.push('i.fecha_hora <= ?');
    parametros.push(filtros.hasta + ' 23:59:59');
  }
  if (filtros.metodo) {
    condiciones.push('i.metodo = ?');
    parametros.push(filtros.metodo);
  }
  if (filtros.resultado) {
    condiciones.push('i.resultado = ?');
    parametros.push(filtros.resultado);
  }
  if (filtros.estudiante) {
    const patron = '%' + filtros.estudiante.replace(/[\\%_]/g, '\\$&') + '%';
    condiciones.push('(e.nombre LIKE ? OR e.documento LIKE ?)');
    parametros.push(patron, patron);
  }

  const where = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';
  const [filas] = await db.query(
    `SELECT i.id, DATE_FORMAT(i.fecha_hora, '%d/%m/%Y %H:%i:%s') AS fecha_hora,
            i.metodo, i.resultado, e.nombre, e.documento
     FROM ingresos i LEFT JOIN estudiantes e ON e.id = i.estudiante_id
     ${where}
     ORDER BY i.fecha_hora DESC, i.id DESC
     LIMIT 500`,
    parametros
  );
  return filas;
}

module.exports = { consultar };
