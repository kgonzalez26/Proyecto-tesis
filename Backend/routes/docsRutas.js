const express = require('express');
const router = express.Router();
const docsCtrl = require('../controllers/docsCtrl');

router.get('/', docsCtrl.obtenerExpedientes);
router.get('/:id', docsCtrl.obtenerArchivosPorExpediente);
router.post('/upload', docsCtrl.upload.single('archivoFisico'), docsCtrl.subirDocumento);

module.exports = router;