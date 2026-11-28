const bcrypt = require('bcryptjs');
const AuthModel = require('../models/authModel');

async function iniciarSesion(req, res) {
  const { usuario, contrasena } = req.body || {};
  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Complete usuario y contraseña' });
  }

  try {
    const usuarioEncontrado = await AuthModel.buscarUsuarioActivo(usuario);
    if (!usuarioEncontrado ||
        !bcrypt.compareSync(contrasena, usuarioEncontrado.contrasena_hash)) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    req.session.usuario = {
      id: usuarioEncontrado.id,
      nombre: usuarioEncontrado.nombre,
      rol: usuarioEncontrado.rol
    };
    res.json({
      ok: true,
      nombre: usuarioEncontrado.nombre,
      rol: usuarioEncontrado.rol
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

function cerrarSesion(req, res) {
  req.session.destroy(() => res.json({ ok: true }));
}

function obtenerSesion(req, res) {
  if (!req.session.usuario) {
    return res.status(401).json({ error: 'Debe iniciar sesión' });
  }
  res.json(req.session.usuario);
}

module.exports = { iniciarSesion, cerrarSesion, obtenerSesion };
