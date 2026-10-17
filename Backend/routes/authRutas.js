const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authCtrl = require('../controllers/authCtrl');
const { verificarToken, autorizarRoles } = require('../middleware/authMiddleware');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de inicio de sesión. Intente de nuevo en unos minutos.' }
});

const registroLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados registros desde esta conexión. Intenta de nuevo más tarde.' }
});

router.post('/login', loginLimiter, authCtrl.login);
router.post('/register', registroLimiter, authCtrl.register);
router.post('/logout', authCtrl.logout);
router.get('/me', verificarToken, authCtrl.me);

router.post('/empleados', verificarToken, autorizarRoles('Administrador'), authCtrl.registrarEmpleado);

module.exports = router;
