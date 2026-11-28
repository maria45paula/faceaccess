const HistorialModel = require('../models/historialModel');

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const METODOS = ['rostro', 'qr', 'documento'];
const RESULTADOS = ['permitido', 'denegado'];
const texto = valor => typeof valor === 'string' ? valor.trim() : '';

function fechaValida(valor) {
  if (!FECHA.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia;
}

async function consultar(req, res) {
  const filtros = {
    desde: texto(req.query.desde),
    hasta: texto(req.query.hasta),
    metodo: texto(req.query.metodo),
    resultado: texto(req.query.resultado),
    estudiante: texto(req.query.estudiante)
  };

  if (filtros.desde && !fechaValida(filtros.desde)) {
    return res.status(400).json({ error: 'La fecha "desde" no es válida' });
  }
  if (filtros.hasta && !fechaValida(filtros.hasta)) {
    return res.status(400).json({ error: 'La fecha "hasta" no es válida' });
  }
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    return res.status(400).json({ error: 'La fecha "desde" no puede ser posterior a la fecha "hasta"' });
  }
  if (filtros.metodo && !METODOS.includes(filtros.metodo)) {
    return res.status(400).json({ error: 'El método no es válido' });
  }
  if (filtros.resultado && !RESULTADOS.includes(filtros.resultado)) {
    return res.status(400).json({ error: 'El resultado no es válido' });
  }

  try {
    res.json(await HistorialModel.consultar(filtros));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

module.exports = { consultar };
