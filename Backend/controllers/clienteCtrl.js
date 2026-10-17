const pool = require('../config/db');
const { registrarLog } = require('../utils/registrarLog');

const listar = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT CLIENTE_ID, Nombre_Completo, Email, Telefono, NIT, Activo, USER_ID FROM Cliente WHERE Activo = 1 ORDER BY Nombre_Completo'
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al listar clientes:', error);
        res.status(500).json({ error: 'Error interno al listar clientes.' });
    }
};

const obtenerPorId = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Cliente WHERE CLIENTE_ID = ? AND Activo = 1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        res.status(500).json({ error: 'Error interno al obtener cliente.' });
    }
};

const crear = async (req, res) => {
    try {
        const { nombre_completo, email, telefono, nit } = req.body;
        if (!nombre_completo || !email) {
            return res.status(400).json({ error: 'nombre_completo y email son requeridos.' });
        }

        const [resultado] = await pool.query(
            'INSERT INTO Cliente (Nombre_Completo, Email, Telefono, NIT) VALUES (?, ?, ?, ?)',
            [nombre_completo, email, telefono || null, nit || null]
        );

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'crear_cliente', entidad_tipo: 'Cliente', entidad_id: resultado.insertId,
            descripcion: `Creó el cliente ${nombre_completo}`, req
        });

        res.status(201).json({ mensaje: 'Cliente creado.', cliente_id: resultado.insertId });
    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).json({ error: 'Error interno al crear cliente.' });
    }
};

const actualizar = async (req, res) => {
    try {
        const { nombre_completo, email, telefono, nit } = req.body;
        const [resultado] = await pool.query(
            'UPDATE Cliente SET Nombre_Completo = ?, Email = ?, Telefono = ?, NIT = ? WHERE CLIENTE_ID = ? AND Activo = 1',
            [nombre_completo, email, telefono || null, nit || null, req.params.id]
        );
        if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'editar_cliente', entidad_tipo: 'Cliente', entidad_id: req.params.id,
            descripcion: `Editó al cliente #${req.params.id}`, req
        });

        res.status(200).json({ mensaje: 'Cliente actualizado.' });
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({ error: 'Error interno al actualizar cliente.' });
    }
};

const desactivar = async (req, res) => {
    try {
        const [resultado] = await pool.query('UPDATE Cliente SET Activo = 0 WHERE CLIENTE_ID = ?', [req.params.id]);
        if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'desactivar_cliente', entidad_tipo: 'Cliente', entidad_id: req.params.id,
            descripcion: `Desactivó al cliente #${req.params.id}`, req
        });

        res.status(200).json({ mensaje: 'Cliente desactivado.' });
    } catch (error) {
        console.error('Error al desactivar cliente:', error);
        res.status(500).json({ error: 'Error interno al desactivar cliente.' });
    }
};

module.exports = { listar, obtenerPorId, crear, actualizar, desactivar };
