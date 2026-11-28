const db = require('../config/database');

async function buscarUsuarioActivo(usuario) {
  const [filas] = await db.query(
    'SELECT * FROM usuarios WHERE usuario = ? AND activo = TRUE',
    [usuario]
  );
  return filas[0] || null;
}

module.exports = { buscarUsuarioActivo };
