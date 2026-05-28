const express = require('express');
const router = express.Router();
const vehiculoCtrl = require('../controllers/vehiculoCtrl');

router.post('/', vehiculoCtrl.crearVehiculo);
router.get('/', vehiculoCtrl.obtenerVehiculos);
router.put('/:id', vehiculoCtrl.actualizarVehiculo);
router.delete('/:id', vehiculoCtrl.eliminarVehiculo);

module.exports = router;