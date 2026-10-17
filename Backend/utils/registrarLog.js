// Los errores de auditoría no deben revertir la operación principal.
async function registrarLog(pool, { usuario, accion, entidad_tipo = null, entidad_id = null, descripcion = null, req = null }) {
    try {
        const ip = req
            ? (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null)
            : null;

        await pool.query(
            `INSERT INTO Log_Actividad
                (USER_ID, Nombre_Usuario_Snapshot, Accion, Entidad_Tipo, Entidad_ID, Descripcion, IP_Origen)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [usuario?.id || null, usuario?.nombre || null, accion, entidad_tipo, entidad_id ? String(entidad_id) : null, descripcion, ip]
        );
    } catch (error) {
        console.error('[registrarLog] No se pudo guardar el log de actividad:', error.message);
    }
}

module.exports = { registrarLog };
