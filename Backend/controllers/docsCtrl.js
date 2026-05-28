const pool = require('../config/db');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '_' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = multer({ storage });

const obtenerExpedientes = async (req, res) => {
    try {
        const sql = `
            SELECT e.EXP_ID, e.VIN_Unidad, u.Marca, u.Modelo, 
                   e.Check_DUA, e.Check_Poliza, e.Check_Certificado_Origen, e.Check_Titulo_Propiedad
            FROM Expediente_Aduanero e
            JOIN Unidad_Importada u ON e.VIN_Unidad = u.VIN_Unidad
            WHERE e.Activo = 1
        `;
        const [rows] = await pool.query(sql);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener expedientes" });
    }
};

const subirDocumento = async (req, res) => {
    try {
        const { exp_id, tipo_documento, sobreescribir } = req.body;
        const archivo = req.file;

        if (!archivo) return res.status(400).json({ error: "No se proporcionó ningún archivo" });

        const ruta_archivo = `/uploads/${archivo.filename}`;
        
        const [existentes] = await pool.query(
            `SELECT * FROM Documentos WHERE EXP_ID = ? AND Tipo_Documento_Aduanal = ? AND Activo = 1`, 
            [exp_id, tipo_documento]
        );

        if (existentes.length > 0) {
            if (sobreescribir === 'true') {
                await pool.query(
                    `UPDATE Documentos SET Activo = 0 WHERE EXP_ID = ? AND Tipo_Documento_Aduanal = ?`,
                    [exp_id, tipo_documento]
                );
            } else {
                return res.status(409).json({ error: "El documento ya existe y no se autorizó sobreescritura." });
            }
        }

        const sqlInsert = `INSERT INTO Documentos (EXP_ID, Tipo_Documento_Aduanal, Nombre_Archivo, Ruta_Archivo_Cloud) VALUES (?, ?, ?, ?)`;
        await pool.query(sqlInsert, [exp_id, tipo_documento, archivo.originalname, ruta_archivo]);

        let columnaCheck = '';
        if (tipo_documento === 'DUA') columnaCheck = 'Check_DUA';
        if (tipo_documento === 'Póliza') columnaCheck = 'Check_Poliza';
        if (tipo_documento === 'Certificado_Origen') columnaCheck = 'Check_Certificado_Origen';
        if (tipo_documento === 'Título') columnaCheck = 'Check_Titulo_Propiedad';

        if (columnaCheck !== '') {
            const sqlUpdate = `UPDATE Expediente_Aduanero SET ${columnaCheck} = 1 WHERE EXP_ID = ?`;
            await pool.query(sqlUpdate, [exp_id]);
        }

        res.status(200).json({ mensaje: "Documento gestionado con éxito", ruta: ruta_archivo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al subir el documento" });
    }
};

const obtenerArchivosPorExpediente = async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `SELECT * FROM Documentos WHERE EXP_ID = ? AND Activo = 1`;
        const [rows] = await pool.query(sql, [id]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener archivos" });
    }
};

module.exports = { 
    upload, 
    obtenerExpedientes, 
    subirDocumento,
    obtenerArchivosPorExpediente
};