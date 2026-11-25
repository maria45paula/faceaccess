
/** Deja pasar solo a quien ya inicio sesion.
 * @param {import('express').Request} req peticion (aqui revisa req.session.usuario)
 * @param {import('express').Response} res respuesta (401 si no hay sesión)
 * @param {function} next continua con la siguiente función de la ruta 
 */
function requireLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({ error: 'Debe iniciar sesión' });
  }
  next();
}

/**
 * Deja pasar solo al rol administrador. Debe ir despues de requireLogin.
 * @param {import('express').Request} req petición con la sesión de usuario
 * @param {import('express').Response} res respuesta (403 si no es administrador)
 * @param {function} next continua con la siguiente función de la ruta 
 */
function requireAdmin(req, res, next) {
  if (req.session.usuario.rol !== 'administrador') {
    return res.status(403).json({ error: 'No tiene permisos para esta acción' });
  }
  next();
}

module.exports = { requireLogin, requireAdmin };
