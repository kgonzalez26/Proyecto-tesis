const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/clientePortalCtrl');
const { verificarToken } = require('../middleware/authMiddleware');

router.get('/vehiculos', verificarToken, ctrl.misVehiculos);
router.get('/vehiculos/:vin', verificarToken, ctrl.miVehiculo);
router.get('/vehiculos/:vin/historial', verificarToken, ctrl.miHistorial);
router.get('/vehiculos/:vin/documentos', verificarToken, ctrl.misDocumentos);

const limiteCotizaciones = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Guardaste muchas cotizaciones seguidas. Intenta de nuevo en un rato.' }
});

router.get('/cotizaciones', verificarToken, ctrl.misCotizaciones);
router.post('/cotizaciones', verificarToken, limiteCotizaciones, ctrl.crearCotizacion);

module.exports = router;
