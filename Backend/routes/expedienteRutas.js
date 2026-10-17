const express = require('express');
const router = express.Router();
const expedienteCtrl = require('../controllers/expedienteCtrl');
const { verificarToken, autorizarRoles } = require('../middleware/authMiddleware');

const OPERATIVO = ['Administrador', 'Tramitador'];

router.get('/checklist', verificarToken, autorizarRoles(...OPERATIVO), expedienteCtrl.checklistGlobal);
router.get('/pendientes', verificarToken, autorizarRoles(...OPERATIVO), expedienteCtrl.pendientesGlobal);
router.get('/:vin', verificarToken, autorizarRoles(...OPERATIVO), expedienteCtrl.obtenerPorVin);
router.get('/:exp_id/checklist', verificarToken, autorizarRoles(...OPERATIVO), expedienteCtrl.checklist);

router.put('/:exp_id/datos-aduaneros', verificarToken, autorizarRoles(...OPERATIVO), expedienteCtrl.actualizarDatosAduaneros);
router.patch('/:exp_id/requisitos/:req_id', verificarToken, autorizarRoles(...OPERATIVO), expedienteCtrl.actualizarRequisito);

module.exports = router;
