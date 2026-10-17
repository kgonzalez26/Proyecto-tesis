const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { registrarLog } = require('../utils/registrarLog');

const listar = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.USER_ID, u.Nombre_Usuario, u.Email, u.Estado_Cuenta,
                   GROUP_CONCAT(DISTINCT r.Nombre_Rol) AS Roles,
                   MAX(c.CLIENTE_ID) AS Cliente_Vinculado_ID,
                   MAX(c.Nombre_Completo) AS Cliente_Vinculado
            FROM Usuario u
            LEFT JOIN Usuario_Rol ur ON ur.USER_ID = u.USER_ID
            LEFT JOIN Rol r ON r.ROL_ID = ur.ROL_ID
            LEFT JOIN Cliente c ON c.USER_ID = u.USER_ID AND c.Activo = 1
            GROUP BY u.USER_ID
            ORDER BY u.Nombre_Usuario
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ error: 'Error interno al listar usuarios.' });
    }
};

async function contarAdministradoresActivos(conexion, excluirUserId = null) {
    const [rows] = await conexion.query(`
        SELECT COUNT(DISTINCT u.USER_ID) AS total
        FROM Usuario u
        JOIN Usuario_Rol ur ON ur.USER_ID = u.USER_ID
        JOIN Rol r ON r.ROL_ID = ur.ROL_ID
        WHERE r.Nombre_Rol = 'Administrador' AND u.Estado_Cuenta = 1
          AND u.USER_ID != ?
    `, [excluirUserId || 0]);
    return rows[0].total;
}

const actualizar = async (req, res) => {
    const conexion = await pool.getConnection();
    try {
        const { nombre, email, rol } = req.body;
        const userId = req.params.id;

        if (!nombre || !email || !rol) {
            conexion.release();
            return res.status(400).json({ error: 'nombre, email y rol son requeridos.' });
        }

        await conexion.beginTransaction();

        const [rolNuevo] = await conexion.query('SELECT ROL_ID, Nombre_Rol FROM Rol WHERE Nombre_Rol = ?', [rol]);
        if (rolNuevo.length === 0) {
            await conexion.rollback(); conexion.release();
            return res.status(400).json({ error: 'El rol indicado no existe.' });
        }
        if (rolNuevo[0].Nombre_Rol !== 'Administrador') {
            const [esAdminActual] = await conexion.query(`
                SELECT 1 FROM Usuario_Rol ur JOIN Rol r ON r.ROL_ID = ur.ROL_ID
                WHERE ur.USER_ID = ? AND r.Nombre_Rol = 'Administrador'
            `, [userId]);
            if (esAdminActual.length > 0) {
                const otros = await contarAdministradoresActivos(conexion, userId);
                if (otros === 0) {
                    await conexion.rollback(); conexion.release();
                    return res.status(409).json({ error: 'No puedes quitarle el rol de Administrador al único administrador activo.' });
                }
            }
        }

        await conexion.query('UPDATE Usuario SET Nombre_Usuario = ?, Email = ? WHERE USER_ID = ?', [nombre, email, userId]);
        await conexion.query('DELETE FROM Usuario_Rol WHERE USER_ID = ?', [userId]);
        await conexion.query('INSERT INTO Usuario_Rol (USER_ID, ROL_ID) VALUES (?, ?)', [userId, rolNuevo[0].ROL_ID]);

        await conexion.commit();

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'editar_usuario', entidad_tipo: 'Usuario', entidad_id: userId,
            descripcion: `Editó al usuario #${userId} (nombre/email/rol -> ${rol})`, req
        });

        res.status(200).json({ mensaje: 'Usuario actualizado.' });
    } catch (error) {
        await conexion.rollback();
        console.error('Error al actualizar usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ese correo ya está en uso por otro usuario.' });
        }
        res.status(500).json({ error: 'Error interno al actualizar usuario.' });
    } finally {
        conexion.release();
    }
};

const resetPassword = async (req, res) => {
    try {
        const { nueva_contrasena } = req.body;
        if (!nueva_contrasena || nueva_contrasena.length < 8) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
        }
        const hash = await bcrypt.hash(nueva_contrasena, 10);
        const [resultado] = await pool.query('UPDATE Usuario SET Contrasena_Hash = ? WHERE USER_ID = ?', [hash, req.params.id]);
        if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'reset_password', entidad_tipo: 'Usuario', entidad_id: req.params.id,
            descripcion: `Restableció la contraseña del usuario #${req.params.id}`, req
        });

        res.status(200).json({ mensaje: 'Contraseña restablecida.' });
    } catch (error) {
        console.error('Error al restablecer contraseña:', error);
        res.status(500).json({ error: 'Error interno al restablecer contraseña.' });
    }
};

