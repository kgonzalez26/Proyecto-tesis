const pool = require('../config/db');
const { registrarLog } = require('../utils/registrarLog');

const FROM_VEHICULOS = `
    FROM Unidad_Importada u
    JOIN Catalogo_Estado_Logistico cel ON cel.ESTADO_ID = u.Estado_Actual_ID
    LEFT JOIN Cliente c ON c.CLIENTE_ID = u.Cliente_ID
    LEFT JOIN (
        SELECT VIN_Unidad, MAX(EXP_ID) AS EXP_ID
        FROM Expediente_Aduanero
        WHERE Activo = 1
        GROUP BY VIN_Unidad
    ) ea ON ea.VIN_Unidad = u.VIN_Unidad
    LEFT JOIN (
        SELECT er.EXP_ID,
               COUNT(DISTINCT CASE WHEN crd.Obligatorio = 1 THEN er.REQ_ID END) AS Requisitos_Totales,
               COUNT(DISTINCT CASE WHEN crd.Obligatorio = 1 AND er.Estado = 'Entregado' THEN er.REQ_ID END) AS Requisitos_Entregados
        FROM Expediente_Requisito er
        JOIN Catalogo_Requisito_Documental crd ON crd.REQ_ID = er.REQ_ID
        GROUP BY er.EXP_ID
    ) docs ON docs.EXP_ID = ea.EXP_ID
    WHERE u.Activo = 1
`;

function enteroQuery(valor, nombre, minimo, maximo) {
    if (valor === undefined || valor === '') return null;
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
        throw new Error(`El filtro ${nombre} debe ser un número entre ${minimo} y ${maximo}.`);
    }
    return numero;
}

function prefijoLike(valor) {
    return `${String(valor).trim().slice(0, 120).replace(/[\\%_]/g, '\\$&')}%`;
}

