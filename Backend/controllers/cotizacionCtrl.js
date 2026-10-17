const pool = require('../config/db');
const { registrarLog } = require('../utils/registrarLog');

const listar = async (req, res) => {
    try {
        const { estado, cliente_id } = req.query;
        const condiciones = [];
        const valores = [];

        if (estado) { condiciones.push('Estado = ?'); valores.push(estado); }
        if (cliente_id) { condiciones.push('Cliente_ID = ?'); valores.push(cliente_id); }

        const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
        const [rows] = await pool.query(
            `SELECT * FROM Cotizacion ${where} ORDER BY Fecha_Creacion DESC`,
            valores
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al listar cotizaciones:', error);
        res.status(500).json({ error: 'Error interno al listar cotizaciones.' });
    }
};

const obtenerPorId = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Cotizacion WHERE COTIZACION_ID = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Cotización no encontrada.' });

        const [venta] = await pool.query(`
            SELECT u.VIN_Unidad, u.Marca, u.Modelo, u.Anio, v.Precio_Venta_Real_USD, v.Fecha_Venta
            FROM Unidad_Importada u JOIN Venta v ON v.VIN_Unidad = u.VIN_Unidad
            WHERE u.COTIZACION_ID = ? LIMIT 1
        `, [req.params.id]);

        res.status(200).json({ ...rows[0], venta: venta[0] || null });
    } catch (error) {
        console.error('Error al obtener cotización:', error);
        res.status(500).json({ error: 'Error interno al obtener cotización.' });
    }
};

const crear = async (req, res) => {
    try {
        const {
            cliente_id, marca, modelo, anio, cilindrada_cc,
            precio_origen_usd, flete_usd, seguro_usd, otros_gastos_estimados_usd, tasa_cambio_usada,
            valor_cif_usd, dai_usd, iva_usd, iprima_usd, costo_total_usd,
            precio_venta_propuesto_usd, margen_bruto_usd, margen_porcentaje,
            basado_en_referencia_vin
        } = req.body;

        if (!marca || !modelo || !anio || valor_cif_usd == null || costo_total_usd == null) {
            return res.status(400).json({ error: 'Faltan campos obligatorios del vehículo o del cálculo.' });
        }

        const [resultado] = await pool.query(
            `INSERT INTO Cotizacion (
                Cliente_ID, Marca, Modelo, Anio, Cilindrada_CC,
                Precio_Origen_USD, Flete_USD, Seguro_USD, Otros_Gastos_Estimados_USD, Tasa_Cambio_Usada,
                Valor_CIF_USD, DAI_USD, IVA_USD, IPRIMA_USD, Costo_Total_USD,
                Precio_Venta_Propuesto_USD, Margen_Bruto_USD, Margen_Porcentaje,
                Basado_En_Referencia_VIN, Estado, USER_ID_Creador
            ) VALUES (?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?, ?,?,?, ?, 'Pendiente_Validacion', ?)`,
            [
                cliente_id || null, marca, modelo, anio, cilindrada_cc || null,
                precio_origen_usd, flete_usd, seguro_usd, otros_gastos_estimados_usd || 0, tasa_cambio_usada,
                valor_cif_usd, dai_usd || 0, iva_usd || 0, iprima_usd || 0, costo_total_usd,
                precio_venta_propuesto_usd || null, margen_bruto_usd || null, margen_porcentaje || null,
                basado_en_referencia_vin || null, req.usuario.id
            ]
        );

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'crear_cotizacion', entidad_tipo: 'Cotizacion', entidad_id: resultado.insertId,
            descripcion: `Creó cotización para ${marca} ${modelo} (${anio})`, req
        });

        res.status(201).json({ mensaje: 'Cotización creada, pendiente de validación.', cotizacion_id: resultado.insertId });
    } catch (error) {
        console.error('Error al crear cotización:', error);
        res.status(500).json({ error: 'Error interno al crear cotización.' });
    }
};

