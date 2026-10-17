const express = require('express');
const router = express.Router();
const usuarioCtrl = require('../controllers/usuarioCtrl');
const { verificarToken, autorizarRoles } = require('../middleware/authMiddleware');

router.use(verificarToken, autorizarRoles('Administrador'));

router.get('/', usuarioCtrl.listar);
router.put('/:id', usuarioCtrl.actualizar);
router.patch('/:id/reset-password', usuarioCtrl.resetPassword);
router.patch('/:id/estado', usuarioCtrl.toggleEstado);
router.patch('/:id/cliente', usuarioCtrl.vincularCliente);

module.exports = router;