const listar = async (req, res) => {
    try {
        const camposPaginados = [
            'pagina', 'limite', 'vin', 'cliente', 'marca', 'modelo', 'anio', 'lote',
            'estado', 'asignacion', 'requisitos_entregados', 'requisitos_totales'
        ];
        const modoPaginado = camposPaginados.some(campo => req.query[campo] !== undefined);
        const seleccion = `
            SELECT u.VIN_Unidad, u.Marca, u.Modelo, u.Anio, u.Cilindrada_CC, u.Cliente_ID,
                   u.Origen_Subasta, u.Lote_Subasta, u.Precio_Compra_USD, u.Fecha_Compra,
                   cel.Nombre_Estado AS Estado_Actual,
                   c.Nombre_Completo AS Cliente,
                   ea.EXP_ID,
                   COALESCE(docs.Requisitos_Totales, 0) AS Requisitos_Totales,
                   COALESCE(docs.Requisitos_Entregados, 0) AS Requisitos_Entregados
            ${FROM_VEHICULOS}
        `;

        if (!modoPaginado) {
            const [rows] = await pool.query(`${seleccion} ORDER BY u.Fecha_Compra DESC`);
            return res.status(200).json(rows);
        }

        const pagina = enteroQuery(req.query.pagina || '1', 'página', 1, 1000000);
        const limite = enteroQuery(req.query.limite || '50', 'límite', 1, 100);
        const condiciones = [];
        const valores = [];
        const texto = (campo, maximo = 120) => String(req.query[campo] || '').trim().slice(0, maximo);

        const vin = texto('vin', 20);
        const cliente = texto('cliente');
        const marca = texto('marca', 50);
        const modelo = texto('modelo', 50);
        const lote = texto('lote', 50);
        const estado = texto('estado', 60);
        const anio = enteroQuery(req.query.anio, 'año', 1900, 2100);
        const requisitosEntregados = enteroQuery(req.query.requisitos_entregados, 'documentos entregados', 0, 10000);
        const requisitosTotales = enteroQuery(req.query.requisitos_totales, 'documentos requeridos', 0, 10000);

        if (vin) { condiciones.push('u.VIN_Unidad LIKE ?'); valores.push(prefijoLike(vin)); }
        if (cliente) { condiciones.push('c.Nombre_Completo LIKE ?'); valores.push(prefijoLike(cliente)); }
        if (marca) { condiciones.push('u.Marca LIKE ?'); valores.push(prefijoLike(marca)); }
        if (modelo) { condiciones.push('u.Modelo LIKE ?'); valores.push(prefijoLike(modelo)); }
        if (lote) { condiciones.push('u.Lote_Subasta LIKE ?'); valores.push(prefijoLike(lote)); }
        if (estado) { condiciones.push('cel.Nombre_Estado = ?'); valores.push(estado); }
        if (anio !== null) { condiciones.push('u.Anio = ?'); valores.push(anio); }
        if (requisitosEntregados !== null) {
            condiciones.push('COALESCE(docs.Requisitos_Entregados, 0) = ?');
            valores.push(requisitosEntregados);
        }
        if (requisitosTotales !== null) {
            condiciones.push('COALESCE(docs.Requisitos_Totales, 0) = ?');
            valores.push(requisitosTotales);
        }

        const asignacion = texto('asignacion', 20);
        if (asignacion === 'asignado') condiciones.push('u.Cliente_ID IS NOT NULL');
        else if (asignacion === 'sin_asignar') condiciones.push('u.Cliente_ID IS NULL');
        else if (asignacion) return res.status(400).json({ error: 'El filtro de asignación no es válido.' });

        const whereFiltros = condiciones.length ? ` AND ${condiciones.join(' AND ')}` : '';
        const parametros = valores;
        const offset = (pagina - 1) * limite;
        const [resumenRows] = await pool.query(`
            SELECT COUNT(*) AS total,
                   COALESCE(SUM(cel.Nombre_Estado LIKE '%tránsito%' OR cel.Nombre_Estado LIKE '%transito%' OR cel.Nombre_Estado LIKE '%puerto%'), 0) AS transito,
                   COALESCE(SUM(cel.Nombre_Estado LIKE '%dua%' OR cel.Nombre_Estado LIKE '%verificaci%' OR cel.Nombre_Estado LIKE '%impuesto%' OR cel.Nombre_Estado LIKE '%liberad%'), 0) AS aduana,
                   COALESCE(SUM(cel.Nombre_Estado LIKE '%predio%' OR cel.Nombre_Estado LIKE '%placa%' OR cel.Nombre_Estado LIKE '%vendid%'), 0) AS predio
            ${FROM_VEHICULOS}${whereFiltros}
        `, parametros);
        const [rows] = await pool.query(
            `${seleccion}${whereFiltros} ORDER BY u.Fecha_Compra DESC, u.VIN_Unidad LIMIT ? OFFSET ?`,
            [...parametros, limite, offset]
        );

        const total = Number(resumenRows[0].total) || 0;
        res.status(200).json({
            data: rows,
            pagina,
            limite,
            total,
            paginas: Math.ceil(total / limite),
            resumen: {
                total,
                transito: Number(resumenRows[0].transito) || 0,
                aduana: Number(resumenRows[0].aduana) || 0,
                predio: Number(resumenRows[0].predio) || 0
            }
        });
    } catch (error) {
        if (error.message.startsWith('El filtro ')) return res.status(400).json({ error: error.message });
        console.error('Error al listar vehículos:', error);
        res.status(500).json({ error: 'Error interno al listar vehículos.' });
    }
};

