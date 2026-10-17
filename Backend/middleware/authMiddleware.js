const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ error: 'No autenticado. Inicie sesión nuevamente.' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Sesión inválida o expirada.' });
    }
}

function autorizarRoles(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ error: 'No autenticado.' });
        }

        const tieneAcceso = (req.usuario.roles || []).some(r => rolesPermitidos.includes(r));

        if (!tieneAcceso) {
            return res.status(403).json({ error: 'No tiene permisos para realizar esta acción.' });
        }

        next();
    };
}

module.exports = { verificarToken, autorizarRoles };
