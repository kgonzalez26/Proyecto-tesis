const pool = require('../config/db');
const { registrarLog } = require('../utils/registrarLog');

const listar = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Venta ORDER BY Fecha_Venta DESC');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al listar ventas:', error);
        res.status(500).json({ error: 'Error interno al listar ventas.' });
    }
};

const margenes = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT vmr.*, c.Tasa_Cambio_Usada
            FROM Vista_Margen_Real vmr
            JOIN Unidad_Importada u ON u.VIN_Unidad = vmr.VIN_Unidad
            JOIN Cotizacion c ON c.COTIZACION_ID = u.COTIZACION_ID
            ORDER BY vmr.Fecha_Venta DESC
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener márgenes:', error);
        res.status(500).json({ error: 'Error interno al obtener márgenes.' });
    }
};

// Registrar una venta no cambia el estado logístico de entrega.
const crear = async (req, res) => {
    const conexion = await pool.getConnection();
    try {
        const { vin_unidad, cotizacion_id, precio_venta_real_usd, fecha_venta } = req.body;
        const precio = Number(precio_venta_real_usd);

        if (!vin_unidad || !Number.isFinite(precio) || precio <= 0) {
            conexion.release();
            return res.status(400).json({ error: 'Indica el vehículo y un precio final de venta mayor a cero.' });
        }

        await conexion.beginTransaction();

        const [unidad] = await conexion.query(
            'SELECT VIN_Unidad, Cliente_ID, COTIZACION_ID FROM Unidad_Importada WHERE VIN_Unidad = ? AND Activo = 1 FOR UPDATE',
            [vin_unidad]
        );
        if (unidad.length === 0) {
            await conexion.rollback(); conexion.release();
            return res.status(404).json({ error: 'Vehículo no encontrado.' });
        }

        const cotId = cotizacion_id || unidad[0].COTIZACION_ID;
        if (!cotId) {
            await conexion.rollback(); conexion.release();
            return res.status(400).json({ error: 'Falta la cotización de referencia: el margen real se calcula contra su costo.' });
        }

        const [cot] = await conexion.query('SELECT Cliente_ID, Estado FROM Cotizacion WHERE COTIZACION_ID = ?', [cotId]);
        if (cot.length === 0) {
            await conexion.rollback(); conexion.release();
            return res.status(404).json({ error: 'Cotización no encontrada.' });
        }
        if (!['Aprobada', 'Enviada'].includes(cot[0].Estado)) {
            await conexion.rollback(); conexion.release();
            return res.status(409).json({ error: 'Solo una cotización Aprobada o Enviada puede servir de referencia.' });
        }
        if (cot[0].Cliente_ID && unidad[0].Cliente_ID && cot[0].Cliente_ID !== unidad[0].Cliente_ID) {
            await conexion.rollback(); conexion.release();
            return res.status(409).json({ error: 'La cotización y el vehículo pertenecen a clientes distintos.' });
        }

        await conexion.query('UPDATE Unidad_Importada SET COTIZACION_ID = ? WHERE VIN_Unidad = ?', [cotId, vin_unidad]);

        const clienteVenta = unidad[0].Cliente_ID || cot[0].Cliente_ID || null;
        const [existente] = await conexion.query('SELECT VENTA_ID FROM Venta WHERE VIN_Unidad = ?', [vin_unidad]);
        if (existente.length > 0) {
            await conexion.query(
                `UPDATE Venta SET Precio_Venta_Real_USD = ?, Cliente_ID = ?, USER_ID_Vendedor = ?,
                        Fecha_Venta = COALESCE(?, Fecha_Venta)
                 WHERE VIN_Unidad = ?`,
                [precio, clienteVenta, req.usuario.id, fecha_venta || null, vin_unidad]
            );
        } else {
            await conexion.query(
                `INSERT INTO Venta (VIN_Unidad, Cliente_ID, Precio_Venta_Real_USD, Fecha_Venta, USER_ID_Vendedor)
                 VALUES (?, ?, ?, COALESCE(?, CURDATE()), ?)`,
                [vin_unidad, clienteVenta, precio, fecha_venta || null, req.usuario.id]
            );
        }

        await conexion.commit();

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'registrar_venta', entidad_tipo: 'Vehiculo', entidad_id: vin_unidad,
            descripcion: `Registró el precio final de venta del vehículo ${vin_unidad}: $${precio} (cotización #${cotId})`, req
        });

        res.status(201).json({ mensaje: 'Precio final de venta registrado.' });
    } catch (error) {
        await conexion.rollback();
        console.error('Error al registrar venta:', error);
        res.status(500).json({ error: 'Error interno al registrar la venta.' });
    } finally {
        conexion.release();
    }
};

module.exports = { listar, margenes, crear };
