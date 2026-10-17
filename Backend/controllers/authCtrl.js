const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { registrarLog } = require('../utils/registrarLog');
const { asegurarPerfilCliente } = require('../utils/perfilCliente');

const ROL_PUBLICO_POR_DEFECTO = 'Cliente';
const DURACION_SESION = '8h';
const DURACION_SESION_MS = 8 * 60 * 60 * 1000;

function emitirCookieSesion(res, payload) {
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: DURACION_SESION });
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: DURACION_SESION_MS
    });
}

const login = async (req, res) => {
    try {
        const { email, contrasena } = req.body;

        if (!email || !contrasena) {
            return res.status(400).json({ error: 'Correo y contraseña son requeridos.' });
        }

        const sql = `
            SELECT u.USER_ID, u.Nombre_Usuario, u.Email, u.Contrasena_Hash,
                   GROUP_CONCAT(r.Nombre_Rol) AS Roles
            FROM Usuario u
            LEFT JOIN Usuario_Rol ur ON u.USER_ID = ur.USER_ID
            LEFT JOIN Rol r ON ur.ROL_ID = r.ROL_ID
            WHERE u.Email = ? AND u.Estado_Cuenta = 1
            GROUP BY u.USER_ID
        `;
        const [rows] = await pool.query(sql, [email]);

        const credencialesInvalidas = () =>
            res.status(401).json({ error: 'Correo o contraseña incorrectos.' });

        if (rows.length === 0) {
            return credencialesInvalidas();
        }

        const usuario = rows[0];
        const contrasenaValida = await bcrypt.compare(contrasena, usuario.Contrasena_Hash);

        if (!contrasenaValida) {
            return credencialesInvalidas();
        }

        const roles = usuario.Roles ? usuario.Roles.split(',') : [];

        emitirCookieSesion(res, {
            id: usuario.USER_ID,
            nombre: usuario.Nombre_Usuario,
            email: usuario.Email,
            roles
        });

        await registrarLog(pool, {
            usuario: { id: usuario.USER_ID, nombre: usuario.Nombre_Usuario }, accion: 'login',
            entidad_tipo: 'Usuario', entidad_id: usuario.USER_ID,
            descripcion: `Inicio de sesión de ${usuario.Nombre_Usuario}`, req
        });

        res.status(200).json({
            mensaje: '¡Inicio de sesión exitoso!',
            usuario: {
                id: usuario.USER_ID,
                nombre: usuario.Nombre_Usuario,
                email: usuario.Email,
                roles
            }
        });

    } catch (error) {
        console.error('Error en el proceso de login:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar el ingreso.' });
    }
};

// El registro público siempre asigna Cliente; nunca acepta un rol del usuario.
const register = async (req, res) => {
    const conexion = await pool.getConnection();
    try {
        const { nombre, email, contrasena } = req.body;

        if (!nombre || !email || !contrasena) {
            conexion.release();
            return res.status(400).json({ error: 'Faltan campos requeridos.' });
        }
        if (contrasena.length < 8) {
            conexion.release();
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
        }

        const [existe] = await conexion.query(
            'SELECT USER_ID FROM Usuario WHERE Email = ? OR Nombre_Usuario = ?',
            [email, nombre]
        );
        if (existe.length > 0) {
            conexion.release();
            return res.status(409).json({ error: 'El correo o nombre de usuario ya están registrados.' });
        }

        const [rolRows] = await conexion.query('SELECT ROL_ID FROM Rol WHERE Nombre_Rol = ?', [ROL_PUBLICO_POR_DEFECTO]);
        if (rolRows.length === 0) {
            conexion.release();
            return res.status(500).json({ error: 'Rol por defecto no configurado en el sistema.' });
        }

        const hash = await bcrypt.hash(contrasena, 10);

        await conexion.beginTransaction();

        const [resultado] = await conexion.query(
            'INSERT INTO Usuario (Nombre_Usuario, Email, Contrasena_Hash) VALUES (?, ?, ?)',
            [nombre, email, hash]
        );
        const userId = resultado.insertId;

        await conexion.query('INSERT INTO Usuario_Rol (USER_ID, ROL_ID) VALUES (?, ?)', [userId, rolRows[0].ROL_ID]);

        const perfil = await asegurarPerfilCliente(conexion, { userId, nombre, email }, { vincularExistente: false });

        await conexion.commit();

        await registrarLog(pool, {
            usuario: { id: userId, nombre }, accion: 'registro_cliente', entidad_tipo: 'Usuario', entidad_id: userId,
            descripcion: perfil.accion === 'creado'
                ? `Se registró el cliente ${nombre} (perfil de cliente creado)`
                : `Se registró ${nombre}; su correo ya existe como cliente y queda pendiente de vincular`, req
        });

        emitirCookieSesion(res, { id: userId, nombre, email, roles: [ROL_PUBLICO_POR_DEFECTO] });

        res.status(201).json({
            mensaje: 'Usuario registrado correctamente.',
            usuario: { id: userId, nombre, email, roles: [ROL_PUBLICO_POR_DEFECTO] }
        });

    } catch (error) {
        await conexion.rollback();
        console.error('Error en el registro de usuario:', error.message || error);
        res.status(500).json({ error: 'Error interno del servidor al registrar usuario.' });
    } finally {
        conexion.release();
    }
};

const registrarEmpleado = async (req, res) => {
    const conexion = await pool.getConnection();
    try {
        const { nombre, email, contrasena, rol } = req.body;

        if (!nombre || !email || !contrasena || !rol) {
            conexion.release();
            return res.status(400).json({ error: 'Faltan campos requeridos (nombre, email, contrasena, rol).' });
        }
        if (contrasena.length < 8) {
            conexion.release();
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
        }

        const [rolRows] = await conexion.query('SELECT ROL_ID FROM Rol WHERE Nombre_Rol = ?', [rol]);
        if (rolRows.length === 0) {
            conexion.release();
            return res.status(400).json({ error: `El rol '${rol}' no existe en el catálogo.` });
        }

        const [existe] = await conexion.query(
            'SELECT USER_ID FROM Usuario WHERE Email = ? OR Nombre_Usuario = ?',
            [email, nombre]
        );
        if (existe.length > 0) {
            conexion.release();
            return res.status(409).json({ error: 'El correo o nombre de usuario ya están registrados.' });
        }

        const hash = await bcrypt.hash(contrasena, 10);

        await conexion.beginTransaction();

        const [resultado] = await conexion.query(
            'INSERT INTO Usuario (Nombre_Usuario, Email, Contrasena_Hash) VALUES (?, ?, ?)',
            [nombre, email, hash]
        );
        await conexion.query('INSERT INTO Usuario_Rol (USER_ID, ROL_ID) VALUES (?, ?)', [resultado.insertId, rolRows[0].ROL_ID]);

        let perfil = null;
        if (rol === 'Cliente') {
            perfil = await asegurarPerfilCliente(conexion, { userId: resultado.insertId, nombre, email }, { vincularExistente: true });
        }

        await conexion.commit();

        res.status(201).json({
            mensaje: perfil && perfil.accion === 'vinculado'
                ? 'Cuenta creada y vinculada al cliente existente con ese correo.'
                : 'Usuario registrado correctamente.'
        });

    } catch (error) {
        await conexion.rollback();
        console.error('Error al registrar empleado:', error);
        res.status(500).json({ error: 'Error interno del servidor al registrar el usuario.' });
    } finally {
        conexion.release();
    }
};

const me = async (req, res) => {
    res.status(200).json({ usuario: req.usuario });
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ mensaje: 'Sesión cerrada.' });
};

module.exports = { login, register, registrarEmpleado, me, logout };
