const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// Necesario detrás de un reverse proxy con TLS para las cookies secure.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Los archivos se sirven por /api/archivos, con sesión y autorización.
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/vehiculos', require('./routes/vehiculoRutas'));
app.use('/api/auth', require('./routes/authRutas'));
app.use('/api/documentos', require('./routes/docsRutas'));
app.use('/api/usuarios', require('./routes/usuarioRutas'));
app.use('/api/roles', require('./routes/rolRutas'));

app.use('/api/cotizaciones', require('./routes/cotizacionRutas'));
app.use('/api/clientes', require('./routes/clienteRutas'));
app.use('/api/ventas', require('./routes/ventaRutas'));
app.use('/api/logistica', require('./routes/logisticaRutas'));
app.use('/api/catalogos', require('./routes/catalogoRutas'));
app.use('/api/expedientes', require('./routes/expedienteRutas'));
app.use('/api/portal-cliente', require('./routes/clientePortalRutas'));
app.use('/api/fotos', require('./routes/fotoRutas'));
app.use('/api/logs', require('./routes/logRutas'));
app.use('/api/archivos', require('./routes/archivoRutas'));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pantallaPrincipal.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Servidor backend corriendo en el puerto ${PORT}`);

    const pool = require('./config/db');
    const { asegurarAdminInicial } = require('./utils/seedAdmin');
    await asegurarAdminInicial(pool);

    const { sincronizarPerfilesCliente } = require('./utils/perfilCliente');
    await sincronizarPerfilesCliente(pool);
});