const validar = async (req, res) => {
    try {
        const [resultado] = await pool.query(
            `UPDATE Cotizacion SET Estado = 'Aprobada', USER_ID_Validador = ?, Fecha_Validacion = NOW()
             WHERE COTIZACION_ID = ? AND Estado = 'Pendiente_Validacion'`,
            [req.usuario.id, req.params.id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(409).json({ error: 'La cotización no existe o no está en estado Pendiente_Validacion.' });
        }
        await registrarLog(pool, {
            usuario: req.usuario, accion: 'validar_cotizacion', entidad_tipo: 'Cotizacion', entidad_id: req.params.id,
            descripcion: `Aprobó la cotización #${req.params.id}`, req
        });

        res.status(200).json({ mensaje: 'Cotización aprobada.' });
    } catch (error) {
        console.error('Error al validar cotización:', error);
        res.status(500).json({ error: 'Error interno al validar cotización.' });
    }
};

const rechazar = async (req, res) => {
    try {
        const [resultado] = await pool.query(
            `UPDATE Cotizacion SET Estado = 'Rechazada', USER_ID_Validador = ?, Fecha_Validacion = NOW()
             WHERE COTIZACION_ID = ? AND Estado = 'Pendiente_Validacion'`,
            [req.usuario.id, req.params.id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(409).json({ error: 'La cotización no existe o no está en estado Pendiente_Validacion.' });
        }
        await registrarLog(pool, {
            usuario: req.usuario, accion: 'rechazar_cotizacion', entidad_tipo: 'Cotizacion', entidad_id: req.params.id,
            descripcion: `Rechazó la cotización #${req.params.id}`, req
        });

        res.status(200).json({ mensaje: 'Cotización rechazada.' });
    } catch (error) {
        console.error('Error al rechazar cotización:', error);
        res.status(500).json({ error: 'Error interno al rechazar cotización.' });
    }
};

const similares = async (req, res) => {
    try {
        const { marca, modelo, anio, rango_anio } = req.query;
        if (!marca || !modelo) {
            return res.status(400).json({ error: 'marca y modelo son requeridos.' });
        }
        const margenAnio = parseInt(rango_anio) || 2;
        const anioBase = parseInt(anio) || new Date().getFullYear();

        const [rows] = await pool.query(
            `SELECT u.VIN_Unidad, u.Marca, u.Modelo, u.Anio, u.Cilindrada_CC,
                    c.Costo_Total_USD AS Costo_Total_Importacion, v.Precio_Venta_Real_USD, v.Fecha_Venta,
                    (v.Precio_Venta_Real_USD - c.Costo_Total_USD) AS Margen_Real_USD
             FROM Unidad_Importada u
             JOIN Cotizacion c ON c.COTIZACION_ID = u.COTIZACION_ID
             JOIN Venta v ON v.VIN_Unidad = u.VIN_Unidad
             WHERE u.Marca = ? AND u.Modelo = ? AND u.Anio BETWEEN ? AND ?
             ORDER BY v.Fecha_Venta DESC
             LIMIT 10`,
            [marca, modelo, anioBase - margenAnio, anioBase + margenAnio]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al buscar cotizaciones similares:', error);
        res.status(500).json({ error: 'Error interno al buscar similares.' });
    }
};

const atender = async (req, res) => {
    try {
        const [resultado] = await pool.query(
            `UPDATE Cotizacion SET Estado = 'Atendida', USER_ID_Validador = ?, Fecha_Validacion = NOW()
             WHERE COTIZACION_ID = ? AND Estado = 'Solicitada'`,
            [req.usuario.id, req.params.id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(409).json({ error: 'La solicitud no existe o ya fue atendida.' });
        }
        await registrarLog(pool, {
            usuario: req.usuario, accion: 'atender_solicitud', entidad_tipo: 'Cotizacion', entidad_id: req.params.id,
            descripcion: `Marcó como atendida la solicitud de cliente #${req.params.id}`, req
        });
        res.status(200).json({ mensaje: 'Solicitud marcada como atendida.' });
    } catch (error) {
        console.error('Error al atender solicitud:', error);
        res.status(500).json({ error: 'Error interno al atender la solicitud.' });
    }
};

module.exports = { listar, obtenerPorId, crear, validar, rechazar, similares, atender };
