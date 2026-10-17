const express = require('express');
const router = express.Router();
const vehiculoCtrl = require('../controllers/vehiculoCtrl');
const { verificarToken, autorizarRoles } = require('../middleware/authMiddleware');

router.get('/', verificarToken, autorizarRoles('Administrador', 'Tramitador', 'Finanzas'), vehiculoCtrl.listar);
router.get('/:vin', verificarToken, autorizarRoles('Administrador', 'Tramitador', 'Finanzas'), vehiculoCtrl.obtenerPorId);

router.post('/', verificarToken, autorizarRoles('Administrador', 'Tramitador'), vehiculoCtrl.crear);
router.put('/:vin', verificarToken, autorizarRoles('Administrador', 'Tramitador'), vehiculoCtrl.actualizar);

module.exports = router;
