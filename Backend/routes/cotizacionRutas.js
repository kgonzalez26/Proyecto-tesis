const express = require('express');
const router = express.Router();
const cotizacionCtrl = require('../controllers/cotizacionCtrl');
const { verificarToken, autorizarRoles } = require('../middleware/authMiddleware');

const FINANZAS = ['Administrador', 'Finanzas'];

router.get('/', verificarToken, autorizarRoles(...FINANZAS), cotizacionCtrl.listar);
router.get('/similares', verificarToken, autorizarRoles(...FINANZAS), cotizacionCtrl.similares);
router.get('/:id', verificarToken, autorizarRoles(...FINANZAS), cotizacionCtrl.obtenerPorId);

router.post('/', verificarToken, autorizarRoles(...FINANZAS), cotizacionCtrl.crear);

router.patch('/:id/validar', verificarToken, autorizarRoles('Administrador'), cotizacionCtrl.validar);
router.patch('/:id/rechazar', verificarToken, autorizarRoles('Administrador'), cotizacionCtrl.rechazar);

router.patch('/:id/atender', verificarToken, autorizarRoles(...FINANZAS), cotizacionCtrl.atender);

module.exports = router;
