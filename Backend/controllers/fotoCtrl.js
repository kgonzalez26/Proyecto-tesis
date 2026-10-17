const pool = require('../config/db');
const { registrarLog } = require('../utils/registrarLog');

const listar = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT FOTO_ID, Categoria, Nombre_Archivo, Ruta_Archivo_Cloud, Fecha_Carga
             FROM Foto_Vehiculo WHERE VIN_Unidad = ? AND Activo = 1
             ORDER BY Fecha_Carga DESC`,
            [req.params.vin]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al listar fotos:', error);
        res.status(500).json({ error: 'Error interno al listar fotos.' });
    }
};

const subir = async (req, res) => {
    try {
        const { vin } = req.params;
        const categoriasValidas = ['Subasta', 'Recepcion', 'Otro'];
        const categoria = categoriasValidas.includes(req.body.categoria) ? req.body.categoria : 'Otro';

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
        }

        const valores = req.files.map(f => [vin, categoria, f.originalname, `/uploads/${f.filename}`, req.usuario.id]);
        await pool.query(
            'INSERT INTO Foto_Vehiculo (VIN_Unidad, Categoria, Nombre_Archivo, Ruta_Archivo_Cloud, USER_ID_Carga) VALUES ?',
            [valores]
        );

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'subir_foto', entidad_tipo: 'Foto', entidad_id: vin,
            descripcion: `Subió ${req.files.length} foto(s) de categoría "${categoria}" al vehículo ${vin}`, req
        });

        res.status(201).json({ mensaje: `${req.files.length} foto(s) subida(s).` });
    } catch (error) {
        console.error('Error al subir fotos:', error);
        res.status(500).json({ error: 'Error interno al subir fotos.' });
    }
};

const eliminar = async (req, res) => {
    try {
        const [resultado] = await pool.query('UPDATE Foto_Vehiculo SET Activo = 0 WHERE FOTO_ID = ?', [req.params.foto_id]);
        if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Foto no encontrada.' });

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'eliminar_foto', entidad_tipo: 'Foto', entidad_id: req.params.foto_id,
            descripcion: `Eliminó la foto #${req.params.foto_id}`, req
        });

        res.status(200).json({ mensaje: 'Foto eliminada.' });
    } catch (error) {
        console.error('Error al eliminar foto:', error);
        res.status(500).json({ error: 'Error interno al eliminar foto.' });
    }
};

module.exports = { listar, subir, eliminar };
