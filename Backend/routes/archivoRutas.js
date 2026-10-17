const express = require('express');
const router = express.Router();
const archivoCtrl = require('../controllers/archivoCtrl');
const { verificarToken } = require('../middleware/authMiddleware');

router.get('/documento/:id', verificarToken, archivoCtrl.documento);
router.get('/foto/:id', verificarToken, archivoCtrl.foto);

module.exports = router;
