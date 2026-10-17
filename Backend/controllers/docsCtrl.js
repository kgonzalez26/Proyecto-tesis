const pool = require('../config/db');
const { registrarLog } = require('../utils/registrarLog');

const listarPorExpediente = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.*, crd.Nombre_Requisito
            FROM Documentos d
            JOIN Catalogo_Requisito_Documental crd ON crd.REQ_ID = d.REQ_ID
            WHERE d.EXP_ID = ? AND d.Activo = 1
            ORDER BY d.Fecha_Carga DESC
        `, [req.params.exp_id]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al listar documentos:', error);
        res.status(500).json({ error: 'Error interno al listar documentos.' });
    }
};

const upload = async (req, res) => {
    const conexion = await pool.getConnection();
    try {
        const { exp_id, req_id } = req.body;
        if (!exp_id || !req_id) {
            conexion.release();
            return res.status(400).json({ error: 'exp_id y req_id son requeridos.' });
        }
        if (!req.file) {
            conexion.release();
            return res.status(400).json({ error: 'No se recibió ningún archivo.' });
        }

        await conexion.beginTransaction();

        await conexion.query(
            'UPDATE Documentos SET Activo = 0 WHERE EXP_ID = ? AND REQ_ID = ? AND Activo = 1',
            [exp_id, req_id]
        );

        const rutaPublica = `/uploads/${req.file.filename}`;
        const [resultado] = await conexion.query(
            'INSERT INTO Documentos (EXP_ID, REQ_ID, Nombre_Archivo, Ruta_Archivo_Cloud, USER_ID_Carga) VALUES (?,?,?,?,?)',
            [exp_id, req_id, req.file.originalname, rutaPublica, req.usuario.id]
        );

        await conexion.query(
            `UPDATE Expediente_Requisito SET Estado = 'Entregado', USER_ID_Validador = ?
             WHERE EXP_ID = ? AND REQ_ID = ?`,
            [req.usuario.id, exp_id, req_id]
        );

        await conexion.commit();

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'subir_documento', entidad_tipo: 'Documento', entidad_id: exp_id,
            descripcion: `Subió el documento "${req.file.originalname}" al expediente ${exp_id}`, req
        });

        res.status(201).json({ mensaje: 'Documento guardado.', doc_id: resultado.insertId, ruta: rutaPublica });
    } catch (error) {
        await conexion.rollback();
        console.error('Error al subir documento:', error);
        res.status(500).json({ error: 'Error interno al subir documento.' });
    } finally {
        conexion.release();
    }
};

module.exports = { listarPorExpediente, upload };
