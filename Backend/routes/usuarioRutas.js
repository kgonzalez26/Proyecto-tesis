const express = require('express');
const router = express.Router();
const usuarioCtrl = require('../controllers/usuarioCtrl');

router.get('/', usuarioCtrl.obtenerUsuarios);
router.post('/', usuarioCtrl.crearUsuario);
router.put('/:id', usuarioCtrl.actualizarUsuario);
router.delete('/:id', usuarioCtrl.eliminarUsuario);

module.exports = router;