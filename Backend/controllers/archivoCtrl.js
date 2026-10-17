const path = require('path');
const pool = require('../config/db');

const DIR_UPLOADS = path.join(process.cwd(), 'uploads');
const ROLES_PERSONAL = ['Administrador', 'Tramitador'];

function esPersonal(usuario) {
    return (usuario.roles || []).some(r => ROLES_PERSONAL.includes(r));
}

async function clienteEsDueno(userId, vin) {
    const [rows] = await pool.query(`
        SELECT 1
        FROM Unidad_Importada u
        JOIN Cliente c ON c.CLIENTE_ID = u.Cliente_ID
        WHERE u.VIN_Unidad = ? AND c.USER_ID = ? AND c.Activo = 1
    `, [vin, userId]);
    return rows.length > 0;
}

function enviarArchivo(res, rutaGuardada) {
    const absoluta = path.join(DIR_UPLOADS, path.basename(rutaGuardada));
    res.set('Cache-Control', 'private, max-age=3600');
    res.sendFile(absoluta, (err) => {
        if (err && !res.headersSent) res.status(404).json({ error: 'Archivo no encontrado.' });
    });
}

const documento = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.Ruta_Archivo_Cloud, ea.VIN_Unidad
            FROM Documentos d
            JOIN Expediente_Aduanero ea ON ea.EXP_ID = d.EXP_ID
            WHERE d.DOC_ID = ? AND d.Activo = 1
        `, [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ error: 'Archivo no encontrado.' });

        const permitido = esPersonal(req.usuario) || await clienteEsDueno(req.usuario.id, rows[0].VIN_Unidad);
        if (!permitido) return res.status(404).json({ error: 'Archivo no encontrado.' });

        enviarArchivo(res, rows[0].Ruta_Archivo_Cloud);
    } catch (error) {
        console.error('Error al servir documento:', error);
        res.status(500).json({ error: 'Error interno al obtener el archivo.' });
    }
};

const foto = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT Ruta_Archivo_Cloud, VIN_Unidad FROM Foto_Vehiculo WHERE FOTO_ID = ? AND Activo = 1',
            [req.params.id]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Archivo no encontrado.' });

        const permitido = esPersonal(req.usuario) || await clienteEsDueno(req.usuario.id, rows[0].VIN_Unidad);
        if (!permitido) return res.status(404).json({ error: 'Archivo no encontrado.' });

        enviarArchivo(res, rows[0].Ruta_Archivo_Cloud);
    } catch (error) {
        console.error('Error al servir foto:', error);
        res.status(500).json({ error: 'Error interno al obtener el archivo.' });
    }
};

module.exports = { documento, foto };