const obtenerPorId = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.*, cel.Nombre_Estado AS Estado_Actual, c.Nombre_Completo AS Cliente, c.Email AS Cliente_Email,
                   ea.EXP_ID, ea.Fecha_Llegada, ea.Aduana_Ingreso, ea.Canal_Verificacion
            FROM Unidad_Importada u
            JOIN Catalogo_Estado_Logistico cel ON cel.ESTADO_ID = u.Estado_Actual_ID
            LEFT JOIN Cliente c ON c.CLIENTE_ID = u.Cliente_ID
            LEFT JOIN Expediente_Aduanero ea ON ea.VIN_Unidad = u.VIN_Unidad AND ea.Activo = 1
            WHERE u.VIN_Unidad = ? AND u.Activo = 1
        `, [req.params.vin]);

        if (rows.length === 0) return res.status(404).json({ error: 'Vehículo no encontrado.' });
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error al obtener vehículo:', error);
        res.status(500).json({ error: 'Error interno al obtener vehículo.' });
    }
};

const crear = async (req, res) => {
    const conexion = await pool.getConnection();
    try {
        const {
            vin_unidad, marca, modelo, anio, cilindrada_cc,
            origen_subasta, lote_subasta, precio_compra_usd,
            cliente_id, fecha_compra
        } = req.body;

        if (!vin_unidad || !marca || !modelo || !anio || !fecha_compra) {
            conexion.release();
            return res.status(400).json({ error: 'VIN, marca, modelo, año y fecha de compra son requeridos.' });
        }

        await conexion.beginTransaction();

        const [estadoInicial] = await conexion.query(
            'SELECT ESTADO_ID FROM Catalogo_Estado_Logistico ORDER BY Orden_Secuencia ASC LIMIT 1'
        );
        if (estadoInicial.length === 0) throw new Error('No hay estados logísticos configurados en el catálogo.');
        const estadoId = estadoInicial[0].ESTADO_ID;

        await conexion.query(
            `INSERT INTO Unidad_Importada
                (VIN_Unidad, Marca, Modelo, Anio, Cilindrada_CC, Origen_Subasta, Lote_Subasta, Precio_Compra_USD,
                 Fecha_Compra, Estado_Actual_ID, Cliente_ID, USER_ID_Registro)
             VALUES (?,?,?,?,?, ?,?,?, ?,?,?,?)`,
            [vin_unidad, marca, modelo, anio, cilindrada_cc || null, origen_subasta || null, lote_subasta || null,
             precio_compra_usd || null, fecha_compra, estadoId, cliente_id || null, req.usuario.id]
        );

        await conexion.query(
            'INSERT INTO Historial_Estado_Logistico (VIN_Unidad, ESTADO_ID, Comentario, USER_ID_Registro) VALUES (?,?,?,?)',
            [vin_unidad, estadoId, 'Registro inicial del vehículo', req.usuario.id]
        );

        const [expResultado] = await conexion.query(
            'INSERT INTO Expediente_Aduanero (VIN_Unidad) VALUES (?)',
            [vin_unidad]
        );
        const expId = expResultado.insertId;

        const [requisitos] = await conexion.query('SELECT REQ_ID FROM Catalogo_Requisito_Documental');
        for (const req_ of requisitos) {
            await conexion.query(
                'INSERT INTO Expediente_Requisito (EXP_ID, REQ_ID, Estado) VALUES (?, ?, \'Pendiente\')',
                [expId, req_.REQ_ID]
            );
        }

        await conexion.commit();

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'crear_vehiculo', entidad_tipo: 'Vehiculo', entidad_id: vin_unidad,
            descripcion: `Registró el vehículo ${marca} ${modelo} (${anio}), VIN ${vin_unidad}`, req
        });

        res.status(201).json({ mensaje: 'Vehículo registrado.', vin_unidad, exp_id: expId });
    } catch (error) {
        await conexion.rollback();
        console.error('Error al crear vehículo:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un vehículo registrado con ese VIN.' });
        }
        res.status(500).json({ error: 'Error interno al registrar vehículo.' });
    } finally {
        conexion.release();
    }
};

const actualizar = async (req, res) => {
    try {
        const { marca, modelo, anio, cilindrada_cc, origen_subasta, lote_subasta, precio_compra_usd, cliente_id } = req.body;
        const [resultado] = await pool.query(
            `UPDATE Unidad_Importada
             SET Marca = ?, Modelo = ?, Anio = ?, Cilindrada_CC = ?, Origen_Subasta = ?, Lote_Subasta = ?,
                 Precio_Compra_USD = ?, Cliente_ID = ?
             WHERE VIN_Unidad = ? AND Activo = 1`,
            [marca, modelo, anio, cilindrada_cc || null, origen_subasta || null, lote_subasta || null,
             precio_compra_usd || null, cliente_id || null, req.params.vin]
        );
        if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Vehículo no encontrado.' });

        await registrarLog(pool, {
            usuario: req.usuario, accion: 'editar_vehiculo', entidad_tipo: 'Vehiculo', entidad_id: req.params.vin,
            descripcion: `Editó los datos del vehículo ${req.params.vin}`, req
        });

        res.status(200).json({ mensaje: 'Vehículo actualizado.' });
    } catch (error) {
        console.error('Error al actualizar vehículo:', error);
        res.status(500).json({ error: 'Error interno al actualizar vehículo.' });
    }
};

module.exports = { listar, obtenerPorId, crear, actualizar };
