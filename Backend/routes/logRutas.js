const express = require('express');
const router = express.Router();
const logCtrl = require('../controllers/logCtrl');
const { verificarToken, autorizarRoles } = require('../middleware/authMiddleware');

router.get('/', verificarToken, autorizarRoles('Administrador'), logCtrl.listar);

router.post('/exportacion', verificarToken, logCtrl.registrarExportacion);

module.exports = router;
