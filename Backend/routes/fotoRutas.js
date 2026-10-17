const express = require('express');
const router = express.Router();
const fotoCtrl = require('../controllers/fotoCtrl');
const upload = require('../config/multerConfig');
const { verificarToken, autorizarRoles } = require('../middleware/authMiddleware');

const OPERATIVO = ['Administrador', 'Tramitador'];

router.get('/:vin', verificarToken, autorizarRoles(...OPERATIVO), fotoCtrl.listar);

router.post('/:vin', verificarToken, autorizarRoles(...OPERATIVO), upload.array('fotos', 20), fotoCtrl.subir);

router.delete('/:foto_id', verificarToken, autorizarRoles(...OPERATIVO), fotoCtrl.eliminar);

module.exports = router;
