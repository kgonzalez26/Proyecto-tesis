const express = require('express');
const router = express.Router();
const catalogoCtrl = require('../controllers/catalogoCtrl');
const { verificarToken } = require('../middleware/authMiddleware');

router.get('/estados-logisticos', verificarToken, catalogoCtrl.estadosLogisticos);
router.get('/requisitos', verificarToken, catalogoCtrl.requisitosDocumentales);
router.get('/tipos-gasto', verificarToken, catalogoCtrl.tiposGasto);
router.get('/tasas', verificarToken, catalogoCtrl.tasas);

module.exports = router;
