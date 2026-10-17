// El registro público no vincula perfiles existentes porque el correo no está verificado.
async function asegurarPerfilCliente(db, { userId, nombre, email }, { vincularExistente = false } = {}) {
    const [propio] = await db.query('SELECT CLIENTE_ID FROM Cliente WHERE USER_ID = ? AND Activo = 1', [userId]);
    if (propio.length > 0) return { clienteId: propio[0].CLIENTE_ID, accion: 'existente' };

    const [mismoCorreo] = await db.query(
        'SELECT CLIENTE_ID FROM Cliente WHERE Email = ? AND Activo = 1 AND USER_ID IS NULL ORDER BY CLIENTE_ID LIMIT 1',
        [email]
    );
    if (mismoCorreo.length > 0) {
        if (vincularExistente) {
            await db.query('UPDATE Cliente SET USER_ID = ? WHERE CLIENTE_ID = ?', [userId, mismoCorreo[0].CLIENTE_ID]);
            return { clienteId: mismoCorreo[0].CLIENTE_ID, accion: 'vinculado' };
        }
        return { clienteId: null, accion: 'pendiente_vinculo' };
    }

    const [nuevo] = await db.query(
        'INSERT INTO Cliente (Nombre_Completo, Email, USER_ID) VALUES (?, ?, ?)',
        [nombre, email, userId]
    );
    return { clienteId: nuevo.insertId, accion: 'creado' };
}

async function sincronizarPerfilesCliente(pool) {
    try {
        const [cuentas] = await pool.query(`
            SELECT u.USER_ID, u.Nombre_Usuario, u.Email
            FROM Usuario u
            JOIN Usuario_Rol ur ON ur.USER_ID = u.USER_ID
            JOIN Rol r ON r.ROL_ID = ur.ROL_ID AND r.Nombre_Rol = 'Cliente'
            WHERE NOT EXISTS (SELECT 1 FROM Cliente c WHERE c.USER_ID = u.USER_ID AND c.Activo = 1)
        `);

        let creados = 0, pendientes = 0;
        for (const c of cuentas) {
            const r = await asegurarPerfilCliente(pool, { userId: c.USER_ID, nombre: c.Nombre_Usuario, email: c.Email });
            if (r.accion === 'creado') creados++;
            if (r.accion === 'pendiente_vinculo') pendientes++;
        }
        if (cuentas.length > 0) {
            console.log(`[perfilCliente] Cuentas Cliente sin perfil: ${cuentas.length} -> ${creados} perfil(es) creado(s), ${pendientes} pendiente(s) de vincular (mismo correo que un cliente existente).`);
        }
    } catch (error) {
        console.error('[perfilCliente] No se pudo sincronizar los perfiles de cliente:', error.message);
    }
}

module.exports = { asegurarPerfilCliente, sincronizarPerfilesCliente };
