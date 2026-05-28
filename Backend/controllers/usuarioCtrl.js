const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const obtenerUsuarios = async (req, res) => {
    try {
        const sql = `
            SELECT u.USER_ID AS id, u.Nombre_Usuario AS nombre, u.Email AS email, 
                   u.Contrasena_Hash AS contrasena, r.Nombre_Rol AS nombre_rol, ur.ROL_ID AS rol_id
            FROM usuario u
            LEFT JOIN usuario_rol ur ON u.USER_ID = ur.USER_ID
            LEFT JOIN rol r ON ur.ROL_ID = r.ROL_ID
            WHERE u.Estado_cuenta = 1
        `;
        const [rows] = await pool.query(sql);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error de SQL en obtenerUsuarios:", error); 
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
};

const crearUsuario = async (req, res) => {
    try {
        const { nombre, email, contraseña, rol_id } = req.body;
        
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(contraseña, salt);

        const sqlUser = `INSERT INTO usuario (Nombre_Usuario, Email, Contrasena_Hash, Estado_cuenta) VALUES (?, ?, ?, 1)`;
        const [result] = await pool.query(sqlUser, [nombre, email, hashPassword]);
        
        const nuevoUserId = result.insertId;

        const sqlRol = `INSERT INTO usuario_rol (USER_ID, ROL_ID) VALUES (?, ?)`;
        await pool.query(sqlRol, [nuevoUserId, rol_id]);
        
        res.status(201).json({ mensaje: "Usuario creado exitosamente" });
    } catch (error) {
        console.error("Error al crear usuario:", error);
        res.status(500).json({ error: "Error al crear usuario" });
    }
};

const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, rol_id, contraseña } = req.body;

        if (contraseña && contraseña.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const hashPassword = await bcrypt.hash(contraseña, salt);
            await pool.query(`UPDATE usuario SET Nombre_Usuario = ?, Email = ?, Contrasena_Hash = ? WHERE USER_ID = ?`, 
                [nombre, email, hashPassword, id]);
        } else {
            await pool.query(`UPDATE usuario SET Nombre_Usuario = ?, Email = ? WHERE USER_ID = ?`, 
                [nombre, email, id]);
        }

        const [existeRol] = await pool.query(`SELECT * FROM usuario_rol WHERE USER_ID = ?`, [id]);
        if (existeRol.length > 0) {
            await pool.query(`UPDATE usuario_rol SET ROL_ID = ? WHERE USER_ID = ?`, [rol_id, id]);
        } else {
            await pool.query(`INSERT INTO usuario_rol (USER_ID, ROL_ID) VALUES (?, ?)`, [id, rol_id]);
        }
        
        res.status(200).json({ mensaje: "Usuario actualizado con éxito" });
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({ error: "Error al actualizar usuario" });
    }
};

const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('UPDATE usuario SET Estado_cuenta = 0 WHERE USER_ID = ?', [id]);
        res.status(200).json({ mensaje: "Usuario dado de baja" });
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        res.status(500).json({ error: "Error al eliminar usuario" });
    }
};

module.exports = { obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario };