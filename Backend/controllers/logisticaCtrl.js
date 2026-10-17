const pool = require('../config/db');
const { registrarLog } = require('../utils/registrarLog');

const listar = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.VIN_Unidad, u.Marca, u.Modelo, u.Anio,
                   cel.Nombre_Estado AS Estado_Actual, cel.Orden_Secuencia,
                   c.Nombre_Completo AS Cliente,
                   (SELECT MAX(h.Fecha_Cambio) FROM Historial_Estado_Logistico h WHERE h.VIN_Unidad = u.VIN_Unidad) AS Fecha_Ultimo_Cambio
            FROM Unidad_Importada u
            JOIN Catalogo_Estado_Logistico cel ON cel.ESTADO_ID = u.Estado_Actual_ID
            LEFT JOIN Cliente c ON c.CLIENTE_ID = u.Cliente_ID
            WHERE u.Activo = 1
            ORDER BY Fecha_Ultimo_Cambio ASC
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al listar tracking:', error);
        res.status(500).json({ error: 'Error interno al listar tracking.' });
    }
};

const estadoActual = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Vista_Estado_Actual_Unidad WHERE VIN_Unidad = ?', [req.params.vin]);
        if (rows.length === 0) return res.status(404).json({ error: 'Unidad no encontrada.' });
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error al obtener estado actual:', error);
        res.status(500).json({ error: 'Error interno al obtener estado actual.' });
    }
};

const historial = async (req, res) => {
    try {
        const roles = req.usuario.roles || [];
        const esSoloCliente = roles.length > 0 && roles.every(r => r === 'Cliente');
        const filtroVisibilidad = esSoloCliente ? 'AND cel.Visible_Cliente = 1' : '';

        const [rows] = await pool.query(
            `SELECT h.HIST_ID, h.Fecha_Cambio, h.Comentario, cel.Nombre_Estado, cel.Orden_Secuencia
             FROM Historial_Estado_Logistico h
             JOIN Catalogo_Estado_Logistico cel ON cel.ESTADO_ID = h.ESTADO_ID
             WHERE h.VIN_Unidad = ? ${filtroVisibilidad}
             ORDER BY h.Fecha_Cambio ASC`,
            [req.params.vin]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener historial logístico:', error);
        res.status(500).json({ error: 'Error interno al obtener historial.' });
    }
};

const cambiarEstado = async (req, res) => {
    const conexion = await pool.getConnection();
    try {
        const { estado_id, comentario } = req.body;
        const { vin } = req.params;
        if (!estado_id) {
            conexion.release();
            return res.status(400).json({ error: 'estado_id es requerido.' });
        }

        await conexion.beginTransaction();

        const [resultado] = await conexion.query(
            'UPDATE Unidad_Importada SET Estado_Actual_ID = ? WHERE VIN_Unidad = ?',
            [estado_id, vin]
        );
        if (resultado.affectedRows === 0) {
            await conexion.rollback();
            conexion.release();
            return res.status(404).json({ error: 'Unidad no encontrada.' });
        }

        await conexion.query(
            'INSERT INTO Historial_Estado_Logistico (VIN_Unidad, ESTADO_ID, Comentario, USER_ID_Registro) VALUES (?,?,?,?)',
            [vin, estado_id, comentario || null, req.usuario.id]
        );

        await conexion.commit();

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'cambiar_estado', entidad_tipo: 'Vehiculo', entidad_id: vin,
            descripcion: `Cambió el estado logístico del vehículo ${vin}${comentario ? ` (${comentario})` : ''}`, req
        });

        res.status(200).json({ mensaje: 'Estado logístico actualizado.' });
    } catch (error) {
        await conexion.rollback();
        console.error('Error al cambiar estado logístico:', error);
        res.status(500).json({ error: 'Error interno al cambiar estado.' });
    } finally {
        conexion.release();
    }
};

module.exports = { listar, estadoActual, historial, cambiarEstado };
