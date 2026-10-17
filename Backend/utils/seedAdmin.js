const bcrypt = require('bcryptjs');

// Crea el primer administrador con credenciales del entorno y contraseña hasheada.
async function asegurarAdminInicial(pool) {
    try {
        const [existentes] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM Usuario_Rol ur
            JOIN Rol r ON r.ROL_ID = ur.ROL_ID
            WHERE r.Nombre_Rol = 'Administrador'
        `);

        if (existentes[0].total > 0) {
            console.log('[seedAdmin] Ya existe al menos un Administrador. No se crea ninguno nuevo.');
            return;
        }

        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;
        const nombre = process.env.ADMIN_NOMBRE || 'Administrador';

        if (!email || !password) {
            console.warn('[seedAdmin] No hay ningún Administrador y faltan ADMIN_EMAIL/ADMIN_PASSWORD en el .env — no se puede crear uno automáticamente. Defínelos y reinicia el contenedor.');
            return;
        }
        if (password.length < 8) {
            console.warn('[seedAdmin] ADMIN_PASSWORD tiene menos de 8 caracteres. Defínela más larga antes de sembrar el admin por seguridad.');
            return;
        }

        const [rolRows] = await pool.query("SELECT ROL_ID FROM Rol WHERE Nombre_Rol = 'Administrador'");
        if (rolRows.length === 0) {
            console.error('[seedAdmin] El rol "Administrador" no existe en la tabla Rol. Revisa que el seeder del schema haya corrido.');
            return;
        }

        const hash = await bcrypt.hash(password, 10);

        const [usuarioExistente] = await pool.query('SELECT USER_ID FROM Usuario WHERE Email = ?', [email]);

        let userId;
        if (usuarioExistente.length > 0) {
            userId = usuarioExistente[0].USER_ID;
            console.log(`[seedAdmin] El correo ${email} ya existía como usuario; se le asigna el rol Administrador.`);
        } else {
            const [resultado] = await pool.query(
                'INSERT INTO Usuario (Nombre_Usuario, Email, Contrasena_Hash) VALUES (?, ?, ?)',
                [nombre, email, hash]
            );
            userId = resultado.insertId;
        }

        await pool.query(
            'INSERT IGNORE INTO Usuario_Rol (USER_ID, ROL_ID) VALUES (?, ?)',
            [userId, rolRows[0].ROL_ID]
        );

        console.log(`[seedAdmin] Administrador inicial creado: ${email}. Cambia la contraseña después del primer login.`);
    } catch (error) {
        console.error('[seedAdmin] Error al intentar sembrar el administrador inicial:', error);
    }
}

module.exports = { asegurarAdminInicial };
