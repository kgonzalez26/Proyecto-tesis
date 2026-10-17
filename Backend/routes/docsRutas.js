const express = require('express');
const router = express.Router();
const docsCtrl = require('../controllers/docsCtrl');
const upload = require('../config/multerConfig');
const { verificarToken, autorizarRoles } = require('../middleware/authMiddleware');

const OPERATIVO = ['Administrador', 'Tramitador'];

router.get('/:exp_id', verificarToken, autorizarRoles(...OPERATIVO), docsCtrl.listarPorExpediente);

router.post(
    '/upload',
    verificarToken,
    autorizarRoles(...OPERATIVO),
    upload.single('archivoFisico'),
    docsCtrl.upload
);

module.exports = router;
