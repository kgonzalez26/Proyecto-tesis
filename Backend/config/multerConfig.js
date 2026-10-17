const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const sufijo = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${sufijo}${path.extname(file.originalname)}`);
    }
});

const tiposPermitidos = ['.pdf', '.jpg', '.jpeg', '.png'];

const filtroArchivo = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!tiposPermitidos.includes(ext)) {
        return cb(new Error('Tipo de archivo no permitido. Solo PDF, JPG o PNG.'));
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter: filtroArchivo,
    limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = upload;
