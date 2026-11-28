const router = require('express').Router();
const authController = require('../controllers/authController');

router.post('/login', authController.iniciarSesion);
router.post('/logout', authController.cerrarSesion);
router.get('/me', authController.obtenerSesion);

module.exports = router;