// Se conserva la cuenta inactiva para no romper los registros de auditoría e historial.
const toggleEstado = async (req, res) => {
    const conexion = await pool.getConnection();
    try {
        const userId = req.params.id;

        if (parseInt(userId) === req.usuario.id) {
            conexion.release();
            return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta mientras tienes la sesión abierta.' });
        }

        await conexion.beginTransaction();

        const [rows] = await conexion.query('SELECT Estado_Cuenta FROM Usuario WHERE USER_ID = ?', [userId]);
        if (rows.length === 0) {
            await conexion.rollback(); conexion.release();
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const nuevoEstado = rows[0].Estado_Cuenta ? 0 : 1;

        if (nuevoEstado === 0) {
            const [esAdmin] = await conexion.query(`
                SELECT 1 FROM Usuario_Rol ur JOIN Rol r ON r.ROL_ID = ur.ROL_ID
                WHERE ur.USER_ID = ? AND r.Nombre_Rol = 'Administrador'
            `, [userId]);
            if (esAdmin.length > 0) {
                const otros = await contarAdministradoresActivos(conexion, userId);
                if (otros === 0) {
                    await conexion.rollback(); conexion.release();
                    return res.status(409).json({ error: 'No puedes desactivar al único administrador activo.' });
                }
            }
        }

        await conexion.query('UPDATE Usuario SET Estado_Cuenta = ? WHERE USER_ID = ?', [nuevoEstado, userId]);
        await conexion.commit();

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'cambiar_estado_usuario', entidad_tipo: 'Usuario', entidad_id: userId,
            descripcion: `${nuevoEstado ? 'Reactivó' : 'Desactivó'} al usuario #${userId}`, req
        });

        res.status(200).json({ mensaje: nuevoEstado ? 'Usuario reactivado.' : 'Usuario desactivado.', estado_cuenta: nuevoEstado });
    } catch (error) {
        await conexion.rollback();
        console.error('Error al cambiar estado del usuario:', error);
        res.status(500).json({ error: 'Error interno al cambiar estado del usuario.' });
    } finally {
        conexion.release();
    }
};

// Solo un administrador vincula perfiles: el correo del registro público no está verificado.
const vincularCliente = async (req, res) => {
    const conexion = await pool.getConnection();
    try {
        const userId = req.params.id;
        const { cliente_id } = req.body;

        await conexion.beginTransaction();

        await conexion.query('UPDATE Cliente SET USER_ID = NULL WHERE USER_ID = ?', [userId]);

        if (cliente_id) {
            const [esCliente] = await conexion.query(`
                SELECT 1 FROM Usuario_Rol ur JOIN Rol r ON r.ROL_ID = ur.ROL_ID
                WHERE ur.USER_ID = ? AND r.Nombre_Rol = 'Cliente'
            `, [userId]);
            if (esCliente.length === 0) {
                await conexion.rollback(); conexion.release();
                return res.status(400).json({ error: 'Solo se pueden vincular cuentas con rol Cliente.' });
            }

            const [cli] = await conexion.query('SELECT USER_ID FROM Cliente WHERE CLIENTE_ID = ? AND Activo = 1', [cliente_id]);
            if (cli.length === 0) {
                await conexion.rollback(); conexion.release();
                return res.status(404).json({ error: 'Cliente no encontrado.' });
            }
            if (cli[0].USER_ID && String(cli[0].USER_ID) !== String(userId)) {
                await conexion.rollback(); conexion.release();
                return res.status(409).json({ error: 'Ese cliente ya está vinculado a otra cuenta.' });
            }

            await conexion.query('UPDATE Cliente SET USER_ID = ? WHERE CLIENTE_ID = ?', [userId, cliente_id]);
        }

        await conexion.commit();

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'vincular_cliente', entidad_tipo: 'Usuario', entidad_id: userId,
            descripcion: cliente_id
                ? `Vinculó la cuenta #${userId} con el cliente #${cliente_id}`
                : `Desvinculó la cuenta #${userId} de su cliente`, req
        });

        res.status(200).json({ mensaje: cliente_id ? 'Cuenta vinculada.' : 'Cuenta desvinculada.' });
    } catch (error) {
        await conexion.rollback();
        console.error('Error al vincular cliente:', error);
        res.status(500).json({ error: 'Error interno al vincular la cuenta.' });
    } finally {
        conexion.release();
    }
};

module.exports = { listar, actualizar, resetPassword, toggleEstado, vincularCliente };
