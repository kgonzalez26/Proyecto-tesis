const express = require('express');
const cors = require('cors');
require('dotenv').config();

const vehiculoRutas = require('./routes/vehiculoRutas');

const app = express();

app.use(cors()); 
app.use(express.json()); 
app.use('/uploads', express.static('uploads'));

app.use('/api/vehiculos', require('./routes/vehiculoRutas'));

app.use('/api/auth', require('./routes/authRutas'));
app.use('/api/documentos', require('./routes/docsRutas'));
app.use('/api/usuarios', require('./routes/usuarioRutas'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});