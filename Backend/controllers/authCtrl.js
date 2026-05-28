const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const login = async (req, res) => {
    try {
        const { email, contrasena } = req.body;

        const sql = `
            SELECT u.USER_ID, u.Nombre_Usuario, u.Email, u.Contrasena_Hash, r.Nombre_Rol
            FROM usuario u
            LEFT JOIN usuario_rol ur ON u.USER_ID = ur.USER_ID
            LEFT JOIN rol r ON ur.ROL_ID = r.ROL_ID
            WHERE u.Email = ? AND u.Estado_cuenta = 1
        `;
        
        const [rows] = await pool.query(sql, [email]);

        if (rows.length === 0) {
            return res.status(401).json({ error: "El correo electrónico no está registrado o la cuenta está inactiva." });
        }

        const usuario = rows[0];

        const contraseñaValida = await bcrypt.compare(contrasena, usuario.Contrasena_Hash);

        if (!contraseñaValida) {
            return res.status(401).json({ error: "Contraseña incorrecta. Inténtalo de nuevo." });
        }

        res.status(200).json({
            mensaje: "¡Inicio de sesión exitoso!",
            usuario: {
                id: usuario.USER_ID,
                nombre: usuario.Nombre_Usuario,
                email: usuario.Email,
                rol: usuario.Nombre_Rol
            }
        });

    } catch (error) {
        console.error("Error en el proceso de login:", error);
        res.status(500).json({ error: "Error interno del servidor al procesar el ingreso." });
    }
};

module.exports = { login };