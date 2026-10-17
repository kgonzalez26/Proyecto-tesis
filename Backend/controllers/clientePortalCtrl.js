const pool = require('../config/db');
const { registrarLog } = require('../utils/registrarLog');
const { calcularEstimacionCliente } = require('../utils/calculos');
const { asegurarPerfilCliente } = require('../utils/perfilCliente');

async function obtenerClienteIdDeUsuario(userId) {
    const [rows] = await pool.query('SELECT CLIENTE_ID FROM Cliente WHERE USER_ID = ? AND Activo = 1', [userId]);
    return rows.length > 0 ? rows[0].CLIENTE_ID : null;
}

const misVehiculos = async (req, res) => {
    try {
        const clienteId = await obtenerClienteIdDeUsuario(req.usuario.id);
        if (!clienteId) {
            return res.status(404).json({ error: 'Esta cuenta no tiene un perfil de cliente asociado. Contacta a la importadora.' });
        }

        const [rows] = await pool.query(`
            SELECT u.VIN_Unidad, u.Marca, u.Modelo, u.Anio,
                   cel.Nombre_Estado AS Estado_Actual, cel.Orden_Secuencia
            FROM Unidad_Importada u
            JOIN Catalogo_Estado_Logistico cel ON cel.ESTADO_ID = u.Estado_Actual_ID
            WHERE u.Cliente_ID = ? AND u.Activo = 1
            ORDER BY u.Fecha_Compra DESC
        `, [clienteId]);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al listar mis vehículos:', error);
        res.status(500).json({ error: 'Error interno al consultar tus vehículos.' });
    }
};

async function verificarPropiedad(userId, vin) {
    const clienteId = await obtenerClienteIdDeUsuario(userId);
    if (!clienteId) return { ok: false, motivo: 'sin_perfil' };

    const [rows] = await pool.query(`
        SELECT u.VIN_Unidad, u.Marca, u.Modelo, u.Anio,
               cel.Nombre_Estado AS Estado_Actual, cel.Orden_Secuencia,
               ea.EXP_ID,
               (SELECT MAX(h.Fecha_Cambio) FROM Historial_Estado_Logistico h WHERE h.VIN_Unidad = u.VIN_Unidad) AS Fecha_Ultimo_Cambio
        FROM Unidad_Importada u
        JOIN Catalogo_Estado_Logistico cel ON cel.ESTADO_ID = u.Estado_Actual_ID
        LEFT JOIN Expediente_Aduanero ea ON ea.VIN_Unidad = u.VIN_Unidad AND ea.Activo = 1
        WHERE u.VIN_Unidad = ? AND u.Cliente_ID = ? AND u.Activo = 1
    `, [vin, clienteId]);

    if (rows.length === 0) return { ok: false, motivo: 'no_encontrado' };
    return { ok: true, vehiculo: rows[0] };
}

const miVehiculo = async (req, res) => {
    try {
        const resultado = await verificarPropiedad(req.usuario.id, req.params.vin);
        if (!resultado.ok) {
            return res.status(404).json({ error: 'Vehículo no encontrado en tu cuenta.' });
        }
        res.status(200).json(resultado.vehiculo);
    } catch (error) {
        console.error('Error al obtener mi vehículo:', error);
        res.status(500).json({ error: 'Error interno.' });
    }
};

const miHistorial = async (req, res) => {
    try {
        const resultado = await verificarPropiedad(req.usuario.id, req.params.vin);
        if (!resultado.ok) {
            return res.status(404).json({ error: 'Vehículo no encontrado en tu cuenta.' });
        }

        const [rows] = await pool.query(`
            SELECT cel.Nombre_Estado, cel.Orden_Secuencia, h.Fecha_Cambio
            FROM Historial_Estado_Logistico h
            JOIN Catalogo_Estado_Logistico cel ON cel.ESTADO_ID = h.ESTADO_ID
            WHERE h.VIN_Unidad = ? AND cel.Visible_Cliente = 1
            ORDER BY h.Fecha_Cambio ASC
        `, [req.params.vin]);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener mi historial:', error);
        res.status(500).json({ error: 'Error interno.' });
    }
};

