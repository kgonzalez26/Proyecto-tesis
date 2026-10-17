const express = require('express');
const router = express.Router();
const logisticaCtrl = require('../controllers/logisticaCtrl');
const { verificarToken, autorizarRoles } = require('../middleware/authMiddleware');

const OPERATIVO = ['Administrador', 'Tramitador', 'Mecánico'];

router.get('/', verificarToken, autorizarRoles(...OPERATIVO), logisticaCtrl.listar);
router.get('/:vin', verificarToken, autorizarRoles(...OPERATIVO), logisticaCtrl.estadoActual);
router.get('/:vin/historial', verificarToken, autorizarRoles(...OPERATIVO), logisticaCtrl.historial);

router.post('/:vin/estado', verificarToken, autorizarRoles(...OPERATIVO), logisticaCtrl.cambiarEstado);

module.exports = router;
