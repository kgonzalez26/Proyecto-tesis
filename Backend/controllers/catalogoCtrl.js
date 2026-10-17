const pool = require('../config/db');

const estadosLogisticos = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Catalogo_Estado_Logistico ORDER BY Orden_Secuencia');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al listar estados logísticos:', error);
        res.status(500).json({ error: 'Error interno.' });
    }
};

const requisitosDocumentales = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Catalogo_Requisito_Documental ORDER BY Nombre_Requisito');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al listar requisitos documentales:', error);
        res.status(500).json({ error: 'Error interno.' });
    }
};

const tiposGasto = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Catalogo_Tipo_Gasto ORDER BY Nombre');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al listar tipos de gasto:', error);
        res.status(500).json({ error: 'Error interno.' });
    }
};

const tasas = (req, res) => {
    const T = require('../config/tasas');
    res.status(200).json({ dai_pct: T.DAI_PCT, iva_pct: T.IVA_PCT, iprima_usd: T.IPRIMA_USD });
};

module.exports = { estadosLogisticos, requisitosDocumentales, tiposGasto, tasas };
