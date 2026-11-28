
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

/**Ruta para iniciar sesiòn.
 * Recibe el usuario y la contraseña, verifica que sean correctos
 * y guarda los datos del usuario de sesiòn.
 * 
 * @param {string} req.body.usuario usuario ingresao
 * @param {string} req.body.contraseña contraseña ingresada
 */
router.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body || {};

  /**
   * Verifica que se hayan ingreado el usuario y la contraseña.
   * Si falta alguno, devuelve error 400.
   */
  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Complete usuario y contraseña' });
  }

  /** Busca el usuario activo en la base de datos y compara 
   * la contraseña ingreada con la contraseña guardada.
   * 
   * Si ocurre algùn eror durante la consulta, lo captura
   * y devuelve un eror 500
   */
  try {
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE usuario = ? AND activo = TRUE', [usuario]);
    const u = rows[0];
    
    /**
     * Comprueba que el usuario existe y que la contrsañea
     * coincida con la guardada en la base de datos
     */
    if (!u || !bcrypt.compareSync(contrasena, u.contrasena_hash)) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    /**
     * Guarda los datos del usuario en la sesiòn para 
     * mantener el inicio de sesiòn 
     */
    req.session.usuario = { id: u.id, nombre: u.nombre, rol: u.rol };
    
    /**
     * Devuelve una respuesta indicada que el inicio
     * de sesiòn exitoso.
     */
    res.json({ ok: true, nombre: u.nombre, rol: u.rol });
  } catch (e) {
    /**
     * captura los errores que puedan ocurrir a l consultar
     * la base de datos o realizar el inicio de sesiòn */

    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});
/**
 * cierra la sesión de usuario y elimina los datos
 * que estaban guardadosen ella 
 * 
 * @return {object} confirma que la sesiòn fu cerrada */
router.post('/logout', function (req, res) {

  /**
   * Elimina la sesiòn actual y devuelve una respuesta
   * cuando termina el proceso
   */
  req.session.destroy(function () {
    res.json({ ok: true });
  });
});
/**
 * Consulta los dtaos del usuario que tiene la sesiòn fallidad
 * 
 * @returns {object} Datos del usuario autenticos 
*/


router.get('/me', function (req, res) {

  /**
   * comprueba si existe un usuario guardado en la sesiòn
   * si no hay una sesion activo, devuelve un error 401
   */
  if (!req.session.usuario) {
    return res.status(401).json({ error: 'Debe iniciar sesión' });
  }

  /**Devuelve los datos del usuario  que inicio sesiòn */
  res.json(req.session.usuario);
});

/** Exporta ese router para que pueda ser utilizada
 * en el archivo principal de la aplicaciòn
 */

module.exports = router;
