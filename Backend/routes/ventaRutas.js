const express = require('express');
const router = express.Router();
const ventaCtrl = require('../controllers/ventaCtrl');
const { verificarToken, autorizarRoles } = require('../middleware/authMiddleware');

router.get('/margenes', verificarToken, autorizarRoles('Administrador'), ventaCtrl.margenes);

router.get('/', verificarToken, autorizarRoles('Administrador', 'Finanzas'), ventaCtrl.listar);
router.post('/', verificarToken, autorizarRoles('Administrador', 'Finanzas'), ventaCtrl.crear);

module.exports = router;
