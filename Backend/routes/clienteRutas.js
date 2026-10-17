const express = require('express');
const router = express.Router();
const clienteCtrl = require('../controllers/clienteCtrl');
const { verificarToken, autorizarRoles } = require('../middleware/authMiddleware');

const PERSONAL = ['Administrador', 'Tramitador', 'Finanzas'];

router.get('/', verificarToken, autorizarRoles(...PERSONAL), clienteCtrl.listar);
router.get('/:id', verificarToken, autorizarRoles(...PERSONAL), clienteCtrl.obtenerPorId);
router.post('/', verificarToken, autorizarRoles(...PERSONAL), clienteCtrl.crear);
router.put('/:id', verificarToken, autorizarRoles(...PERSONAL), clienteCtrl.actualizar);
router.delete('/:id', verificarToken, autorizarRoles('Administrador'), clienteCtrl.desactivar);

module.exports = router;
