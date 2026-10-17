const pool = require('../config/db');
const { registrarLog } = require('../utils/registrarLog');

const obtenerPorVin = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM Expediente_Aduanero WHERE VIN_Unidad = ? AND Activo = 1',
            [req.params.vin]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Expediente no encontrado para este VIN.' });
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error al obtener expediente:', error);
        res.status(500).json({ error: 'Error interno al obtener expediente.' });
    }
};

const actualizarDatosAduaneros = async (req, res) => {
    try {
        const { fecha_llegada, aduana_ingreso, canal_verificacion } = req.body;
        const [resultado] = await pool.query(
            'UPDATE Expediente_Aduanero SET Fecha_Llegada = ?, Aduana_Ingreso = ?, Canal_Verificacion = ? WHERE EXP_ID = ?',
            [fecha_llegada || null, aduana_ingreso || null, canal_verificacion || null, req.params.exp_id]
        );
        if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Expediente no encontrado.' });

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'editar_datos_aduaneros', entidad_tipo: 'Expediente', entidad_id: req.params.exp_id,
            descripcion: `Editó datos aduaneros del expediente #${req.params.exp_id}`, req
        });

        res.status(200).json({ mensaje: 'Datos aduaneros actualizados.' });
    } catch (error) {
        console.error('Error al actualizar datos aduaneros:', error);
        res.status(500).json({ error: 'Error interno al actualizar expediente.' });
    }
};

const checklist = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT crd.REQ_ID, crd.Nombre_Requisito, crd.Obligatorio, crd.Aplica_Vencimiento,
                   er.Estado, er.Fecha_Vencimiento, er.Fecha_Actualizacion,
                   d.DOC_ID, d.Nombre_Archivo, d.Ruta_Archivo_Cloud, d.Fecha_Carga
            FROM Catalogo_Requisito_Documental crd
            LEFT JOIN Expediente_Requisito er ON er.REQ_ID = crd.REQ_ID AND er.EXP_ID = ?
            LEFT JOIN Documentos d ON d.EXP_ID = er.EXP_ID AND d.REQ_ID = er.REQ_ID AND d.Activo = 1
            ORDER BY crd.Nombre_Requisito
        `, [req.params.exp_id]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener checklist:', error);
        res.status(500).json({ error: 'Error interno al obtener checklist.' });
    }
};

const checklistGlobal = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT ea.EXP_ID, ea.VIN_Unidad, u.Marca, u.Modelo,
                   COUNT(er.EXP_REQ_ID) AS Total_Requisitos,
                   SUM(CASE WHEN er.Estado = 'Entregado' THEN 1 ELSE 0 END) AS Requisitos_Entregados
            FROM Expediente_Aduanero ea
            JOIN Unidad_Importada u ON u.VIN_Unidad = ea.VIN_Unidad
            LEFT JOIN Expediente_Requisito er ON er.EXP_ID = ea.EXP_ID
            WHERE ea.Activo = 1
            GROUP BY ea.EXP_ID
            ORDER BY u.Fecha_Compra DESC
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener checklist global:', error);
        res.status(500).json({ error: 'Error interno al obtener checklist global.' });
    }
};

const actualizarRequisito = async (req, res) => {
    try {
        const { estado, fecha_vencimiento } = req.body;
        const estadosValidos = ['Pendiente', 'Entregado', 'Rechazado', 'Vencido'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido.' });
        }

        const [resultado] = await pool.query(
            `UPDATE Expediente_Requisito SET Estado = ?, Fecha_Vencimiento = ?, USER_ID_Validador = ?
             WHERE EXP_ID = ? AND REQ_ID = ?`,
            [estado, fecha_vencimiento || null, req.usuario.id, req.params.exp_id, req.params.req_id]
        );
        if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Requisito no encontrado en este expediente.' });

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'editar_requisito', entidad_tipo: 'Expediente', entidad_id: req.params.exp_id,
            descripcion: `Marcó el requisito #${req.params.req_id} como "${estado}" en el expediente #${req.params.exp_id}`, req
        });

        res.status(200).json({ mensaje: 'Requisito actualizado.' });
    } catch (error) {
        console.error('Error al actualizar requisito:', error);
        res.status(500).json({ error: 'Error interno al actualizar requisito.' });
    }
};

const pendientesGlobal = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT vrp.EXP_ID, vrp.VIN_Unidad, u.Marca, u.Modelo,
                   vrp.Nombre_Requisito, vrp.Estado, vrp.Fecha_Vencimiento
            FROM Vista_Requisitos_Pendientes vrp
            JOIN Unidad_Importada u ON u.VIN_Unidad = vrp.VIN_Unidad
            ORDER BY vrp.VIN_Unidad
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener requisitos pendientes globales:', error);
        res.status(500).json({ error: 'Error interno al obtener el reporte de documentos pendientes.' });
    }
};

module.exports = { obtenerPorVin, actualizarDatosAduaneros, checklist, checklistGlobal, actualizarRequisito, pendientesGlobal };
