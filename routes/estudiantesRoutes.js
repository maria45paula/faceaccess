const router = require('express').Router();
const { requireLogin, requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/estudiantesController');

router.use(requireLogin, requireAdmin);
router.get('/', controller.listar);
router.get('/:id/foto', controller.verFoto);
router.get('/:id/qr', controller.verQR);
router.post('/', controller.registrar);
router.put('/:id', controller.actualizar);
router.delete('/:id', controller.eliminar);

module.exports = router;