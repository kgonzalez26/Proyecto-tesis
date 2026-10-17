const pool = require('../config/db');

const listar = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT ROL_ID, Nombre_Rol, Descripcion FROM Rol ORDER BY Nombre_Rol');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al listar roles:', error);
        res.status(500).json({ error: 'Error interno al listar roles.' });
    }
};

module.exports = { listar };
