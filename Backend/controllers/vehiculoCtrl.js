const pool = require('../config/db');

const crearVehiculo = async (req, res) => {
    try {
        const { VIN_Unidad, Marca, Modelo, Anio, Fecha_Compra } = req.body;
        const sql = `INSERT INTO Unidad_Importada (VIN_Unidad, Marca, Modelo, Anio, Fecha_Compra) VALUES (?, ?, ?, ?, ?)`;
        await pool.query(sql, [VIN_Unidad, Marca, Modelo, Anio, Fecha_Compra]);
        
        res.status(201).json({ mensaje: "Vehículo registrado exitosamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al registrar vehículo", detalle: error.message });
    }
};

const obtenerVehiculos = async (req, res) => {
    try {
        const sql = `SELECT * FROM Unidad_Importada WHERE Activo = 1`;
        const [rows] = await pool.query(sql);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener datos" });
    }
};

const actualizarVehiculo = async (req, res) => {
    try {
        const { id } = req.params;
        const { Marca, Modelo, Anio, Fecha_Compra } = req.body;
        
        const sql = `UPDATE Unidad_Importada SET Marca = ?, Modelo = ?, Anio = ?, Fecha_Compra = ? WHERE VIN_Unidad = ?`;
        await pool.query(sql, [Marca, Modelo, Anio, Fecha_Compra, id]);
        
        res.status(200).json({ mensaje: "Datos del vehículo actualizados correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar los datos del vehículo" });
    }
};

const eliminarVehiculo = async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `UPDATE Unidad_Importada SET Activo = 0 WHERE VIN_Unidad = ?`;
        await pool.query(sql, [id]);
        
        res.status(200).json({ mensaje: "Vehículo dado de baja correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar" });
    }
};

module.exports = { crearVehiculo, obtenerVehiculos, actualizarVehiculo, eliminarVehiculo };