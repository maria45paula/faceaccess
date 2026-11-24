const router = require('express').Router();
const db = require('../db');
const { requireLogin, requireAdmin } = require('../middleware/auth');

router.use(requireLogin);
router.use(requireAdmin);

const LIMITE = 500;   // máximo de registros por consulta, para que la página no se ponga lenta

const FECHA = /^\d{4}-\d{2}-\d{2}$/;       // el formato que entrega <input type="date">: 2026-11-19
const METODOS = ['rostro', 'qr', 'documento'];
const RESULTADOS = ['permitido', 'denegado'];

// Un filtro solo cuenta si llegó como texto (así se evitan listas u objetos raros en la URL)
const texto = v => (typeof v === 'string' ? v.trim() : '');
// Además del formato, revisa que el día exista (el 31 de febrero no existe). Se arma la fecha y se compara con lo escrito.
function fechaValida(f) {
  if (!FECHA.test(f)) return false;
  const [anio, mes, dia] = f.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}