const misDocumentos = async (req, res) => {
    try {
        const resultado = await verificarPropiedad(req.usuario.id, req.params.vin);
        if (!resultado.ok) {
            return res.status(404).json({ error: 'Vehículo no encontrado en tu cuenta.' });
        }
        if (!resultado.vehiculo.EXP_ID) {
            return res.status(200).json([]);
        }

        const [rows] = await pool.query(`
            SELECT crd.Nombre_Requisito, er.Estado,
                   d.DOC_ID, d.Fecha_Carga
            FROM Catalogo_Requisito_Documental crd
            LEFT JOIN Expediente_Requisito er ON er.REQ_ID = crd.REQ_ID AND er.EXP_ID = ?
            LEFT JOIN Documentos d ON d.EXP_ID = er.EXP_ID AND d.REQ_ID = er.REQ_ID AND d.Activo = 1
            ORDER BY crd.Nombre_Requisito
        `, [resultado.vehiculo.EXP_ID]);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener mis documentos:', error);
        res.status(500).json({ error: 'Error interno.' });
    }
};


// El servidor recalcula la estimación; no confía en totales enviados por el cliente.
const crearCotizacion = async (req, res) => {
    try {
        const resultado = calcularEstimacionCliente(req.body || {});
        if (resultado.error) return res.status(400).json({ error: resultado.error });
        const d = resultado.datos;

        const perfil = await asegurarPerfilCliente(
            pool, { userId: req.usuario.id, nombre: req.usuario.nombre, email: req.usuario.email }
        );
        if (!perfil.clienteId) {
            return res.status(409).json({
                error: 'Tu correo ya figura como cliente de la importadora, pero tu cuenta aún no está vinculada a ese registro. Pide que la vinculen para poder guardar cotizaciones.'
            });
        }
        const clienteId = perfil.clienteId;

        const [ins] = await pool.query(
            `INSERT INTO Cotizacion (
                Cliente_ID, Marca, Modelo, Anio, Cilindrada_CC,
                Precio_Origen_USD, Flete_USD, Seguro_USD, Otros_Gastos_Estimados_USD, Tasa_Cambio_Usada,
                Valor_CIF_USD, DAI_USD, IVA_USD, IPRIMA_USD, Costo_Total_USD,
                Estado, Origen, USER_ID_Creador
             ) VALUES (?,?,?,?,?, ?,?,?,0,?, ?,?,?,?,?, 'Solicitada','Cliente',?)`,
            [clienteId, d.marca, d.modelo, d.anio, d.cilindrada_cc,
             d.precio_origen_usd, d.flete_usd, d.seguro_usd, d.tasa_cambio_usada,
             d.valor_cif_usd, d.dai_usd, d.iva_usd, d.iprima_usd, d.costo_total_usd, req.usuario.id]
        );

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'cotizacion_cliente', entidad_tipo: 'Cotizacion', entidad_id: ins.insertId,
            descripcion: `El cliente guardó una estimación de ${d.marca} ${d.modelo} (${d.anio})`, req
        });

        res.status(201).json({ mensaje: 'Cotización guardada.', cotizacion_id: ins.insertId, ...d });
    } catch (error) {
        console.error('Error al guardar cotización del cliente:', error);
        res.status(500).json({ error: 'Error interno al guardar la cotización.' });
    }
};

const misCotizaciones = async (req, res) => {
    try {
        const clienteId = await obtenerClienteIdDeUsuario(req.usuario.id);
        if (!clienteId) return res.status(200).json([]);

        const [rows] = await pool.query(`
            SELECT COTIZACION_ID, Marca, Modelo, Anio, Valor_CIF_USD,
                   (DAI_USD + IVA_USD + IPRIMA_USD) AS Impuestos_USD,
                   Costo_Total_USD, Tasa_Cambio_Usada, Estado, Fecha_Creacion
            FROM Cotizacion
            WHERE Cliente_ID = ? AND Origen = 'Cliente'
            ORDER BY Fecha_Creacion DESC
            LIMIT 100
        `, [clienteId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al listar mis cotizaciones:', error);
        res.status(500).json({ error: 'Error interno al consultar tus cotizaciones.' });
    }
};

module.exports = { misVehiculos, miVehiculo, miHistorial, misDocumentos, crearCotizacion, misCotizaciones };
