const router = require('express').Router();
const db = require('../config/db');
const { requireLogin, requireAdmin } = require('../middleware/auth');

router.use(requireLogin);
router.use(requireAdmin);

const LIMITE = 500;   // máximo de registros por consulta, para que la página no se ponga lenta

const FECHA = /^\d{4}-\d{2}-\d{2}$/;       // el formato que entrega <input type="date">: 2026-11-19
const METODOS = ['rostro', 'qr', 'documento'];
const RESULTADOS = ['permitido', 'denegado'];

// Un filtro solo cuenta si llegó como texto (así se evitan listas u objetos raros en la URL)
function texto(valor) {
  if (typeof valor === 'string') {
    return valor.trim();
  }
  return '';
}
// Además del formato, revisa que el día exista (el 31 de febrero no existe). Se arma la fecha y se compara con lo escrito.
function fechaValida(f) {
  if (!FECHA.test(f)) return false;
  var partes = f.split('-');
  var anio = Number(partes[0]);
  var mes = Number(partes[1]);
  var dia = Number(partes[2]);
  var fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}


router.get('/', async function (req, res) {
  const desde = texto(req.query.desde);
  const hasta = texto(req.query.hasta);
  const metodo = texto(req.query.metodo);
  const resultado = texto(req.query.resultado);
  const estudiante = texto(req.query.estudiante);

  if (desde && !fechaValida(desde)) return res.status(400).json({ error: 'La fecha "desde" no es válida' });
  if (hasta && !fechaValida(hasta)) return res.status(400).json({ error: 'La fecha "hasta" no es válida' });
  if (desde && hasta && desde > hasta) {
    return res.status(400).json({ error: 'La fecha "desde" no puede ser posterior a la fecha "hasta"' });
  }
  if (metodo && METODOS.indexOf(metodo) === -1) return res.status(400).json({ error: 'El método no es válido' });
  if (resultado && RESULTADOS.indexOf(resultado) === -1) return res.status(400).json({ error: 'El resultado no es válido' });

  // Se arma el WHERE solo con los filtros que llegaron. Los valores van como parámetros (?), nunca pegados al SQL.
  const condiciones = [];
  const parametros = [];
  if (desde) { condiciones.push('i.fecha_hora >= ?'); parametros.push(desde + ' 00:00:00'); }
  if (hasta) { condiciones.push('i.fecha_hora <= ?'); parametros.push(hasta + ' 23:59:59'); }   // incluye todo el día "hasta"
  if (metodo) { condiciones.push('i.metodo = ?'); parametros.push(metodo); }
  if (resultado) { condiciones.push('i.resultado = ?'); parametros.push(resultado); }
  if (estudiante) {
    // busca por nombre o por documento; se escapan % y _ para que cuenten como texto normal
    const patron = '%' + estudiante.replace(/[\\%_]/g, '\\$&') + '%';
    condiciones.push('(e.nombre LIKE ? OR e.documento LIKE ?)');
    parametros.push(patron, patron);
  }
  const donde = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';

  try {
    // LEFT JOIN: los intentos denegados no tienen estudiante (estudiante_id es NULL) y igual se muestran.
    // DATE_FORMAT entrega la fecha ya escrita (día/mes/año hora) tal como está guardada en la base.
    const [filas] = await db.query(
      `SELECT i.id, DATE_FORMAT(i.fecha_hora, '%d/%m/%Y %H:%i:%s') AS fecha_hora,
              i.metodo, i.resultado, e.nombre, e.documento
       FROM ingresos i LEFT JOIN estudiantes e ON e.id = i.estudiante_id
       ${donde}
       ORDER BY i.fecha_hora DESC, i.id DESC
       LIMIT ${LIMITE}`, parametros);
    res.json(filas);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
