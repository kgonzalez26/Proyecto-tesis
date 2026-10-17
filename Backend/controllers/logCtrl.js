const pool = require('../config/db');
const { registrarLog } = require('../utils/registrarLog');

const listar = async (req, res) => {
    try {
        const { usuario_id, accion, desde, hasta, limite } = req.query;
        const condiciones = [];
        const valores = [];

        if (usuario_id) { condiciones.push('USER_ID = ?'); valores.push(usuario_id); }
        if (accion) { condiciones.push('Accion = ?'); valores.push(accion); }
        if (desde) { condiciones.push('Fecha >= ?'); valores.push(`${desde} 00:00:00`); }
        if (hasta) { condiciones.push('Fecha <= ?'); valores.push(`${hasta} 23:59:59`); }

        const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
        const lim = Math.min(parseInt(limite) || 100, 500);

        const [rows] = await pool.query(
            `SELECT * FROM Log_Actividad ${where} ORDER BY Fecha DESC LIMIT ${lim}`,
            valores
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al listar logs:', error);
        res.status(500).json({ error: 'Error interno al listar la bitácora.' });
    }
};

const registrarExportacion = async (req, res) => {
    await registrarLog(pool, {
        usuario: req.usuario,
        accion: 'exportar_reporte',
        entidad_tipo: 'Reporte',
        descripcion: `Exportó/imprimió el reporte: ${req.body.reporte || 'sin especificar'}`,
        req
    });
    res.status(200).json({ mensaje: 'Registrado.' });
};

module.exports = { listar, registrarExportacion };
