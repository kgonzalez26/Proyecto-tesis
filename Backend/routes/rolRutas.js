const express = require('express');
const router = express.Router();
const rolCtrl = require('../controllers/rolCtrl');
const { verificarToken, autorizarRoles } = require('../middleware/authMiddleware');

router.get('/', verificarToken, autorizarRoles('Administrador'), rolCtrl.listar);

module.exports = router;
